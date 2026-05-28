// Edge function : analyse non-verbale (vidéo) d'un entretien.
// Passe par la passerelle IA Lovable (LOVABLE_API_KEY) au format OpenAI-compatible
// avec tool calling. Envoie chaque segment vidéo en inline base64.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

const MAX_SEGMENTS = 2;
const MAX_BYTES_PER_SEGMENT = 15 * 1024 * 1024; // 15 Mo (Gemini accepte largement plus, edge ~256 Mo de RAM)

type Segment = {
  message_id: string;
  question_label: string;
  video_url: string;
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
  },
} as const;

function bytesToBase64(bytes: Uint8Array): string {
  // Encode par chunks pour éviter le stack overflow sur de gros buffers
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
  const MAX_ATTEMPTS = 3;

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
      // En mode force, on autorise quand même si des segments vidéo existent réellement
      // (cas des projets où record_video=false mais le candidat a quand même envoyé de la vidéo).
      let hasRealSegments = false;
      if (force) {
        const { count } = await supabase
          .from("session_messages")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session_id)
          .eq("role", "candidate")
          .not("video_segment_url", "is", null);
        hasRealSegments = (count ?? 0) > 0;
      }
      if (!hasRealSegments) {
        // On persiste le statut pour que l'UI ait une raison stable (pas juste un retour HTTP).
        const { data: existingReport } = await supabase
          .from("reports")
          .select("id")
          .eq("session_id", session_id)
          .maybeSingle();
        if (existingReport) {
          await supabase
            .from("reports")
            .update({
              nonverbal_analysis: {
                status: "skipped",
                reason: "video_not_recorded",
                failed_at: new Date().toISOString(),
              },
            })
            .eq("id", existingReport.id);
        }
        return new Response(
          JSON.stringify({ skipped: "video_not_recorded" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
    reportId = report.id;
    const existing = report.nonverbal_analysis as any;
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

    // Marque "en cours"
    await supabase
      .from("reports")
      .update({
        nonverbal_analysis: {
          status: "running",
          attempt,
          started_at: new Date().toISOString(),
        },
      })
      .eq("id", report.id);

    const { data: messages } = await supabase
      .from("session_messages")
      .select("id, role, content, video_segment_url, question_id, is_follow_up, timestamp")
      .eq("session_id", session_id)
      .order("timestamp");

    const candidateMsgs = (messages ?? []).filter(
      (m: any) => m.role === "candidate" && m.video_segment_url,
    );
    if (candidateMsgs.length === 0) {
      await supabase
        .from("reports")
        .update({ nonverbal_analysis: { status: "skipped", reason: "no_video", attempt } })
        .eq("id", report.id);
      return new Response(JSON.stringify({ skipped: "no_video" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionsById = new Map<string, any>();
    (project.questions ?? []).forEach((q: any) => questionsById.set(q.id, q));

    const segments: Segment[] = candidateMsgs.slice(0, MAX_SEGMENTS).map((m: any) => ({
      message_id: m.id,
      question_label:
        questionsById.get(m.question_id)?.content?.slice(0, 120) ?? "Question libre",
      video_url: m.video_segment_url,
    }));

    // Construit la liste des "parts" multimodales
    const userParts: any[] = [
      {
        type: "text",
        text:
          `Candidat : ${session.candidate_name}\nPoste : ${project.job_title}\n\nVoici jusqu'à ${MAX_SEGMENTS} segments vidéo de réponses du candidat. Analyse uniquement la communication non-verbale.`,
      },
    ];
    let uploaded = 0;
    const skippedSegments: Array<{ message_id: string; reason: string; details?: string }> = [];
    for (const seg of segments) {
      try {
        const res = await fetch(seg.video_url);
        if (!res.ok) {
          console.warn("[nonverbal] fetch segment failed", res.status, seg.message_id);
          skippedSegments.push({ message_id: seg.message_id, reason: "fetch_failed", details: `HTTP ${res.status}` });
          continue;
        }
        const blob = await res.blob();
        if (blob.size > MAX_BYTES_PER_SEGMENT) {
          console.warn("[nonverbal] segment too large", seg.message_id, blob.size);
          skippedSegments.push({ message_id: seg.message_id, reason: "too_large", details: `${Math.round(blob.size / 1024 / 1024)} Mo` });
          continue;
        }
        const buf = new Uint8Array(await blob.arrayBuffer());
        const b64 = bytesToBase64(buf);
        const mime = blob.type || "video/webm";
        userParts.push({
          type: "text",
          text: `\n--- Segment [message_id=${seg.message_id}] ---\nQuestion : ${seg.question_label}`,
        });
        userParts.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${b64}` },
        });
        uploaded += 1;
      } catch (e) {
        console.warn("[nonverbal] segment skipped", e);
        skippedSegments.push({ message_id: seg.message_id, reason: "exception", details: e instanceof Error ? e.message : String(e) });
      }
    }

    if (uploaded < 1) {
      await supabase
        .from("reports")
        .update({
          nonverbal_analysis: {
            status: "skipped", attempt,
            reason: "not_enough_video",
            skipped_segments: skippedSegments,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", report.id);
      return new Response(JSON.stringify({ skipped: "not_enough_video", skipped_segments: skippedSegments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userParts.push({
      type: "text",
      text:
        "\n\nProduis maintenant l'analyse non-verbale via l'outil report_nonverbal en t'appuyant uniquement sur ce que tu vois.",
    });

    const systemPrompt = `Tu es un expert en communication non-verbale en entretien d'embauche. Analyse uniquement la dimension CORPORELLE (regard, posture, gestes, visage) du candidat.
Note 4 dimensions sur 10 :
- eye_contact (10 = regard caméra naturel et soutenu)
- posture (10 = ouverte, droite, stable)
- gestures (10 = expressive et adaptée)
- facial_expressivity (10 = visage vivant et congruent)
Pour chaque dimension : 1 phrase concrète + evidence_message_id du segment le plus représentatif.
Identifie ensuite jusqu'à 3 micro-tensions notables (raideur, fuite du regard, geste répétitif…) avec leur message_id.
Ne juge JAMAIS l'apparence physique, l'âge, le genre, l'origine ou le handicap. Reste factuel et bienveillant.
Retourne le résultat via l'outil report_nonverbal.`;

    const gatewayRes = await fetch(GATEWAY_URL, {
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
        tool_choice: { type: "function", function: { name: "report_nonverbal" } },
      }),
    });

    if (!gatewayRes.ok) {
      const txt = await gatewayRes.text();
      console.error("[nonverbal] gateway error", gatewayRes.status, txt.slice(0, 400));
      const status =
        gatewayRes.status === 429
          ? "rate_limited"
          : gatewayRes.status === 402
          ? "no_credits"
          : "failed";
      await supabase
        .from("reports")
        .update({
          nonverbal_analysis: {
            status, attempt,
            error: `gateway_${gatewayRes.status}`,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", report.id);
      return new Response(
        JSON.stringify({ error: status, status: gatewayRes.status }),
        {
          status: gatewayRes.status === 429 || gatewayRes.status === 402
            ? gatewayRes.status
            : 502,
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
        console.warn("[nonverbal] failed to parse tool args", e);
      }
    }
    if (!args?.nonverbal_profile) {
      console.warn("[nonverbal] no tool_call in response", JSON.stringify(data).slice(0, 500));
      await supabase
        .from("reports")
        .update({
          nonverbal_analysis: {
            status: "failed", attempt,
            error: "no_tool_call",
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", report.id);
      return new Response(JSON.stringify({ error: "no_tool_call" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      profile: args.nonverbal_profile,
      micro_tensions: Array.isArray(args.micro_tensions) ? args.micro_tensions : [],
      summary: args.summary ?? null,
      segments_analyzed: uploaded,
      generated_at: new Date().toISOString(),
      model: MODEL,
      status: "ok", attempt,
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
    if (reportId) {
      await supabase
        .from("reports")
        .update({
          nonverbal_analysis: {
            status: "failed", attempt,
            error: e instanceof Error ? e.message : "unknown",
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", reportId);
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
