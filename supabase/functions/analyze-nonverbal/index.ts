// Edge function : analyse non-verbale (vidéo) d'un entretien.
// Téléverse les segments vidéo candidat vers Gemini Files API, puis appelle
// Gemini 2.5 Pro multimodal pour produire 4 scores corporels + micro-tensions.
// Met à jour reports.nonverbal_analysis (jsonb).

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
  video_url: string;
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
          "X-Goog-Upload-Header-Content-Type": blob.type || "video/webm",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      },
    );
    const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      console.warn("[nonverbal] no upload URL", await startRes.text());
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
      console.warn("[nonverbal] upload failed", finalRes.status, await finalRes.text());
      return null;
    }
    const data = await finalRes.json();
    const uri = data?.file?.uri;
    const state = data?.file?.state;
    const mimeType = data?.file?.mimeType || blob.type || "video/webm";
    if (!uri) return null;
    // Pour la vidéo, Gemini Files API peut renvoyer l'état PROCESSING : on poll.
    if (state === "PROCESSING") {
      const fileName = data.file.name; // ex: files/abc123
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const check = await fetch(
          `${GEMINI_BASE}/v1beta/${fileName}?key=${apiKey}`,
        );
        if (!check.ok) continue;
        const cdata = await check.json();
        if (cdata?.state === "ACTIVE") break;
        if (cdata?.state === "FAILED") {
          console.warn("[nonverbal] file processing failed", fileName);
          return null;
        }
      }
    }
    return { uri, mimeType };
  } catch (e) {
    console.error("[nonverbal] upload error", e);
    return null;
  }
}

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
  name: "report_nonverbal",
  description:
    "Retourne 4 scores corporels 0-10 + une liste de micro-tensions observées",
  parameters: {
    type: "object",
    properties: {
      nonverbal_profile: {
        type: "object",
        properties: {
          eye_contact: dim("Contact visuel avec la caméra (10 = soutenu et naturel)"),
          posture: dim("Posture (10 = ouverte, droite, stable)"),
          gestures: dim("Gestuelle (10 = expressive et adaptée, ni figée ni agitée)"),
          facial_expressivity: dim("Expressivité du visage (10 = vivante et congruente)"),
        },
        required: ["eye_contact", "posture", "gestures", "facial_expressivity"],
      },
      micro_tensions: {
        type: "array",
        description:
          "Moments précis (3 max) où un signe corporel mérite attention : raideur, fuite du regard, geste répétitif, etc.",
        items: {
          type: "object",
          properties: {
            message_id: { type: "string" },
            description: { type: "string", description: "1 phrase factuelle" },
          },
          required: ["message_id", "description"],
        },
      },
      summary: {
        type: "string",
        description:
          "1 à 2 phrases de synthèse corporelle globale, langage manager, sans jargon",
      },
    },
    required: ["nonverbal_profile", "summary"],
  },
} as const;

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
      .select(
        "id, candidate_name, project_id, projects(job_title, record_video, questions(id, content, order_index))",
      )
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "session_not_found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }
    const project: any = session.projects;
    if (!project?.record_video) {
      return new Response(
        JSON.stringify({ skipped: "video_not_recorded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: report } = await supabase
      .from("reports")
      .select("id, nonverbal_analysis")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!report) {
      return new Response(JSON.stringify({ error: "no_report_yet" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    if (report.nonverbal_analysis && (report.nonverbal_analysis as any).profile && !force) {
      return new Response(JSON.stringify({ skipped: "already_analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("session_messages")
      .select("id, role, content, video_segment_url, question_id, is_follow_up, timestamp")
      .eq("session_id", session_id)
      .order("timestamp");

    const candidateMsgs = (messages ?? []).filter(
      (m: any) => m.role === "candidate" && m.video_segment_url,
    );
    if (candidateMsgs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no_video" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionsById = new Map<string, any>();
    (project.questions ?? []).forEach((q: any) => questionsById.set(q.id, q));

    // Cap à 6 segments vidéo (coût + latence Gemini Pro vidéo)
    const segments: Segment[] = candidateMsgs.slice(0, 6).map((m: any) => ({
      message_id: m.id,
      question_label:
        questionsById.get(m.question_id)?.content?.slice(0, 120) ?? "Question libre",
      video_url: m.video_segment_url,
    }));

    const parts: any[] = [];
    let uploaded = 0;
    for (const seg of segments) {
      try {
        const res = await fetch(seg.video_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        // 80 Mo cap par segment vidéo
        if (blob.size > 80 * 1024 * 1024) continue;
        const file = await uploadToGemini(apiKey, blob, `vid-${seg.message_id}`);
        if (!file) continue;
        parts.push({
          text: `\n--- Segment [message_id=${seg.message_id}] ---\nQuestion : ${seg.question_label}\nVidéo :`,
        });
        parts.push({ fileData: { fileUri: file.uri, mimeType: file.mimeType } });
        uploaded += 1;
      } catch (e) {
        console.warn("[nonverbal] segment skipped", e);
      }
    }

    if (uploaded < 2) {
      console.warn("[nonverbal] not enough video uploaded", uploaded);
      return new Response(JSON.stringify({ skipped: "not_enough_video" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemInstruction = `Tu es un expert en communication non-verbale en entretien d'embauche. Analyse uniquement la dimension CORPORELLE (regard, posture, gestes, visage) du candidat ${session.candidate_name} pour le poste ${project.job_title}.
Tu observes la vidéo fournie. Note 4 dimensions sur 10 :
- eye_contact (10 = regard caméra naturel et soutenu)
- posture (10 = ouverte, droite, stable)
- gestures (10 = expressive et adaptée)
- facial_expressivity (10 = visage vivant et congruent)
Pour chaque dimension : 1 phrase concrète + evidence_message_id du segment le plus représentatif.
Identifie ensuite jusqu'à 3 micro-tensions notables (raideur, fuite du regard, geste répétitif…) avec leur message_id.
Ne juge JAMAIS l'apparence physique, l'âge, le genre, l'origine ou le handicap. Reste factuel et bienveillant.
Retourne le résultat via l'outil report_nonverbal.`;

    parts.push({
      text:
        "\n\nProduis maintenant l'analyse non-verbale via l'outil report_nonverbal en t'appuyant uniquement sur ce que tu vois.",
    });

    const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
    const BACKOFFS_MS = [2000, 5000, 12000];
    let geminiRes: Response | null = null;
    let lastStatus = 0;
    let lastTxt = "";
    for (let attempt = 0; attempt < BACKOFFS_MS.length + 1; attempt++) {
      geminiRes = await fetch(
        `${GEMINI_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts }],
            tools: [{ functionDeclarations: [TOOL_SCHEMA] }],
            toolConfig: {
              functionCallingConfig: {
                mode: "ANY",
                allowedFunctionNames: ["report_nonverbal"],
              },
            },
          }),
        },
      );
      if (geminiRes.ok) break;
      lastStatus = geminiRes.status;
      lastTxt = await geminiRes.text();
      console.warn(
        `[nonverbal] gemini attempt ${attempt + 1} failed`,
        lastStatus,
        lastTxt.slice(0, 200),
      );
      if (!RETRY_STATUSES.has(geminiRes.status) || attempt === BACKOFFS_MS.length) break;
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]));
    }

    if (!geminiRes || !geminiRes.ok) {
      console.error("[nonverbal] gemini error final", lastStatus, lastTxt);
      await supabase
        .from("reports")
        .update({
          nonverbal_analysis: {
            status: "failed",
            error: `gemini_${lastStatus}`,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", report.id);
      return new Response(
        JSON.stringify({ error: "gemini_failed", status: lastStatus }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await geminiRes.json();
    const call = data?.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.functionCall,
    )?.functionCall;
    const args = call?.args;
    if (!args?.nonverbal_profile) {
      console.warn("[nonverbal] no functionCall in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "no_function_call" }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const payload = {
      profile: args.nonverbal_profile,
      micro_tensions: Array.isArray(args.micro_tensions) ? args.micro_tensions : [],
      summary: args.summary ?? null,
      segments_analyzed: uploaded,
      generated_at: new Date().toISOString(),
      model: MODEL,
    };

    await supabase
      .from("reports")
      .update({ nonverbal_analysis: payload })
      .eq("id", report.id);

    return new Response(
      JSON.stringify({ success: true, segments_analyzed: uploaded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-nonverbal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
