import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { template as interviewReportTemplate } from "../_shared/transactional-email-templates/interview-report.tsx";

const SITE_NAME = "interw";
const SENDER_DOMAIN = "notify.interw.ai";
const FROM_DOMAIN = "notify.interw.ai";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // Call AI to generate report — using tool calling for structured extraction
    const systemPrompt = `Tu es un expert en recrutement, psychologie du travail et analyse comportementale.
Tu analyses des transcriptions d'entretiens vidéo pour fournir au recruteur une vue à 360° du candidat.
Tu es factuel, nuancé, et tu cites systématiquement des extraits du candidat pour justifier tes analyses.
Tu ne juges jamais, tu décris ce que la transcription révèle.`;

    const userPrompt = `Analyse cette transcription d'entretien.

Poste : ${project.job_title}
Candidat : ${session.candidate_name}

Questions posées :
${questions.map((q: any, i: number) => `${i + 1}. ${q.content} (type: ${q.type})`).join("\n")}

Critères d'évaluation :
${criteriaDesc}

Transcription complète :
${fullText}

Produis une analyse complète en utilisant l'outil generate_report.
- executive_summary : 3-5 phrases bilan global
- executive_summary_short : UNE phrase de 30 secondes (max 200 caractères) qui dit l'essentiel au recruteur pressé
- question_evaluations : OBLIGATOIRE — produis une entrée par question posée, indexée par "0", "1", "2"… correspondant à l'ordre ci-dessus. Chaque entrée doit contenir : question (texte exact), score (0-10), comment (1-2 phrases factuelles). Même si la réponse est très courte ou absente, donne un score (0 si pas de réponse) et un commentaire expliquant ce constat.
- personality_profile : scores Big Five 0-100 + courte interprétation par axe (basée sur la transcription, pas un test psychométrique formel)
- soft_skills : 3 à 6 soft skills observées, chacune avec une CITATION EXACTE du candidat comme preuve
- red_flags : signaux à creuser (incohérences, évasivité, manque d'exemples concrets, etc.) — vide si rien à signaler
- motivation_scores : connaissance entreprise, fit poste, enthousiasme, projection long terme (0-100 chacun)
- followup_questions : 3 à 5 questions précises à poser en entretien physique pour valider/creuser`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_report",
              description: "Produit le rapport structuré complet d'analyse de la session",
              parameters: {
                type: "object",
                properties: {
                  executive_summary: { type: "string" },
                  executive_summary_short: { type: "string", description: "Une phrase, max 200 caractères" },
                  overall_score: { type: "number", minimum: 0, maximum: 100 },
                  overall_grade: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                  recommendation: { type: "string", enum: ["strong_yes", "yes", "maybe", "no"] },
                  strengths: { type: "array", items: { type: "string" } },
                  areas_for_improvement: { type: "array", items: { type: "string" } },
                  criteria_scores: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        score: { type: "number" },
                        max: { type: "number" },
                        comment: { type: "string" },
                      },
                    },
                  },
                  question_evaluations: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        score: { type: "number", minimum: 0, maximum: 10 },
                        comment: { type: "string" },
                      },
                    },
                  },
                  personality_profile: {
                    type: "object",
                    properties: {
                      openness: {
                        type: "object",
                        properties: { score: { type: "number" }, interpretation: { type: "string" } },
                      },
                      conscientiousness: {
                        type: "object",
                        properties: { score: { type: "number" }, interpretation: { type: "string" } },
                      },
                      extraversion: {
                        type: "object",
                        properties: { score: { type: "number" }, interpretation: { type: "string" } },
                      },
                      agreeableness: {
                        type: "object",
                        properties: { score: { type: "number" }, interpretation: { type: "string" } },
                      },
                      emotional_stability: {
                        type: "object",
                        properties: { score: { type: "number" }, interpretation: { type: "string" } },
                      },
                    },
                  },
                  soft_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        score: { type: "number", minimum: 0, maximum: 10 },
                        quote: { type: "string", description: "Citation exacte du candidat" },
                      },
                      required: ["skill"],
                    },
                  },
                  red_flags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        description: { type: "string" },
                        evidence: { type: "string" },
                      },
                      required: ["description"],
                    },
                  },
                  motivation_scores: {
                    type: "object",
                    properties: {
                      company_knowledge: { type: "number", minimum: 0, maximum: 100 },
                      role_fit: { type: "number", minimum: 0, maximum: 100 },
                      enthusiasm: { type: "number", minimum: 0, maximum: 100 },
                      long_term_intent: { type: "number", minimum: 0, maximum: 100 },
                      comment: { type: "string" },
                    },
                  },
                  followup_questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["question"],
                    },
                  },
                },
                required: [
                  "executive_summary",
                  "overall_score",
                  "recommendation",
                  "strengths",
                  "areas_for_improvement",
                  "question_evaluations",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes IA atteinte. Réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Rechargez l'espace de travail." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI evaluation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any;
    try {
      const argsStr = toolCall?.function?.arguments;
      if (!argsStr) throw new Error("No tool call returned");
      parsed = typeof argsStr === "string" ? JSON.parse(argsStr) : argsStr;
    } catch (e) {
      console.error("Failed to parse AI tool arguments:", e, JSON.stringify(aiData));
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

    // ============================================================
    // Stats + Best-of (highlight clips)
    // ============================================================
    const candidateMessages = messages.filter((m: any) => m.role === "candidate");
    const aiMessages = messages.filter((m: any) => m.role === "ai");
    const candidateVideos = candidateMessages.filter((m: any) => m.video_segment_url);

    const aiFollowups = aiMessages.filter((m: any) => m.is_follow_up).length;
    const candidateSpeechChars = candidateMessages.reduce(
      (acc: number, m: any) => acc + (m.content?.length ?? 0),
      0,
    );

    const criteriaScoreValues = Object.values(criteriaScores) as any[];
    const avgCriteriaScore = criteriaScoreValues.length > 0
      ? criteriaScoreValues.reduce((acc, c: any) => acc + (Number(c.score) || 0) * (5 / (Number(c.max) || 5)), 0)
        / criteriaScoreValues.length
      : 0;

    // Best/worst question + highlight clips selection
    const evalEntries = Object.entries(parsed.question_evaluations || {}) as [string, any][];
    const sortedEvals = [...evalEntries].sort(
      (a, b) => (Number(b[1]?.score) || 0) - (Number(a[1]?.score) || 0),
    );
    const bestQuestionIdx = sortedEvals.length > 0 ? parseInt(sortedEvals[0][0]) : null;
    const worstQuestionIdx = sortedEvals.length > 0 ? parseInt(sortedEvals[sortedEvals.length - 1][0]) : null;
    const bestQuestionScore = bestQuestionIdx !== null ? Number(sortedEvals[0][1]?.score) : null;

    // Pick top 3 with an actual video
    const highlightClips: Array<Record<string, unknown>> = [];
    for (const [key, val] of sortedEvals) {
      const idx = parseInt(key);
      const video = candidateVideos[idx] || candidateVideos[idx - 1];
      if (video?.video_segment_url) {
        highlightClips.push({
          video_url: video.video_segment_url,
          question: val?.question ?? `Question ${idx + 1}`,
          score: Number(val?.score) || 0,
          question_index: idx,
          max_seconds: 20,
        });
      }
      if (highlightClips.length >= 3) break;
    }

    const stats = {
      duration_seconds: session.duration_seconds || 0,
      exchanges_count: messages.length,
      video_answers_count: candidateVideos.length,
      ai_followups: aiFollowups,
      candidate_speech_chars: candidateSpeechChars,
      avg_criteria_score: Number(avgCriteriaScore.toFixed(2)),
      best_question_idx: bestQuestionIdx,
      worst_question_idx: worstQuestionIdx,
    };

    // Save report
    const { data: insertedReport, error: reportError } = await supabase.from("reports").insert({
      session_id,
      executive_summary: parsed.executive_summary || "",
      executive_summary_short: parsed.executive_summary_short || null,
      overall_score: Math.min(Math.max(parsed.overall_score || 0, 0), 100),
      overall_grade: parsed.overall_grade || null,
      recommendation: parsed.recommendation || null,
      strengths: parsed.strengths || [],
      areas_for_improvement: parsed.areas_for_improvement || [],
      criteria_scores: criteriaScores,
      question_evaluations: parsed.question_evaluations || {},
      personality_profile: parsed.personality_profile || null,
      soft_skills: parsed.soft_skills || null,
      red_flags: parsed.red_flags || null,
      motivation_scores: parsed.motivation_scores || null,
      followup_questions: parsed.followup_questions || null,
      highlight_clips: highlightClips,
      stats,
    }).select("id").single();

    if (reportError) {
      console.error("Report insert error:", reportError);
      return new Response(JSON.stringify({ error: "Failed to save report", detail: reportError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email to recruiter (project creator) — enqueue directly to bypass JWT gateway
    try {
      const { data: recruiterProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", project.created_by)
        .maybeSingle();

      const recruiterEmail = recruiterProfile?.email;
      if (!recruiterEmail) {
        console.warn("No recruiter email found for project", project.id);
      } else {
        const normalizedEmail = recruiterEmail.toLowerCase();
        const reportUrl = `https://interw.ai/sessions/${session_id}`;

        // Auto-create a public share token so highlights + shared report links work from the email
        let highlightsUrl: string | null = null;
        try {
          if (insertedReport?.id) {
            const { data: existingShare } = await supabase
              .from("report_shares")
              .select("share_token")
              .eq("report_id", insertedReport.id)
              .eq("is_active", true)
              .maybeSingle();
            let shareToken = existingShare?.share_token ?? null;
            if (!shareToken) {
              const { data: newShare } = await supabase
                .from("report_shares")
                .insert({ report_id: insertedReport.id, created_by: project.created_by })
                .select("share_token")
                .single();
              shareToken = newShare?.share_token ?? null;
            }
            if (shareToken && highlightClips.length > 0) {
              highlightsUrl = `https://interw.ai/highlights/${shareToken}`;
            }
          }
        } catch (e) {
          console.warn("Could not create share token for highlights:", e);
        }

        const templateData = {
          candidateName: session.candidate_name,
          candidateEmail: session.candidate_email,
          jobTitle: project.job_title,
          projectTitle: project.title,
          overallScore: Math.min(Math.max(parsed.overall_score || 0, 0), 100),
          overallGrade: parsed.overall_grade || null,
          recommendation: parsed.recommendation || null,
          executiveSummary: parsed.executive_summary || "",
          executiveSummaryShort: parsed.executive_summary_short || null,
          personalityProfile: parsed.personality_profile || null,
          followupQuestions: parsed.followup_questions || null,
          strengths: parsed.strengths || [],
          areasForImprovement: parsed.areas_for_improvement || [],
          criteriaScores,
          questionEvaluations: parsed.question_evaluations || {},
          reportUrl,
          highlightsUrl,
          stats: {
            duration_seconds: stats.duration_seconds,
            exchanges_count: stats.exchanges_count,
            video_answers_count: stats.video_answers_count,
            best_question_idx: bestQuestionIdx,
            best_question_score: bestQuestionScore,
          },
        };

        // 1. Suppression check
        const { data: suppressed } = await supabase
          .from("suppressed_emails")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (suppressed) {
          console.log("Recruiter email suppressed, skipping", normalizedEmail);
        } else {
          // 2. Get / create unsubscribe token
          let unsubscribeToken: string | null = null;
          const { data: existingToken } = await supabase
            .from("email_unsubscribe_tokens")
            .select("token, used_at")
            .eq("email", normalizedEmail)
            .maybeSingle();

          if (existingToken && !existingToken.used_at) {
            unsubscribeToken = existingToken.token;
          } else if (!existingToken) {
            const newToken = generateToken();
            await supabase.from("email_unsubscribe_tokens").upsert(
              { token: newToken, email: normalizedEmail },
              { onConflict: "email", ignoreDuplicates: true },
            );
            const { data: stored } = await supabase
              .from("email_unsubscribe_tokens")
              .select("token")
              .eq("email", normalizedEmail)
              .maybeSingle();
            unsubscribeToken = stored?.token ?? newToken;
          }

          if (!unsubscribeToken) {
            console.warn("Unsubscribe token unavailable, skipping report email");
          } else {
            // 3. Render template
            const html = await renderAsync(
              React.createElement(interviewReportTemplate.component, templateData),
            );
            const plainText = await renderAsync(
              React.createElement(interviewReportTemplate.component, templateData),
              { plainText: true },
            );
            const subject = typeof interviewReportTemplate.subject === "function"
              ? interviewReportTemplate.subject(templateData)
              : interviewReportTemplate.subject;

            const messageId = crypto.randomUUID();
            const idempotencyKey = `report-${session_id}`;

            // 4. Log pending
            await supabase.from("email_send_log").insert({
              message_id: messageId,
              template_name: "interview-report",
              recipient_email: recruiterEmail,
              status: "pending",
            });

            // Validate candidate email before using as reply_to
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const candidateEmail = (session.candidate_email ?? "").trim();
            const validReplyTo = candidateEmail && emailRegex.test(candidateEmail);
            if (!validReplyTo) {
              console.warn(
                `Invalid candidate email "${session.candidate_email}" for session ${session_id}; sending report without reply_to.`,
              );
            }

            // 5. Enqueue
            const payload: Record<string, unknown> = {
              message_id: messageId,
              to: recruiterEmail,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text: plainText,
              purpose: "transactional",
              label: "interview-report",
              idempotency_key: idempotencyKey,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            };
            if (validReplyTo) {
              payload.reply_to = candidateEmail;
            }

            const { error: enqueueError } = await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload,
            });

            if (enqueueError) {
              console.error("Failed to enqueue report email:", enqueueError);
              await supabase.from("email_send_log").insert({
                message_id: messageId,
                template_name: "interview-report",
                recipient_email: recruiterEmail,
                status: "failed",
                error_message: enqueueError.message,
              });
            } else {
              console.log("Report email enqueued for", recruiterEmail);
            }
          }
        }
      }
    } catch (e) {
      console.error("Email enqueue threw:", e);
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
