import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Limite inline Gemini : ~20 Mo. On reste prudent à 18 Mo.
const MAX_INLINE_BYTES = 18 * 1024 * 1024;
const MAX_SEGMENTS_PER_RUN = 8;
const MODEL = "google/gemini-2.5-flash";

const TRANSCRIBE_PROMPT = `Tu es un transcripteur professionnel.
Transcris EXACTEMENT ce que dit la personne dans cette vidéo, en français.

Règles strictes :
- Verbatim : garde les mots exacts, n'invente rien, ne reformule pas, ne corrige pas le sens.
- Supprime UNIQUEMENT les répétitions involontaires consécutives identiques (artefacts de reconnaissance vocale).
- Ajoute une ponctuation correcte et des majuscules en début de phrase.
- N'ajoute aucun commentaire, aucun préambule, aucune note. Renvoie uniquement le texte transcrit.
- Si la vidéo ne contient aucune parole audible, renvoie une chaîne vide.`;

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function guessMime(url: string): string {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".webm")) return "video/webm";
  if (u.endsWith(".mp4")) return "video/mp4";
  if (u.endsWith(".m4a")) return "audio/mp4";
  if (u.endsWith(".mp3")) return "audio/mpeg";
  if (u.endsWith(".wav")) return "audio/wav";
  if (u.endsWith(".ogg")) return "audio/ogg";
  return "video/webm";
}

async function callGeminiInline(apiKey: string, mediaUrl: string, buf: Uint8Array): Promise<string> {
  const b64 = b64encode(buf);
  const mime = guessMime(mediaUrl);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TRANSCRIBE_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${b64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`gateway ${response.status}: ${t.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("empty gateway response");
  return text.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, force } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Vérification optionnelle du caller : s'il fournit un Authorization header,
    // il doit appartenir à l'organisation du projet. Les soumissions candidat
    // (fin de session, sans auth) sont autorisées.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: u } = await userClient.auth.getUser(token);
      const userId = u?.user?.id;
      if (userId) {
        const { data: sessRow } = await admin
          .from("sessions")
          .select("id, projects(organization_id)")
          .eq("id", session_id)
          .single();
        const orgId = (sessRow as any)?.projects?.organization_id;
        if (orgId) {
          const { data: member } = await admin
            .from("profiles")
            .select("user_id")
            .eq("organization_id", orgId)
            .eq("user_id", userId)
            .maybeSingle();
          if (!member) {
            return new Response(JSON.stringify({ error: "forbidden" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    const { data: msgs, error: msgsErr } = await admin
      .from("session_messages")
      .select("id, content, content_raw, video_segment_url, audio_segment_url, transcription_status")
      .eq("session_id", session_id)
      .eq("role", "candidate")
      .order("timestamp");

    if (msgsErr) throw msgsErr;

    const candidates = (msgs ?? []).filter((m: any) => {
      const hasMedia = m.video_segment_url || m.audio_segment_url;
      if (!hasMedia) return false;
      if (force) return true;
      // Cibles : tout ce qui n'est pas done. On retentera aussi too_large/failed
      // au cas où le segment a été remplacé par une version plus légère.
      return m.transcription_status !== "done";
    });

    const targets = candidates.slice(0, MAX_SEGMENTS_PER_RUN);

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, total: (msgs ?? []).length, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let done = 0;
    let failed = 0;
    let tooLarge = 0;

    for (const m of targets) {
      // Préférer l'audio s'il existe (plus léger, plus rapide)
      const mediaUrl = (m as any).audio_segment_url || (m as any).video_segment_url;

      // HEAD pour vérifier la taille avant téléchargement
      let contentLength = 0;
      try {
        const headRes = await fetch(mediaUrl, { method: "HEAD" });
        if (headRes.ok) {
          contentLength = Number(headRes.headers.get("content-length") ?? "0");
        }
      } catch (e) {
        console.error("HEAD failed", (m as any).id, e);
      }

      if (contentLength > MAX_INLINE_BYTES) {
        // Trop gros pour la voie inline. On marque explicitement et on passe.
        await admin
          .from("session_messages")
          .update({ transcription_status: "too_large" })
          .eq("id", (m as any).id);
        tooLarge += 1;
        continue;
      }

      await admin
        .from("session_messages")
        .update({ transcription_status: "processing" })
        .eq("id", (m as any).id);

      try {
        const res = await fetch(mediaUrl);
        if (!res.ok) throw new Error(`media fetch ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > MAX_INLINE_BYTES) {
          await admin
            .from("session_messages")
            .update({ transcription_status: "too_large" })
            .eq("id", (m as any).id);
          tooLarge += 1;
          continue;
        }

        const cleaned = await callGeminiInline(LOVABLE_API_KEY, mediaUrl, buf);
        const rawBackup = (m as any).content_raw ?? (m as any).content ?? null;
        await admin
          .from("session_messages")
          .update({
            content: cleaned || (m as any).content || "",
            content_raw: rawBackup,
            transcription_status: cleaned ? "done" : "skipped",
            transcribed_at: new Date().toISOString(),
          })
          .eq("id", (m as any).id);
        done += 1;
      } catch (e) {
        console.error("transcribe segment failed", (m as any).id, e);
        await admin
          .from("session_messages")
          .update({ transcription_status: "failed" })
          .eq("id", (m as any).id);
        failed += 1;

        const message = e instanceof Error ? e.message : String(e);
        if (message.includes(" 429") || message.includes("quota")) {
          // Rate limit Gateway : on s'arrête, le caller pourra réessayer plus tard
          break;
        }
      }
    }

    const remaining = Math.max(candidates.length - targets.length, 0);
    return new Response(
      JSON.stringify({ ok: true, processed: done, failed, too_large: tooLarge, total: targets.length, remaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transcribe-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
