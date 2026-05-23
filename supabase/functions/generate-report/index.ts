import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { template as interviewReportTemplate } from "../_shared/transactional-email-templates/interview-report.tsx";

const SITE_NAME = "interw.ai";
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

function dimensionSchema() {
  return {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 10 },
      comment: { type: "string" },
      quote: { type: "string" },
      message_id: { type: "string" },
      start_seconds: { type: "number" },
    },
  } as const;
}

function personalityProfileSchema() {
  const trait = {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 100 },
      interpretation: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      evidences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            message_id: { type: "string" },
            start_seconds: { type: "number" },
          },
        },
      },
    },
    required: ["score", "confidence"],
  } as const;
  return {
    type: "object",
    properties: {
      openness: trait,
      conscientiousness: trait,
      extraversion: trait,
      agreeableness: trait,
      emotional_stability: trait,
    },
    required: ["openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability"],
  } as const;
}

const PERSONALITY_TRAITS = ["openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability"] as const;

function buildFallbackPersonalityProfile(existing: any) {
  const result: Record<string, any> = {};
  const src = existing && typeof existing === "object" ? existing : {};
  for (const trait of PERSONALITY_TRAITS) {
    const t = src[trait];
    if (t && typeof t === "object" && typeof t.score === "number") {
      result[trait] = {
        score: t.score,
        confidence: t.confidence || "low",
        interpretation: t.interpretation || "",
        evidences: Array.isArray(t.evidences) ? t.evidences : [],
      };
    } else {
      result[trait] = {
        score: 50,
        confidence: "low",
        interpretation: "Données insuffisantes pour conclure",
        evidences: [],
      };
    }
  }
  return result;
}

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
    let messages = messagesRes.data ?? [];

    // Garde-fou : si la session ne contient aucun enregistrement vidéo/audio
    // côté candidat, on ne peut rien transcrire ni évaluer.
    const hasAnyRecording = messages.some(
      (m: any) =>
        m.role === "candidate" && (m.video_segment_url || m.audio_segment_url),
    );
    if (!hasAnyRecording) {
      return new Response(
        JSON.stringify({ error: "no_recordings", message: "Aucun enregistrement disponible pour cette session." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filet de sécurité : si certains segments candidats n'ont pas encore été
    // transcrits, on relance transcribe-session (voie inline Lovable Gateway).
    const isTerminalStatus = (s: string | null | undefined) =>
      s === "done" || s === "skipped" || s === "too_large" || s === "failed";
    const candidateMediaMessages = () =>
      messages.filter(
        (m: any) =>
          m.role === "candidate" &&
          (m.video_segment_url || m.audio_segment_url),
      );
    const hasFailedSegments = messages.some(
      (m: any) =>
        m.role === "candidate" &&
        (m.video_segment_url || m.audio_segment_url) &&
        !isTerminalStatus(m.transcription_status),
    );
    if (hasFailedSegments) {
      try {
        console.log("generate-report: relance transcribe-session pour segments manquants");
        for (let attempt = 0; attempt < 15; attempt += 1) {
          const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-session`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ session_id, force: false }),
          });
          if (!transcribeRes.ok) {
            console.error("transcribe-session failed", transcribeRes.status, await transcribeRes.text());
            break;
          }

          const transcribeData = await transcribeRes.json().catch(() => ({}));
          const refreshed = await supabase
            .from("session_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("timestamp");
          if (refreshed.data) messages = refreshed.data;

          const cands = candidateMediaMessages();
          const stillPending = cands.some(
            (m: any) => !isTerminalStatus(m.transcription_status),
          );
          if (!stillPending || !transcribeData?.remaining) break;

          // Tolérance : si ≥70% des segments sont en statut terminal et qu'au
          // moins 3 ont une transcription, on génère le rapport partiel plutôt
          // que d'attendre les segments corrompus.
          const total = cands.length;
          const terminal = cands.filter((m: any) => isTerminalStatus(m.transcription_status)).length;
          const doneCount = cands.filter((m: any) => m.transcription_status === "done").length;
          if (total > 0 && terminal / total >= 0.7 && doneCount >= 3) {
            console.log(
              `generate-report: seuil de tolérance atteint (${terminal}/${total} terminaux, ${doneCount} done)`,
            );
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      } catch (e) {
        console.error("transcribe-session pre-step error:", e);
      }
    }
    const criteria = project?.evaluation_criteria ?? [];
    const questions = project?.questions ?? [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Garde-fou : refuse de générer un rapport sur un transcript quasi vide
    // alors que la session a duré assez longtemps. Évite les rapports à 0/100
    // dûs à une transcription incomplète au moment de la génération.
    const totalCandidateChars = messages
      .filter((m: any) => m.role === "candidate")
      .reduce((sum: number, m: any) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
    const sessionDuration = Number(session.duration_seconds ?? 0);
    if (totalCandidateChars < 200 && sessionDuration > 120) {
      console.error(
        "generate-report: aborting — transcript too short for session duration",
        session_id,
        "chars=", totalCandidateChars,
        "duration=", sessionDuration,
      );
      return new Response(
        JSON.stringify({
          error: "transcript_incomplete",
          message: "Transcription incomplète : rapport non généré pour éviter un score erroné.",
          chars: totalCandidateChars,
          duration_seconds: sessionDuration,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
    const systemPrompt = `Tu es un expert en recrutement qui produit des RAPPORTS DE DÉCISION pour des recruteurs pressés.
Ton objectif n'est pas de produire une analyse exhaustive : c'est d'aider à prendre une décision claire (shortlister, creuser, ou rejeter) en moins de 2 minutes de lecture.
Tu es factuel, direct, et tu cites systématiquement le candidat pour appuyer chaque affirmation.
Tu n'utilises JAMAIS de jargon RH ou psy : tu parles le langage d'un manager qui recrute.`;

    // Liste des messages candidat avec leur id, pour permettre à l'IA de citer la source exacte
    const candidateMessagesForPrompt = messages
      .filter((m: any) => m.role === "candidate" && m.content?.trim())
      .map((m: any) => `[id=${m.id}] ${m.content}`)
      .join("\n");

    const userPrompt = `Analyse cette transcription d'entretien pour le poste de ${project.job_title}.

Candidat : ${session.candidate_name}

Questions posées :
${questions.map((q: any, i: number) => `${i + 1}. ${q.content} (type: ${q.type})`).join("\n")}

Critères du poste (à utiliser pour fit_breakdown) :
${criteriaDesc}

Transcription complète :
${fullText}

Messages du candidat avec identifiants (à utiliser dans message_id / evidence_message_id) :
${candidateMessagesForPrompt}

Règles ABSOLUES :
1. Chaque affirmation (driver, fit, signal, dimension de communication) doit s'appuyer sur une citation EXACTE du candidat avec son message_id.
2. N'invente jamais un message_id : si tu ne peux pas citer, omets le champ.
3. Si la transcription est trop courte ou vague pour conclure, dis-le explicitement plutôt que d'inventer.
4. Pas de jargon RH/psy dans verdict_headline, decision_drivers, fit_breakdown.statement, signals : du français concret de manager.
5. À chaque fois que tu fournis un message_id (ou evidence_message_id), fournis aussi start_seconds : la seconde approximative où commence la phrase citée DANS la réponse vidéo (0 = début). Le serveur recalculera ensuite l'horodatage exact à partir de la transcription : ton estimation sert de filet de secours.

Produis un rapport orienté DÉCISION en utilisant l'outil generate_report.

Champs prioritaires :
- verdict_headline : UNE phrase max 100 caractères qu'un recruteur dirait à son manager. Pas une description, un verdict ("Profil senior solide, à valider sur la dimension management").
- recommendation : strong_yes / yes / maybe / no
- decision_drivers : 2 à 4 raisons CLÉS de cette reco. Chacune = label court (max 80 car), sentiment (positive/neutral/negative), citation + message_id.
- fit_breakdown : UNE entrée par critère du poste (utilise le label exact). score 0-100, level (excellent/solid/partial/gap), statement (1 phrase concrète "Maîtrise X mais aucune expérience démontrée sur Y"), citation + message_id.
- signals : signaux à creuser ou questions à reposer en entretien physique. Chacun = label, severity, description, citation, ET suggested_question (la question précise à poser pour lever le doute).
- communication_profile : scores 0-10 sur clarity, structure, concision, posture, energy. Chaque dim a un commentaire 1 ligne et idéalement une citation.
- question_evaluations : OBLIGATOIRE. Tu DOIS retourner UNE entrée pour CHAQUE question posée (indexée par "0","1","2"… dans l'ordre des questions ci-dessus), même si la réponse du candidat est vague, courte, hors-sujet ou absente. Ne saute jamais une question. Pour chaque question : question (texte exact), score 0-10 (voir grille ci-dessous), summary (1 phrase qui résume la réponse du candidat), comment (1-2 phrases d'analyse), key_quote, evidence_message_id, depth_level (surface/concret/expert), had_followup (true si une relance a été déclenchée), followup_helped (true si la relance a fait progresser la réponse).
  Grille de notation /10 (selon ton impression globale : clarté + pertinence + profondeur) :
  • 1-3 : réponse absente, hors-sujet, ou très superficielle
  • 4-6 : réponse correcte mais générique, peu d'exemples concrets
  • 7-8 : réponse claire avec exemples concrets et structure
  • 9-10 : réponse experte, structurée, démonstrative

Champs secondaires (toujours produits, format inchangé) :
- executive_summary : 3-5 phrases bilan global
- overall_score : 0-100 (cohérent avec recommendation)
- overall_grade : A/B/C/D/E
- personality_profile (Big Five) : OBLIGATOIRE. Tu dois TOUJOURS retourner les 5 traits (openness, conscientiousness, extraversion, agreeableness, emotional_stability) avec un score 0-100 et une confidence (low/medium/high). Si la transcription est courte ou les indices faibles, mets confidence à "low" et un score neutre proche de 50, mais ne saute jamais ce bloc. Fournis 1 à 2 evidences par trait quand c'est possible.
- soft_skills : 3 à 6 entrées avec quote + evidence_message_id obligatoires.
- highlights : 3 moments forts à montrer. Chaque entrée : question_index (0-based), kind (force/personnalite/vigilance), label (max 60 car), why, start_seconds / end_seconds DANS la réponse vidéo de la question (commence à 0, durée 10-30 s). Diversifie les kinds.`;

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
              description: "Produit le rapport de décision structuré",
              parameters: {
                type: "object",
                properties: {
                  // ===== Nouveaux champs orientés décision =====
                  verdict_headline: {
                    type: "string",
                    description: "Une phrase de manager, max 100 caractères",
                  },
                  decision_drivers: {
                    type: "array",
                    description: "2 à 4 raisons clés derrière la recommandation",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Max 80 caractères" },
                        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                        quote: { type: "string" },
                        message_id: { type: "string" },
                        start_seconds: { type: "number" },
                      },
                      required: ["label", "sentiment"],
                    },
                  },
                  fit_breakdown: {
                    type: "array",
                    description: "Une entrée par critère du poste",
                    items: {
                      type: "object",
                      properties: {
                        criterion: { type: "string", description: "Label exact du critère" },
                        score: { type: "number", minimum: 0, maximum: 100 },
                        level: { type: "string", enum: ["excellent", "solid", "partial", "gap"] },
                        statement: { type: "string", description: "1 phrase concrète" },
                        quote: { type: "string" },
                        message_id: { type: "string" },
                        start_seconds: { type: "number" },
                      },
                      required: ["criterion", "score", "statement"],
                    },
                  },
                  signals: {
                    type: "array",
                    description: "Signaux à creuser, fusion red_flags + followup_questions",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        quote: { type: "string" },
                        message_id: { type: "string" },
                        start_seconds: { type: "number" },
                        suggested_question: {
                          type: "string",
                          description: "Question précise à poser en entretien physique",
                        },
                      },
                      required: ["label", "severity"],
                    },
                  },
                  communication_profile: {
                    type: "object",
                    properties: {
                      clarity: dimensionSchema(),
                      structure: dimensionSchema(),
                      concision: dimensionSchema(),
                      posture: dimensionSchema(),
                      energy: dimensionSchema(),
                    },
                  },
                  // ===== Champs conservés (legacy) =====
                  executive_summary: { type: "string" },
                  overall_score: { type: "number", minimum: 0, maximum: 100 },
                  overall_grade: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                  recommendation: { type: "string", enum: ["strong_yes", "yes", "maybe", "no"] },
                  question_evaluations: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        score: { type: "number", minimum: 0, maximum: 10 },
                        summary: { type: "string", description: "1 phrase qui résume la réponse" },
                        comment: { type: "string" },
                        key_quote: { type: "string" },
                        evidence_message_id: { type: "string" },
                        evidence_start_seconds: { type: "number" },
                        depth_level: { type: "string", enum: ["surface", "concret", "expert"] },
                        had_followup: { type: "boolean" },
                        followup_helped: { type: "boolean" },
                      },
                    },
                  },
                  personality_profile: personalityProfileSchema(),
                  soft_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        score: { type: "number", minimum: 0, maximum: 10 },
                        quote: { type: "string" },
                        evidence_message_id: { type: "string" },
                        evidence_start_seconds: { type: "number" },
                      },
                      required: ["skill", "quote"],
                    },
                  },
                  highlights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_index: { type: "integer" },
                        kind: { type: "string", enum: ["force", "personnalite", "vigilance"] },
                        label: { type: "string" },
                        why: { type: "string" },
                        start_seconds: { type: "number" },
                        end_seconds: { type: "number" },
                      },
                      required: ["question_index", "kind", "label", "start_seconds", "end_seconds"],
                    },
                  },
                },
                required: [
                  "verdict_headline",
                  "decision_drivers",
                  "fit_breakdown",
                  "executive_summary",
                  "overall_score",
                  "recommendation",
                  "question_evaluations",
                  "communication_profile",
                  "personality_profile",
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

    // ============================================================
    // NOUVEAU : fit_breakdown — mappé sur les critères réels du projet
    // ============================================================
    const fitBreakdown: Array<Record<string, unknown>> = [];
    const aiFit = Array.isArray(parsed.fit_breakdown) ? parsed.fit_breakdown : [];

    if (criteria.length > 0) {
      // On essaie d'aligner sur les critères réels par label puis par index
      const byLabel = new Map<string, any>();
      aiFit.forEach((f: any) => {
        if (f?.criterion) byLabel.set(String(f.criterion).toLowerCase().trim(), f);
      });
      criteria.forEach((c: any, idx: number) => {
        const aiEntry =
          byLabel.get(String(c.label).toLowerCase().trim()) ?? aiFit[idx] ?? null;
        const score = Math.max(0, Math.min(100, Number(aiEntry?.score) || 0));
        fitBreakdown.push({
          criterion_id: c.id,
          criterion: c.label,
          score,
          level: aiEntry?.level || null,
          statement: aiEntry?.statement || aiEntry?.comment || "",
          quote: aiEntry?.quote || null,
          message_id: aiEntry?.message_id || null,
          start_seconds: typeof aiEntry?.start_seconds === "number" ? aiEntry.start_seconds : null,
        });
      });
    } else {
      // Pas de critères définis sur le projet : on garde tel quel
      aiFit.forEach((f: any) => {
        fitBreakdown.push({
          criterion: f?.criterion || "Critère",
          score: Math.max(0, Math.min(100, Number(f?.score) || 0)),
          level: f?.level || null,
          statement: f?.statement || "",
          quote: f?.quote || null,
          message_id: f?.message_id || null,
          start_seconds: typeof f?.start_seconds === "number" ? f.start_seconds : null,
        });
      });
    }

    // Calcul du fit_score global pondéré (poids critères)
    let fitScore: number | null = null;
    if (fitBreakdown.length > 0) {
      const weights = criteria.length > 0 ? criteria.map((c: any) => Math.max(1, Number(c.weight) || 1)) : fitBreakdown.map(() => 1);
      const totalWeight = weights.reduce((a: number, b: number) => a + b, 0);
      const weighted = fitBreakdown.reduce((acc, f, i) => acc + (Number(f.score) || 0) * (weights[i] || 1), 0);
      fitScore = Math.round(weighted / Math.max(1, totalWeight));
    }

    // On reconstruit aussi l'ancien criteria_scores pour rester compatible avec
    // les rapports existants et les emails déjà branchés
    let criteriaScores: Record<string, any> = {};
    if (criteria.length > 0) {
      criteria.forEach((c: any, idx: number) => {
        const entry = fitBreakdown[idx];
        if (!entry) return;
        const maxScale = c.scoring_scale === "0-10" ? 10 : 5;
        const score = Math.round(((Number(entry.score) || 0) / 100) * maxScale);
        criteriaScores[c.id] = {
          label: c.label,
          score,
          max: maxScale,
          comment: entry.statement || "",
        };
      });
    }

    // ============================================================
    // Stats + Best-of (highlight clips)
    // ============================================================
    const candidateMessages = messages.filter((m: any) => m.role === "candidate");
    const aiMessages = messages.filter((m: any) => m.role === "ai");
    const candidateVideos = candidateMessages.filter((m: any) => m.video_segment_url);
    // Réponses principales (hors follow-ups) — sert pour matcher les questions du projet
    const mainAnswerVideos = candidateVideos.filter((m: any) => !m.is_follow_up);

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

    // Question evaluations : on garantit une entrée par question, avec score
    // numérique valide (0-10) ou null (= "Non évalué"). Jamais de 0 par défaut.
    let questionEvals: Record<string, any> = parsed.question_evaluations || {};
    const sortedQuestions = [...questions].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );

    const normalizeEval = (entry: any) => {
      if (!entry || typeof entry !== "object") return entry;
      const rawScore = entry.score;
      const numScore = typeof rawScore === "number" && Number.isFinite(rawScore)
        ? Math.max(0, Math.min(10, rawScore))
        : null;
      entry.score = numScore;
      return entry;
    };

    Object.keys(questionEvals).forEach((key) => {
      normalizeEval(questionEvals[key]);
      const idx = parseInt(key);
      if (!Number.isFinite(idx)) return;
      const q = sortedQuestions[idx];
      if (q && !questionEvals[key].question_id) {
        questionEvals[key].question_id = q.id;
      }
    });

    // Identifie les questions sans évaluation (manquantes ou avec score null)
    const missingIndexes: number[] = [];
    sortedQuestions.forEach((_q: any, idx: number) => {
      const entry = questionEvals[String(idx)];
      if (!entry || entry.score === null || entry.score === undefined) {
        missingIndexes.push(idx);
      }
    });

    // Retry ciblé : si l'IA a omis des évaluations, on relance un appel court
    // qui demande UNIQUEMENT les notes manquantes (évite la régénération totale).
    if (missingIndexes.length > 0 && LOVABLE_API_KEY) {
      try {
        const missingQuestionsList = missingIndexes
          .map((i) => `${i}. ${sortedQuestions[i]?.content ?? ""}`)
          .join("\n");
        const retryPrompt = `Tu as oublié d'évaluer certaines questions de cet entretien. Évalue MAINTENANT, et seulement, les questions ci-dessous, en te basant sur la transcription.

Candidat : ${session.candidate_name}
Poste : ${project.job_title}

Questions à évaluer (index → texte) :
${missingQuestionsList}

Transcription complète :
${fullText}

Pour chaque question, retourne :
- question (texte exact)
- score 0-10 (1-3 absente/hors-sujet, 4-6 générique, 7-8 claire avec exemples, 9-10 experte)
- summary (1 phrase qui résume la réponse)
- comment (1-2 phrases d'analyse)
- key_quote (citation exacte si possible)
- depth_level (surface/concret/expert)

Note selon ton impression globale (clarté + pertinence + profondeur). Ne saute aucune question listée.`;

        const retryRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: retryPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "evaluate_questions",
                  description: "Retourne les évaluations par question manquantes",
                  parameters: {
                    type: "object",
                    properties: {
                      question_evaluations: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            score: { type: "number", minimum: 0, maximum: 10 },
                            summary: { type: "string" },
                            comment: { type: "string" },
                            key_quote: { type: "string" },
                            depth_level: { type: "string", enum: ["surface", "concret", "expert"] },
                          },
                          required: ["score", "summary"],
                        },
                      },
                    },
                    required: ["question_evaluations"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "evaluate_questions" } },
          }),
        });

        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryArgs = retryData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const retryParsed = retryArgs
            ? (typeof retryArgs === "string" ? JSON.parse(retryArgs) : retryArgs)
            : null;
          const retryEvals = retryParsed?.question_evaluations || {};
          for (const idx of missingIndexes) {
            const entry = retryEvals[String(idx)];
            if (!entry) continue;
            normalizeEval(entry);
            if (entry.score === null) continue;
            const q = sortedQuestions[idx];
            entry.question = entry.question || q?.content;
            entry.question_id = q?.id;
            questionEvals[String(idx)] = entry;
          }
        } else {
          console.warn("Retry question_evaluations failed:", retryRes.status);
        }
      } catch (e) {
        console.error("Retry question_evaluations error:", e);
      }
    }

    // Fallback final : pour les questions toujours sans évaluation, on insère
    // une entrée avec score=null (affichée "Non évalué" en gris côté front),
    // jamais score=0 (qui s'affichait à tort en rouge).
    sortedQuestions.forEach((q: any, idx: number) => {
      const entry = questionEvals[String(idx)];
      if (!entry) {
        questionEvals[String(idx)] = {
          question: q.content,
          question_id: q.id,
          score: null,
          summary: null,
          comment: null,
        };
      } else if (entry.score === null || entry.score === undefined) {
        entry.score = null;
        entry.question = entry.question || q.content;
        entry.question_id = entry.question_id || q.id;
      }
    });

    // Best/worst question + highlight clips selection — on ignore les entrées
    // sans score (null) pour ne pas désigner une question "Non évaluée" comme
    // la plus faible.
    const evalEntries = Object.entries(questionEvals) as [string, any][];
    const scoredEvals = evalEntries.filter(
      ([, v]) => typeof v?.score === "number" && Number.isFinite(v.score),
    );
    const sortedEvals = [...scoredEvals].sort(
      (a, b) => (Number(b[1]?.score) || 0) - (Number(a[1]?.score) || 0),
    );
    const bestQuestionIdx = sortedEvals.length > 0 ? parseInt(sortedEvals[0][0]) : null;
    const worstQuestionIdx = sortedEvals.length > 0 ? parseInt(sortedEvals[sortedEvals.length - 1][0]) : null;
    const bestQuestionScore = bestQuestionIdx !== null ? Number(sortedEvals[0][1]?.score) : null;

    // Index vidéos par question_id pour un matching fiable
    const videoByQuestionId = new Map<string, any>();
    for (const v of mainAnswerVideos) {
      if (v.question_id && !videoByQuestionId.has(v.question_id)) {
        videoByQuestionId.set(v.question_id, v);
      }
    }

    // Highlights : on privilégie la sélection IA (3 moments variés avec bornes
    // précises). Si l'IA ne renvoie rien d'exploitable, fallback sur l'ancienne
    // logique (top 3 par score, 0–20 s).
    const findVideoForHighlight = (questionIndex: number, questionId?: string) => {
      if (questionId && videoByQuestionId.get(questionId)) return videoByQuestionId.get(questionId);
      return mainAnswerVideos[questionIndex] || candidateVideos[questionIndex];
    };

    const aiHighlights = Array.isArray(parsed.highlights) ? parsed.highlights : [];
    const ALLOWED_KINDS = new Set(["force", "personnalite", "vigilance"]);
    const highlightClips: Array<Record<string, unknown>> = [];

    for (const h of aiHighlights) {
      const idx = Number(h?.question_index);
      if (!Number.isFinite(idx) || idx < 0) continue;
      const evalEntry = questionEvals[String(idx)];
      const video = findVideoForHighlight(idx, evalEntry?.question_id);
      if (!video?.video_segment_url) continue;

      let start = Number(h?.start_seconds);
      let end = Number(h?.end_seconds);
      if (!Number.isFinite(start) || start < 0) start = 0;
      if (!Number.isFinite(end) || end <= start || end - start > 60) {
        end = start + 20;
      }

      const kind = ALLOWED_KINDS.has(h?.kind) ? h.kind : "force";

      highlightClips.push({
        video_url: video.video_segment_url,
        question: evalEntry?.question ?? `Question ${idx + 1}`,
        score: Number(evalEntry?.score) || 0,
        question_index: idx,
        kind,
        label: typeof h?.label === "string" ? h.label.slice(0, 80) : null,
        why: typeof h?.why === "string" ? h.why : null,
        start_seconds: start,
        end_seconds: end,
      });
      if (highlightClips.length >= 3) break;
    }

    // Fallback : si l'IA n'a rien produit, on garde la sélection top 3 par score
    if (highlightClips.length === 0) {
      for (const [key, val] of sortedEvals) {
        const idx = parseInt(key);
        const video = findVideoForHighlight(idx, val?.question_id);
        if (video?.video_segment_url) {
          highlightClips.push({
            video_url: video.video_segment_url,
            question: val?.question ?? `Question ${idx + 1}`,
            score: Number(val?.score) || 0,
            question_index: idx,
            start_seconds: 0,
            end_seconds: 20,
            max_seconds: 20,
          });
        }
        if (highlightClips.length >= 3) break;
      }
    }

    // ============================================================
    // Recalcul des start_seconds par méthode proportionnelle :
    // position du 1er mot de la citation dans la transcription du message,
    // ramenée à la durée du clip. Aucun fallback IA.
    // ============================================================
    const { resolveStartFactory } = await import("../_shared/resolve-start-seconds.ts");
    const resolveStart = resolveStartFactory(messages as any[]);

    const fixEntry = (e: any, msgKey = "message_id", tsKey = "start_seconds", quoteKey = "quote") => {
      if (!e || typeof e !== "object") return;
      e[tsKey] = resolveStart(e[msgKey], e[quoteKey] ?? e.citation ?? e.key_quote);
    };

    // decision_drivers, signals
    const driversArr = Array.isArray(parsed.decision_drivers) ? parsed.decision_drivers : [];
    driversArr.forEach((e: any) => fixEntry(e, "message_id", "start_seconds", "quote"));
    const signalsArr = Array.isArray(parsed.signals) ? parsed.signals : [];
    signalsArr.forEach((e: any) => fixEntry(e, "message_id", "start_seconds", "quote"));

    // fit_breakdown (déjà construit plus haut)
    fitBreakdown.forEach((e: any) => {
      e.start_seconds = resolveStart(e.message_id, e.quote);
    });

    // communication_profile.dimensions
    const commProfile = parsed.communication_profile;
    if (commProfile && typeof commProfile === "object") {
      for (const k of Object.keys(commProfile)) {
        const dim = commProfile[k];
        if (dim && typeof dim === "object") fixEntry(dim, "message_id", "start_seconds", "quote");
      }
    }

    // soft_skills (clé spécifique evidence_*)
    if (Array.isArray(parsed.soft_skills)) {
      parsed.soft_skills.forEach((e: any) => {
        if (!e || typeof e !== "object") return;
        e.evidence_start_seconds = resolveStart(
          e.evidence_message_id,
          e.evidence_quote ?? e.quote,
        );
      });
    }

    // red_flags
    if (Array.isArray(parsed.red_flags)) {
      parsed.red_flags.forEach((e: any) => fixEntry(e, "message_id", "start_seconds", "quote"));
    }

    // personality_profile.<trait>.evidences
    if (parsed.personality_profile && typeof parsed.personality_profile === "object") {
      for (const trait of PERSONALITY_TRAITS) {
        const t = (parsed.personality_profile as any)[trait];
        if (t && Array.isArray(t.evidences)) {
          t.evidences.forEach((e: any) => fixEntry(e, "message_id", "start_seconds", "quote"));
        }
      }
    }

    // paraverbal_analysis.dimensions (si déjà présent dans parsed)
    const para = parsed.paraverbal_analysis;
    if (para && Array.isArray(para.dimensions)) {
      para.dimensions.forEach((d: any) => fixEntry(d, "evidence_message_id", "evidence_start_seconds", "evidence_quote"));
    }

    // question_evaluations : chaque entrée a key_quote + evidence_message_id
    Object.values(questionEvals).forEach((entry: any) => {
      if (!entry || typeof entry !== "object") return;
      entry.evidence_start_seconds = resolveStart(
        entry.evidence_message_id,
        entry.key_quote,
      );
    });

    // Note hybride : moyenne note IA globale + score critères pondéré
    const aiOverallScore = Math.min(Math.max(Number(parsed.overall_score) || 0, 0), 100);
    const finalOverallScore =
      fitScore !== null
        ? Math.round(Math.min(100, Math.max(0, (aiOverallScore + fitScore) / 2)))
        : aiOverallScore;

    const stats = {
      duration_seconds: session.duration_seconds || 0,
      exchanges_count: messages.length,
      video_answers_count: candidateVideos.length,
      ai_followups: aiFollowups,
      candidate_speech_chars: candidateSpeechChars,
      avg_criteria_score: Number(avgCriteriaScore.toFixed(2)),
      best_question_idx: bestQuestionIdx,
      worst_question_idx: worstQuestionIdx,
      // ===== NOUVEAU : champs orientés décision (stockés ici pour éviter une migration) =====
      verdict_headline: parsed.verdict_headline || null,
      decision_drivers: Array.isArray(parsed.decision_drivers) ? parsed.decision_drivers : [],
      fit_breakdown: fitBreakdown,
      fit_score: fitScore,
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      communication_profile: parsed.communication_profile || null,
      score_breakdown: {
        ai_score: aiOverallScore,
        weighted_criteria_score: fitScore,
        final_score: finalOverallScore,
        method: "hybrid_v1",
      },
      timestamps_algo_version: 2,
    };

    // Filet de sécurité : garantir un personality_profile complet
    const incomingProfile = parsed.personality_profile;
    const missingTraits = !incomingProfile || typeof incomingProfile !== "object"
      || PERSONALITY_TRAITS.some((t) => !incomingProfile[t] || typeof incomingProfile[t].score !== "number");
    if (missingTraits) {
      console.warn("[generate-report] personality_profile incomplet, application du fallback", {
        session_id,
        had_profile: !!incomingProfile,
      });
    }
    const personalityProfile = buildFallbackPersonalityProfile(incomingProfile);

    // Save report
    const { data: insertedReport, error: reportError } = await supabase.from("reports").insert({
      session_id,
      executive_summary: parsed.executive_summary || "",
      executive_summary_short: parsed.verdict_headline || parsed.executive_summary_short || null,
      overall_score: finalOverallScore,
      overall_grade: parsed.overall_grade || null,
      recommendation: parsed.recommendation || null,
      strengths: parsed.strengths || [],
      areas_for_improvement: parsed.areas_for_improvement || [],
      criteria_scores: criteriaScores,
      question_evaluations: questionEvals,
      personality_profile: personalityProfile,
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

    // Send email to assigned user (fallback: project creator, then org owner)
    try {
      let recipientUserId: string | null = session.assigned_to ?? project.created_by ?? null;
      if (!recipientUserId && project.organization_id) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("owner_id")
          .eq("id", project.organization_id)
          .maybeSingle();
        recipientUserId = orgRow?.owner_id ?? null;
      }

      const { data: recruiterProfile } = recipientUserId
        ? await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", recipientUserId)
            .maybeSingle()
        : { data: null };

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
          overallScore: finalOverallScore,
          overallGrade: parsed.overall_grade || null,
          recommendation: parsed.recommendation || null,
          executiveSummary: parsed.executive_summary || "",
          executiveSummaryShort: parsed.executive_summary_short || null,
          personalityProfile,
          followupQuestions: parsed.followup_questions || null,
          strengths: parsed.strengths || [],
          areasForImprovement: parsed.areas_for_improvement || [],
          criteriaScores,
          questionEvaluations: questionEvals,
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

    // Analyse para-verbale (audio) en arrière-plan, systématique.
    // EdgeRuntime.waitUntil garantit que le fetch part même après le return.
    try {
      const paraverbalPromise = fetch(`${SUPABASE_URL}/functions/v1/analyze-paraverbal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ session_id, force: true }),
      })
        .then((r) => console.log("analyze-paraverbal triggered:", r.status))
        .catch((e) => console.warn("analyze-paraverbal trigger failed:", e));
      // @ts-ignore - EdgeRuntime est fourni par Supabase Edge Runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(paraverbalPromise);
      }
    } catch (e) {
      console.warn("analyze-paraverbal trigger threw:", e);
    }

    // Analyse non-verbale (vidéo) en arrière-plan, systématique.
    try {
      const nonverbalPromise = fetch(`${SUPABASE_URL}/functions/v1/analyze-nonverbal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ session_id, force: true }),
      })
        .then((r) => console.log("analyze-nonverbal triggered:", r.status))
        .catch((e) => console.warn("analyze-nonverbal trigger failed:", e));
      // @ts-ignore - EdgeRuntime fourni par Supabase Edge Runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(nonverbalPromise);
      }
    } catch (e) {
      console.warn("analyze-nonverbal trigger threw:", e);
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
