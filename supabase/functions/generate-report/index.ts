import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session + project + questions + evaluation criteria + messages
    const [sessionRes, messagesRes] = await Promise.all([
      supabase.from("sessions").select("*, projects(*, evaluation_criteria(*), questions(*))").eq("id", session_id).single(),
      supabase.from("session_messages").select("*").eq("session_id", session_id).order("timestamp"),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = sessionRes.data;
    const project = session.projects as any;
    const messages = messagesRes.data ?? [];
    const criteria = project?.evaluation_criteria ?? [];
    const questions = project?.questions ?? [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build full transcript text
    const fullText = messages
      .map((m: any) => `${m.role === "ai" ? project.ai_persona_name : session.candidate_name}: ${m.content}`)
      .join("\n\n");

    const wordCount = fullText.split(/\s+/).length;

    // Save transcript (upsert to avoid duplicate constraint errors)
    const { error: transcriptError } = await supabase.from("transcripts").upsert({
      session_id,
      full_text: fullText,
      formatted_text: fullText,
      word_count: wordCount,
      language: project.language || "fr",
      duration_seconds: session.duration_seconds || 0,
    }, { onConflict: "session_id" });

    if (transcriptError) {
      console.error("Transcript insert error:", transcriptError);
    }

    // Check if report already exists for this session
    const { data: existingReport } = await supabase.from("reports").select("id").eq("session_id", session_id).maybeSingle();
    if (existingReport) {
      return new Response(JSON.stringify({ success: true, message: "Report already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build criteria description for AI
    const criteriaDesc = criteria.length > 0
      ? criteria.map((c: any) => `- ${c.label} (poids: ${c.weight}%, échelle: ${c.scoring_scale}): ${c.description}`).join("\n")
      : "Aucun critère spécifique défini. Évalue sur: communication, pertinence des réponses, motivation, compétences techniques.";

    // Call AI to generate report
    const aiPrompt = `Tu es un expert en recrutement. Analyse cette transcription d'entretien et génère un rapport structuré.

Poste: ${project.job_title}
Candidat: ${session.candidate_name}

Questions posées:
${questions.map((q: any, i: number) => `${i + 1}. ${q.content} (type: ${q.type})`).join("\n")}

Critères d'évaluation:
${criteriaDesc}

Transcription complète:
${fullText}

Génère un rapport JSON avec exactement cette structure:
{
  "executive_summary": "Résumé de 3-5 phrases de la performance du candidat",
  "overall_score": <number 0-100>,
  "overall_grade": "<A/B/C/D/E>",
  "recommendation": "<strong_yes|yes|maybe|no>",
  "strengths": ["point fort 1", "point fort 2", ...],
  "areas_for_improvement": ["axe 1", "axe 2", ...],
  "criteria_scores": {
    "<criteria_id>": { "label": "<nom>", "score": <number>, "max": <number>, "comment": "<commentaire>" }
  },
  "question_evaluations": {
    "<question_index>": { "question": "<texte>", "score": <0-10>, "comment": "<analyse>" }
  }
}

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans aucun texte autour ni markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert en évaluation de candidats. Tu réponds uniquement en JSON valide." },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI evaluation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let reportContent = aiData.choices?.[0]?.message?.content || "";

    // Clean potential markdown code fences
    reportContent = reportContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(reportContent);
    } catch (e) {
      console.error("Failed to parse AI report JSON:", reportContent);
      return new Response(JSON.stringify({ error: "Invalid AI report format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build criteria_scores using actual criteria IDs if available
    let criteriaScores = parsed.criteria_scores || {};
    if (criteria.length > 0 && Object.keys(criteriaScores).length > 0) {
      // Map AI output to actual criteria IDs
      const mappedScores: Record<string, any> = {};
      const criteriaList = [...criteria];
      const scoreEntries = Object.values(criteriaScores) as any[];
      for (let i = 0; i < Math.min(criteriaList.length, scoreEntries.length); i++) {
        const c = criteriaList[i];
        const s = scoreEntries[i];
        const maxScale = c.scoring_scale === "0-10" ? 10 : c.scoring_scale === "0-5" ? 5 : 5;
        mappedScores[c.id] = {
          label: c.label,
          score: Math.min(s.score ?? 0, maxScale),
          max: maxScale,
          comment: s.comment || "",
        };
      }
      criteriaScores = mappedScores;
    }

    // Save report
    const { error: reportError } = await supabase.from("reports").insert({
      session_id,
      executive_summary: parsed.executive_summary || "",
      overall_score: Math.min(Math.max(parsed.overall_score || 0, 0), 100),
      overall_grade: parsed.overall_grade || null,
      recommendation: parsed.recommendation || null,
      strengths: parsed.strengths || [],
      areas_for_improvement: parsed.areas_for_improvement || [],
      criteria_scores: criteriaScores,
      question_evaluations: parsed.question_evaluations || {},
    });

    if (reportError) {
      console.error("Report insert error:", reportError);
      return new Response(JSON.stringify({ error: "Failed to save report", detail: reportError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
