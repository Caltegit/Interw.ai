// Edge function : analyse para-verbale (audio) d'un entretien.
// Téléverse les segments audio candidat vers Gemini Files API, puis appelle
// Gemini 2.5 Pro en mode multimodal pour produire 6 scores vocaux.
// Met à jour reports.paraverbal_analysis (jsonb).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const MODEL = "gemini-2.5-pro";

type Segment = {
  message_id: string;
  question_label: string;
  transcript: string;
  audio_url: string;
};

async function uploadToGemini(
  apiKey: string,
  blob: Blob,
  displayName: string,
): Promise<{ uri: string; mimeType: string } | null> {
  try {
    const startRes = await fetch(
      `${GEMINI_BASE}/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(blob.size),
          "X-Goog-Upload-Header-Content-Type": blob.type || "audio/webm",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      },
    );
    const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      console.warn("[paraverbal] no upload URL", await startRes.text());
      return null;
    }

    const buf = new Uint8Array(await blob.arrayBuffer());
    const finalRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        "Content-Length": String(buf.byteLength),
      },
      body: buf,
    });
    if (!finalRes.ok) {
      console.warn("[paraverbal] upload failed", finalRes.status, await finalRes.text());
      return null;
    }
    const data = await finalRes.json();
    const uri = data?.file?.uri;
    const mimeType = data?.file?.mimeType || blob.type || "audio/webm";
    if (!uri) return null;
    return { uri, mimeType };
  } catch (e) {
    console.error("[paraverbal] upload error", e);
    return null;
  }
}

const TOOL_SCHEMA = {
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
} as const;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, force } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "no_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: session } = await supabase
      .from("sessions")
      .select("id, candidate_name, project_id, projects(job_title, audio_analysis_enabled, questions(id, content, order_index))")
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "session_not_found" }), { status: 404, headers: corsHeaders });
    }
    const project: any = session.projects;
    if (!project?.audio_analysis_enabled) {
      return new Response(JSON.stringify({ skipped: "audio_analysis_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: report } = await supabase
      .from("reports")
      .select("id, paraverbal_analysis")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!report) {
      return new Response(JSON.stringify({ error: "no_report_yet" }), { status: 400, headers: corsHeaders });
    }
    if (report.paraverbal_analysis && !force) {
      return new Response(JSON.stringify({ skipped: "already_analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("session_messages")
      .select("id, role, content, audio_segment_url, video_segment_url, question_id, is_follow_up, timestamp")
      .eq("session_id", session_id)
      .order("timestamp");

    const candidateMsgs = (messages ?? []).filter(
      (m: any) => m.role === "candidate" && (m.audio_segment_url || m.video_segment_url),
    );
    if (candidateMsgs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no_audio" }), { headers: corsHeaders });
    }

    const questionsById = new Map<string, any>();
    (project.questions ?? []).forEach((q: any) => questionsById.set(q.id, q));

    // On limite à 12 segments max pour cap latence/coût (≈ 12 réponses)
    const segments: Segment[] = candidateMsgs.slice(0, 12).map((m: any) => ({
      message_id: m.id,
      question_label: questionsById.get(m.question_id)?.content?.slice(0, 120) ?? "Question libre",
      transcript: (m.content ?? "").slice(0, 4000),
      audio_url: m.audio_segment_url || m.video_segment_url,
    }));

    // Upload audio → Gemini Files API
    const parts: any[] = [];
    let uploaded = 0;
    for (const seg of segments) {
      try {
        const res = await fetch(seg.audio_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        // 24 Mo cap par segment
        if (blob.size > 24 * 1024 * 1024) continue;
        const file = await uploadToGemini(apiKey, blob, `seg-${seg.message_id}`);
        if (!file) continue;
        parts.push({ text: `\n--- Segment [message_id=${seg.message_id}] ---\nQuestion : ${seg.question_label}\nTranscription : ${seg.transcript}\nAudio :` });
        parts.push({ fileData: { fileUri: file.uri, mimeType: file.mimeType } });
        uploaded += 1;
      } catch (e) {
        console.warn("[paraverbal] segment skipped", e);
      }
    }

    if (uploaded < 2) {
      console.warn("[paraverbal] not enough audio uploaded", uploaded);
      return new Response(JSON.stringify({ skipped: "not_enough_audio" }), { headers: corsHeaders });
    }

    const systemInstruction = `Tu es un coach vocal. Analyse uniquement la dimension PARA-VERBALE (la voix elle-même, pas le contenu) des réponses du candidat ${session.candidate_name} pour le poste ${project.job_title}.
Tu écoutes l'audio fourni en plus de la transcription. Note 6 dimensions sur 10 :
- fluency (débit, articulation)
- hesitation (peu d'euh = note haute)
- intonation (vivante vs monotone)
- energy (engagement vocal)
- vocal_confidence (assurance)
- vocal_stress (10 = aucun stress audible)
Pour chaque dimension, fournis un commentaire concret (1 phrase, langage manager, sans jargon) et idéalement evidence_message_id du segment le plus représentatif.
Retourne le résultat via l'outil report_paraverbal.`;

    parts.push({
      text:
        "\n\nProduis maintenant l'analyse para-verbale via l'outil report_paraverbal. Base-toi sur l'audio que tu viens d'écouter.",
    });

    const geminiRes = await fetch(
      `${GEMINI_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts }],
          tools: [{ functionDeclarations: [TOOL_SCHEMA] }],
          toolConfig: {
            functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["report_paraverbal"] },
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const txt = await geminiRes.text();
      console.error("[paraverbal] gemini error", geminiRes.status, txt);
      return new Response(JSON.stringify({ error: "gemini_failed", status: geminiRes.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await geminiRes.json();
    const call = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const args = call?.args;
    if (!args?.paraverbal_profile) {
      console.warn("[paraverbal] no functionCall in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "no_function_call" }), { status: 502, headers: corsHeaders });
    }

    const payload = {
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
