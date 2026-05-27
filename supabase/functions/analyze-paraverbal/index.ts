// Edge function : analyse para-verbale (audio) d'un entretien.
// Passe par la passerelle IA Lovable (LOVABLE_API_KEY) au format OpenAI-compatible
// avec tool calling. Envoie chaque segment audio en inline base64.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const MAX_SEGMENTS = 8;
const MAX_BYTES_PER_SEGMENT = 20 * 1024 * 1024; // 20 Mo par segment audio
const MAX_ATTEMPTS = 3;

type Segment = {
  message_id: string;
  question_label: string;
  transcript: string;
  audio_url: string;
};

function dim(description: string) {
  return {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 10 },
      comment: { type: "string", description: "1 phrase concrète" },
      evidence_message_id: { type: "string" },
    },
    required: ["score", "comment"],
    description,
  };
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "report_paraverbal",
    description: "Retourne 6 scores vocaux 0-10 + 1 commentaire par dimension",
    parameters: {
      type: "object",
      properties: {
        paraverbal_profile: {
          type: "object",
          properties: {
            fluency: dim("Débit, fluidité, articulation"),
            hesitation: dim("Hésitations, 'euh', reprises (10 = très peu)"),
            intonation: dim("Intonation expressive vs monotone"),
            energy: dim("Dynamisme, enthousiasme vocal"),
            vocal_confidence: dim("Assurance, fermeté de la voix"),
            vocal_stress: dim("Sérénité (10 = aucun stress audible)"),
          },
          required: [
            "fluency",
            "hesitation",
            "intonation",
            "energy",
            "vocal_confidence",
            "vocal_stress",
          ],
        },
        summary: {
          type: "string",
          description: "1 à 2 phrases de synthèse orale globale, langage manager",
        },
      },
      required: ["paraverbal_profile", "summary"],
    },
  },
} as const;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let reportId: string | null = null;
  let attempt = 1;

  const writeStatus = async (patch: Record<string, unknown>) => {
    if (!reportId) return;
    await supabase
      .from("reports")
      .update({
        paraverbal_analysis: {
          attempt,
          updated_at: new Date().toISOString(),
          ...patch,
        },
      })
      .eq("id", reportId);
  };

  try {
    const { session_id, force } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "no_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("id, candidate_name, project_id, projects(job_title, audio_analysis_enabled, questions(id, content, order_index))")
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "session_not_found" }), { status: 404, headers: corsHeaders });
    }
    const project: any = session.projects;

    const { data: report } = await supabase
      .from("reports")
      .select("id, paraverbal_analysis")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!report) {
      return new Response(JSON.stringify({ error: "no_report_yet" }), { status: 400, headers: corsHeaders });
    }
    reportId = report.id;
    const existing = report.paraverbal_analysis as any;
    if (existing?.profile && !force) {
      return new Response(JSON.stringify({ skipped: "already_analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prevAttempt = typeof existing?.attempt === "number" ? existing.attempt : 0;
    attempt = prevAttempt + 1;
    if (existing?.status === "failed" && prevAttempt >= MAX_ATTEMPTS && !force) {
      return new Response(JSON.stringify({ skipped: "max_attempts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!project?.audio_analysis_enabled) {
      await writeStatus({ status: "skipped", reason: "audio_analysis_disabled" });
      return new Response(JSON.stringify({ skipped: "audio_analysis_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await writeStatus({ status: "running", started_at: new Date().toISOString() });

    const { data: messages } = await supabase
      .from("session_messages")
      .select("id, role, content, audio_segment_url, video_segment_url, question_id, is_follow_up, timestamp")
      .eq("session_id", session_id)
      .order("timestamp");

    const candidateMsgs = (messages ?? []).filter(
      (m: any) => m.role === "candidate" && (m.audio_segment_url || m.video_segment_url),
    );
    if (candidateMsgs.length === 0) {
      await writeStatus({ status: "skipped", reason: "no_audio" });
      return new Response(JSON.stringify({ skipped: "no_audio" }), { headers: corsHeaders });
    }

    const questionsById = new Map<string, any>();
    (project.questions ?? []).forEach((q: any) => questionsById.set(q.id, q));

    const segments: Segment[] = candidateMsgs.slice(0, MAX_SEGMENTS).map((m: any) => ({
      message_id: m.id,
      question_label: questionsById.get(m.question_id)?.content?.slice(0, 120) ?? "Question libre",
      transcript: (m.content ?? "").slice(0, 4000),
      audio_url: m.audio_segment_url || m.video_segment_url,
    }));

    const userParts: any[] = [
      {
        type: "text",
        text: `Candidat : ${session.candidate_name}\nPoste : ${project.job_title}\n\nVoici jusqu'à ${MAX_SEGMENTS} segments audio des réponses du candidat. Analyse uniquement la dimension PARA-VERBALE (la voix, pas le contenu).`,
      },
    ];

    let uploaded = 0;
    const skippedSegments: Array<{ message_id: string; reason: string; details?: string }> = [];
    for (const seg of segments) {
      try {
        const res = await fetch(seg.audio_url);
        if (!res.ok) {
          skippedSegments.push({ message_id: seg.message_id, reason: "fetch_failed", details: `HTTP ${res.status}` });
          continue;
        }
        const blob = await res.blob();
        if (blob.size > MAX_BYTES_PER_SEGMENT) {
          skippedSegments.push({ message_id: seg.message_id, reason: "too_large", details: `${Math.round(blob.size / 1024 / 1024)} Mo` });
          continue;
        }
        const buf = new Uint8Array(await blob.arrayBuffer());
        const b64 = bytesToBase64(buf);
        const mime = blob.type || "audio/webm";
        userParts.push({
          type: "text",
          text: `\n--- Segment [message_id=${seg.message_id}] ---\nQuestion : ${seg.question_label}\nTranscription : ${seg.transcript}\nAudio :`,
        });
        userParts.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${b64}` },
        });
        uploaded += 1;
      } catch (e) {
        console.warn("[paraverbal] segment skipped", e);
        skippedSegments.push({ message_id: seg.message_id, reason: "exception", details: e instanceof Error ? e.message : String(e) });
      }
    }

    if (uploaded < 2) {
      await writeStatus({
        status: "skipped",
        reason: "not_enough_audio",
        skipped_segments: skippedSegments,
      });
      return new Response(JSON.stringify({ skipped: "not_enough_audio", skipped_segments: skippedSegments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userParts.push({
      type: "text",
      text:
        "\n\nProduis maintenant l'analyse para-verbale via l'outil report_paraverbal en t'appuyant sur l'audio fourni.",
    });

    const systemPrompt = `Tu es un coach vocal. Analyse uniquement la dimension PARA-VERBALE (la voix elle-même, pas le contenu) des réponses du candidat ${session.candidate_name} pour le poste ${project.job_title}.
Tu écoutes l'audio fourni en plus de la transcription. Note 6 dimensions sur 10 :
- fluency (débit, articulation)
- hesitation (peu d'« euh » = note haute)
- intonation (vivante vs monotone)
- energy (engagement vocal)
- vocal_confidence (assurance)
- vocal_stress (10 = aucun stress audible)
Pour chaque dimension : 1 phrase concrète (langage manager, sans jargon) et idéalement evidence_message_id du segment le plus représentatif.
Retourne le résultat via l'outil report_paraverbal.`;

    const RETRY_STATUSES = new Set([500, 502, 503, 504]);
    const BACKOFFS_MS = [2000, 5000];
    let gatewayRes: Response | null = null;
    let lastStatus = 0;
    let lastTxt = "";
    for (let i = 0; i < BACKOFFS_MS.length + 1; i++) {
      gatewayRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userParts },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "report_paraverbal" } },
        }),
      });
      if (gatewayRes.ok) break;
      lastStatus = gatewayRes.status;
      lastTxt = await gatewayRes.text();
      console.warn(`[paraverbal] gateway attempt ${i + 1} failed`, lastStatus, lastTxt.slice(0, 200));
      if (!RETRY_STATUSES.has(gatewayRes.status) || i === BACKOFFS_MS.length) break;
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[i]));
    }

    if (!gatewayRes || !gatewayRes.ok) {
      const status =
        lastStatus === 429
          ? "rate_limited"
          : lastStatus === 402
          ? "no_credits"
          : "failed";
      await writeStatus({
        status,
        error: `gateway_${lastStatus}`,
        failed_at: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: status, status: lastStatus }),
        {
          status: lastStatus === 429 || lastStatus === 402 ? lastStatus : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await gatewayRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let args: any = null;
    if (toolCall?.function?.arguments) {
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.warn("[paraverbal] failed to parse tool args", e);
      }
    }
    if (!args?.paraverbal_profile) {
      console.warn("[paraverbal] no tool_call in response", JSON.stringify(data).slice(0, 500));
      await writeStatus({
        status: "failed",
        error: "no_tool_call",
        failed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "no_tool_call" }), { status: 502, headers: corsHeaders });
    }

    const payload = {
      status: "ok",
      attempt,
      profile: args.paraverbal_profile,
      summary: args.summary ?? null,
      segments_analyzed: uploaded,
      generated_at: new Date().toISOString(),
      model: MODEL,
    };

    await supabase
      .from("reports")
      .update({ paraverbal_analysis: payload })
      .eq("id", report.id);

    return new Response(JSON.stringify({ success: true, segments_analyzed: uploaded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-paraverbal error:", e);
    await writeStatus({
      status: "failed",
      error: e instanceof Error ? e.message : "unknown",
      failed_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
