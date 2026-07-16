// Génère une matrice Fit Poste détaillée : pour chaque question × chaque critère,
// une note 0-100 + une justification courte + une citation. Résultat stocké dans
// reports.stats.fit_matrix. Fonction dédiée : appelée en fin de generate-report
// pour les nouveaux rapports, et à la demande via le bouton "Voir les détails"
// pour les rapports existants qui n'ont pas encore la matrice.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCallerOrInternal } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const caller = await requireCallerOrInternal(req, corsHeaders);
  if (!caller.ok) return caller.response;

  try {
    const { session_id, force } = await req.json().catch(() => ({}));
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [sessionRes, messagesRes, reportRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, projects(*, evaluation_criteria(*), questions(*))")
        .eq("id", session_id)
        .single(),
      supabase
        .from("session_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("timestamp"),
      supabase
        .from("reports")
        .select("id, stats, overall_score")
        .eq("session_id", session_id)
        .maybeSingle(),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reportRes.data) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingStats = (reportRes.data.stats as Record<string, any>) ?? {};
    if (
      !force &&
      existingStats.fit_matrix &&
      Array.isArray(existingStats.fit_matrix?.rows) &&
      existingStats.fit_matrix.rows.length > 0
    ) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const session = sessionRes.data;
    const project = session.projects as any;
    const messages = messagesRes.data ?? [];
    const criteria = (project?.evaluation_criteria ?? []) as any[];
    const questions = ((project?.questions ?? []) as any[])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    if (criteria.length === 0 || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "missing_criteria_or_questions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Groupement des réponses candidat par question.
    const answersByQuestionId = new Map<string, any[]>();
    for (const m of messages) {
      if (m.role !== "candidate" || !m.question_id) continue;
      const arr = answersByQuestionId.get(m.question_id) ?? [];
      arr.push(m);
      answersByQuestionId.set(m.question_id, arr);
    }

    const answersBlock = questions
      .map((q: any, i: number) => {
        const answers = (answersByQuestionId.get(q.id) ?? [])
          .map(
            (m: any) =>
              `[id=${m.id}${m.is_follow_up ? " · relance" : ""}] ${
                (m.content ?? "").trim() || "(aucune transcription)"
              }`,
          )
          .join("\n");
        return `Q${i + 1} : ${q.content}\n${answers || "(aucune réponse enregistrée)"}`;
      })
      .join("\n\n");

    const criteriaBlock = criteria
      .map(
        (c: any) =>
          `- ${c.label} (poids ${c.weight}%)${c.description ? ` : ${c.description}` : ""}`,
      )
      .join("\n");

    const systemPrompt = `Tu es un expert en recrutement. Tu produis une matrice détaillée d'évaluation : pour chaque question posée, tu notes chaque critère du poste sur 0 à 100 en te basant UNIQUEMENT sur ce que le candidat a dit dans sa réponse à cette question. Tu es factuel et tu cites systématiquement la phrase du candidat qui justifie la note.`;

    const userPrompt = `Poste : ${project.job_title}
Candidat : ${session.candidate_name}

Critères d'évaluation :
${criteriaBlock}

Réponses du candidat, question par question :
${answersBlock}

Règles :
1. Pour chaque couple (question, critère), base-toi UNIQUEMENT sur la réponse à cette question, pas sur la session entière.
2. Choisis obligatoirement une valeur "evidence" :
   - "none" : la réponse ne contient aucun élément pour évaluer ce critère. Le score sera automatiquement fixé à 50 (neutre) côté serveur ; ne cherche pas à deviner.
   - "clear" : la réponse contient un élément concret pour évaluer ce critère. Donne alors un score de 0 à 100 selon ton interprétation, et cite la phrase précise du candidat dans "quote".
3. Justification = 1 phrase concrète (max 140 caractères), pas de jargon RH.
4. Avec "clear", fournis "quote" (extrait exact) et si possible "message_id". N'invente jamais un message_id.

Renvoie la matrice avec l'outil fit_matrix.`;

    const cellSchema = {
      type: "object",
      properties: {
        criterion: { type: "string", description: "Label exact du critère" },
        evidence: { type: "string", enum: ["none", "clear"], description: "none = aucun élément, clear = élément présent" },
        score: { type: "number", minimum: 0, maximum: 100, description: "Ignoré si evidence=none (forcé à 50)" },
        justification: { type: "string", description: "1 phrase, max 140 caractères" },
        quote: { type: "string" },
        message_id: { type: "string" },
      },
      required: ["criterion", "evidence", "score", "justification"],
    };

    const rowSchema = {
      type: "object",
      properties: {
        question_index: { type: "integer", minimum: 0 },
        cells: { type: "array", items: cellSchema },
      },
      required: ["question_index", "cells"],
    };

    const bodyBase = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "fit_matrix",
            description: "Matrice de notes par question et par critère",
            parameters: {
              type: "object",
              properties: { rows: { type: "array", items: rowSchema } },
              required: ["rows"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "fit_matrix" } },
      max_tokens: 8192,
    };

    let parsed: any = null;
    let lastErr: string | null = null;
    for (const model of ["google/gemini-2.5-flash", "google/gemini-2.5-pro"]) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...bodyBase, model }),
        });
        if (!r.ok) {
          const txt = await r.text();
          lastErr = `HTTP ${r.status} ${txt.slice(0, 200)}`;
          if (r.status === 429 || r.status === 402) {
            return new Response(
              JSON.stringify({
                error: r.status === 429 ? "Limite IA atteinte" : "Crédits IA épuisés",
              }),
              { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          continue;
        }
        const data = await r.json();
        const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) {
          lastErr = "no_tool_call";
          continue;
        }
        parsed = typeof args === "string" ? JSON.parse(args) : args;
        if (Array.isArray(parsed?.rows) && parsed.rows.length > 0) break;
        lastErr = "empty_rows";
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    if (!parsed || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      console.error("[generate-fit-matrix] AI failed", lastErr);
      return new Response(
        JSON.stringify({ error: "ai_failed", detail: lastErr }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalisation : matrice indexée par question_id + criterion_id.
    const rows: Array<any> = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const aiRow =
        parsed.rows.find((r: any) => Number(r?.question_index) === i) ?? parsed.rows[i] ?? null;
      const aiCells = Array.isArray(aiRow?.cells) ? aiRow.cells : [];
      const cells: Record<string, any> = {};
      for (let j = 0; j < criteria.length; j++) {
        const c = criteria[j];
        const aiCell =
          aiCells.find(
            (x: any) =>
              String(x?.criterion ?? "").toLowerCase().trim() ===
              String(c.label).toLowerCase().trim(),
          ) ??
          aiCells[j] ??
          null;
        const evidence = String(aiCell?.evidence ?? "").toLowerCase();
        if (evidence === "none") {
          cells[c.id] = {
            score: 50,
            justification: "Aucun élément dans la réponse pour évaluer ce critère.",
          };
        } else if (evidence === "clear") {
          const rawScore = aiCell ? Number(aiCell.score) : NaN;
          if (!Number.isFinite(rawScore)) {
            cells[c.id] = { score: 50, justification: "Aucun élément dans la réponse pour évaluer ce critère." };
          } else {
            cells[c.id] = {
              score: Math.max(0, Math.min(100, Math.round(rawScore))),
              justification: String(aiCell?.justification ?? "").slice(0, 400),
              quote: aiCell?.quote ? String(aiCell.quote).slice(0, 400) : undefined,
              message_id: aiCell?.message_id ? String(aiCell.message_id) : undefined,
            };
          }
        } else {
          // evidence absent/invalide → fallback neutre
          cells[c.id] = {
            score: 50,
            justification: "Aucun élément dans la réponse pour évaluer ce critère.",
          };
        }
      }
      rows.push({
        question_id: q.id,
        question_index: i,
        question_title: q.title ?? null,
        question_content: q.content,
        cells,
      });
    }

    // Moyenne par critère (colonne) — toutes les cases avec un score numérique comptent,
    // y compris les scores neutres par défaut (50) posés quand l'IA n'a rien à noter.
    const criterion_averages: Record<string, number | null> = {};
    for (const c of criteria) {
      const vals: number[] = [];
      for (const r of rows) {
        const s = r.cells[c.id]?.score;
        if (typeof s === "number" && Number.isFinite(s)) vals.push(s);
      }
      criterion_averages[c.id] = vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;
    }

    // Fit score global = moyenne pondérée des moyennes-critères (par le poids du critère).
    // Les critères sans aucune note sont exclus du dénominateur.
    let matrixFitScore: number | null = null;
    let sumWeighted = 0;
    let sumWeights = 0;
    for (const c of criteria) {
      const avg = criterion_averages[c.id];
      if (avg === null) continue;
      const w = Math.max(0, Number(c.weight) || 0);
      if (w <= 0) continue;
      sumWeighted += avg * w;
      sumWeights += w;
    }
    if (sumWeights > 0) {
      matrixFitScore = Math.round(sumWeighted / sumWeights);
    }

    const fit_matrix = {
      version: 2,
      generated_at: new Date().toISOString(),
      criteria: criteria.map((c: any) => ({
        id: c.id,
        label: c.label,
        weight: Number(c.weight) || 0,
      })),
      rows,
      criterion_averages,
    };

    const recommendationFromScore = (score: number) => {
      if (score >= 80) return "strong_yes";
      if (score >= 65) return "yes";
      if (score >= 45) return "maybe";
      return "no";
    };

    const nextStats: Record<string, any> = { ...existingStats, fit_matrix };
    const reportPatch: Record<string, any> = { stats: nextStats };
    if (matrixFitScore !== null) {
      nextStats.fit_score = matrixFitScore;
      const prevBreakdown = (existingStats?.score_breakdown ?? {}) as Record<string, any>;
      const aiScore = Number.isFinite(Number(prevBreakdown.ai_score))
        ? Math.max(0, Math.min(100, Number(prevBreakdown.ai_score)))
        : Math.max(0, Math.min(100, Number(reportRes.data.overall_score) || matrixFitScore));
      const finalScore = matrixFitScore;
      nextStats.score_breakdown = {
        ...prevBreakdown,
        ai_score: aiScore,
        weighted_criteria_score: matrixFitScore,
        final_score: finalScore,
        fit_score_source: "fit_matrix",
        method: "matrix_v2",
      };
      reportPatch.overall_score = finalScore;
      reportPatch.recommendation = recommendationFromScore(finalScore);
      reportPatch.criteria_scores = criteria.reduce((acc: Record<string, any>, c: any) => {
        const avg = criterion_averages[c.id];
        if (typeof avg !== "number") return acc;
        const maxScale = c.scoring_scale === "0-10" ? 10 : 5;
        acc[c.id] = {
          label: c.label,
          score: Math.round((avg / 100) * maxScale),
          max: maxScale,
          comment: "Moyenne issue de la matrice détaillée.",
        };
        return acc;
      }, {});
    }

    const { error: updateError } = await supabase
      .from("reports")
      .update(reportPatch)
      .eq("id", reportRes.data.id);

    if (updateError) {
      console.error("[generate-fit-matrix] update error", updateError);
      return new Response(
        JSON.stringify({ error: "update_failed", detail: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, rows: rows.length, criteria: criteria.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-fit-matrix] fatal", e);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        detail: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
