// Import de candidats externes (VideoAsk, etc.) dans un poste Interw.
//
// Fonction d'outillage : appelée uniquement par le script
// `scripts/import-external-candidates.ts`. Elle n'est branchée sur aucune page
// de l'application et n'est jamais appelée depuis le front.
//
// GARDE-FOU ABSOLU : aucun e-mail candidat n'est envoyé.
//  - la session est créée directement en statut `completed` via INSERT ;
//    les déclencheurs `sessions_finalize_on_completed` et
//    `sessions_enqueue_report` sont des AFTER UPDATE OF status, donc ils ne se
//    déclenchent pas sur un INSERT ;
//  - on n'enfile jamais de report_job (le worker enverrait le thank-you) ;
//  - on appelle `generate-report` directement, qui n'écrit qu'aux destinataires
//    configurés sur le poste (aucun envoi si la liste est vide).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireInternal, SHARED_CORS } from "../_shared/auth-guard.ts";

const cors = { ...SHARED_CORS, "Access-Control-Allow-Methods": "POST, OPTIONS" };

const BUCKET = "media";

type Candidate = {
  name: string;
  email: string;
  phone?: string | null;
  media_url: string;
  /** Piste audio compressée (base64) fournie par le script, pour la transcription. */
  audio_b64?: string | null;
  question_index?: number;
  external_ref?: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function extFromContentType(ct: string | null, url: string): string {
  const fromUrl = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUrl && fromUrl.length <= 4 && /^[a-z0-9]+$/.test(fromUrl)) return fromUrl;
  if (ct?.includes("webm")) return "webm";
  if (ct?.includes("mpeg") || ct?.includes("mp3")) return "mp3";
  if (ct?.includes("audio")) return "m4a";
  return "mp4";
}

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Une URL de partage VideoAsk (https://www.videoask.com/xxxx) n'est pas un
// média : on récupère le lien direct du .mp4 dans la page.
async function resolveMediaUrl(url: string): Promise<string> {
  if (!/^https?:\/\/(www\.)?videoask\.com\//.test(url)) return url;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return url;
  const html = await res.text();
  const match = html.match(
    /https:\/\/media\.videoask\.com\/transcoded\/[^"\\]+?video\.mp4\?token=[^"\\&]+/,
  );
  return match ? match[0] : url;
}

// Découpe le transcript d'un monologue en passages rattachés aux questions du
// poste. Les questions non traitées ne reçoivent aucun passage.
async function splitTranscript(
  transcript: string,
  questions: Array<{ id: string; content: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !transcript.trim() || questions.length < 2) return result;

  const list = questions.map((q, i) => `[${i}] ${q.content}`).join("\n");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content:
            "Tu répartis le transcript d'une vidéo de présentation entre les questions d'un entretien. " +
            "Tu recopies les passages mot pour mot, sans les reformuler. " +
            "Une question non traitée par le candidat est simplement absente du résultat. " +
            'Réponds uniquement en JSON : {"segments":[{"index":0,"text":"..."}]}',
        },
        { role: "user", content: `Questions :\n${list}\n\nTranscript :\n${transcript}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error("[import] découpage impossible", res.status, await res.text().catch(() => ""));
    return result;
  }
  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  try {
    const parsed = JSON.parse(jsonText);
    for (const seg of parsed?.segments ?? []) {
      const q = questions[Number(seg.index)];
      const text = String(seg.text ?? "").trim();
      if (q && text) result.set(q.id, text);
    }
  } catch (e) {
    console.error("[import] JSON de découpage illisible", e);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const denied = requireInternal(req, cors);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body.project_id;
    const candidate: Candidate | undefined = body.candidate;
    const dryRun: boolean = body.dry_run !== false;
    const runAnalysis: boolean = body.run_analysis !== false;

    if (!projectId || typeof projectId !== "string") {
      return json({ error: "project_id requis" }, 400);
    }
    if (!candidate?.name || !candidate?.email || !candidate?.media_url) {
      return json({ error: "candidate.name, candidate.email et candidate.media_url requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id, title, organization_id, questions(id, order_index, content, archived_at)")
      .eq("id", projectId)
      .maybeSingle();

    if (projectErr) return json({ error: `poste illisible: ${projectErr.message}` }, 500);
    if (!project) return json({ error: "poste introuvable" }, 404);

    const questions = ((project.questions ?? []) as Array<
      { id: string; order_index: number; content: string; archived_at: string | null }
    >)
      .filter((q) => !q.archived_at)
      .sort((a, b) => a.order_index - b.order_index);

    const questionIndex = Number.isInteger(candidate.question_index) ? candidate.question_index! : 0;
    const question = questions[questionIndex] ?? null;

    // Doublon : même e-mail déjà importé sur ce poste.
    const { data: existing } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .eq("candidate_email", candidate.email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return json({ status: "skipped", reason: "doublon", session_id: existing.id });
    }

    // Vérifie que le média est réellement téléchargeable avant toute écriture.
    const directUrl = await resolveMediaUrl(candidate.media_url);
    const mediaRes = await fetch(directUrl);
    if (!mediaRes.ok) {
      return json({
        status: "skipped",
        reason: `média inaccessible (HTTP ${mediaRes.status})`,
      });
    }
    const contentType = mediaRes.headers.get("content-type");
    const bytes = new Uint8Array(await mediaRes.arrayBuffer());
    const ext = extFromContentType(contentType, directUrl);

    if (dryRun) {
      return json({
        status: "dry_run",
        candidate: candidate.email,
        media_bytes: bytes.byteLength,
        media_ext: ext,
        question_id: question?.id ?? null,
      });
    }

    const now = new Date().toISOString();
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        project_id: projectId,
        organization_id: project.organization_id,
        candidate_name: candidate.name,
        candidate_email: candidate.email.toLowerCase(),
        candidate_phone: candidate.phone ?? null,
        token: randomToken(),
        status: "completed",
        consent_given_at: now,
        consent_accepted_at: now,
        started_at: now,
        completed_at: now,
        last_question_index: questionIndex,
        end_reason: "imported_external",
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      return json({ error: `création de la fiche impossible: ${sessionErr?.message}` }, 500);
    }

    const path = `interviews/${session.id}/q${questionIndex}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: contentType ?? "video/mp4",
      upsert: true,
    });
    if (uploadErr) {
      await supabase.from("sessions").delete().eq("id", session.id);
      return json({ error: `dépôt de la vidéo impossible: ${uploadErr.message}` }, 500);
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const mediaUrl = pub.publicUrl;

    // Piste audio légère : la vidéo d'origine dépasse souvent la taille que le
    // moteur de transcription accepte.
    let audioUrl: string | null = null;
    if (candidate.audio_b64) {
      const audioBytes = Uint8Array.from(atob(candidate.audio_b64), (c) => c.charCodeAt(0));
      const audioPath = `interviews/${session.id}/q${questionIndex}.mp3`;
      const { error: audioErr } = await supabase.storage.from(BUCKET).upload(audioPath, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      if (audioErr) console.error("[import] audio non déposé", audioErr.message);
      else audioUrl = supabase.storage.from(BUCKET).getPublicUrl(audioPath).data.publicUrl;
    }

    const isAudio = ["mp3", "m4a", "wav", "ogg"].includes(ext);
    const { error: messageErr } = await supabase.from("session_messages").insert({
      session_id: session.id,
      organization_id: project.organization_id,
      role: "candidate",
      content: "",
      question_id: question?.id ?? null,
      is_follow_up: false,
      timestamp: now,
      transcription_status: "pending",
      video_segment_url: isAudio ? null : mediaUrl,
      audio_segment_url: isAudio ? mediaUrl : audioUrl,
    });
    if (messageErr) {
      return json({ error: `rattachement de la réponse impossible: ${messageErr.message}` }, 500);
    }

    await supabase
      .from("sessions")
      .update(isAudio ? { audio_recording_url: mediaUrl } : { video_recording_url: mediaUrl })
      .eq("id", session.id);

    const result: Record<string, unknown> = {
      status: "created",
      session_id: session.id,
      media_url: mediaUrl,
      media_bytes: bytes.byteLength,
    };

    if (runAnalysis) {
      const invoke = async (fn: string, payload: Record<string, unknown>) => {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(payload),
        });
        return { ok: res.ok, status: res.status };
      };

      result.transcription = await invoke("transcribe-session", {
        session_id: session.id,
        force: true,
      });
      // Découpage du monologue en réponses par question, pour que la matrice
      // note chaque question sur son propre passage.
      if (questions.length > 1) {
        const { data: msg } = await supabase
          .from("session_messages")
          .select("id, content")
          .eq("session_id", session.id)
          .eq("role", "candidate")
          .order("timestamp", { ascending: true })
          .limit(1)
          .maybeSingle();

        const transcript = (msg?.content ?? "").trim();
        if (msg && transcript) {
          const segments = await splitTranscript(transcript, questions);
          result.segments = segments.size;
          const first = questions.find((q) => segments.has(q.id));
          if (first) {
            await supabase
              .from("session_messages")
              .update({ question_id: first.id, content: segments.get(first.id)! })
              .eq("id", msg.id);

            const extra = questions
              .filter((q) => q.id !== first.id && segments.has(q.id))
              .map((q) => ({
                session_id: session.id,
                organization_id: project.organization_id,
                role: "candidate" as const,
                content: segments.get(q.id)!,
                question_id: q.id,
                is_follow_up: false,
                timestamp: now,
                transcription_status: "done",
                content_raw: segments.get(q.id)!,
              }));
            if (extra.length > 0) await supabase.from("session_messages").insert(extra);
          }
        }
      }

      result.report = await invoke("generate-report", {
        session_id: session.id,
        force: true,
        generate_fit_matrix: true,
      });
    }

    return json(result);
  } catch (e) {
    console.error("[import-external-candidates]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
