// Edge function : copilote IA recruteur
// POST { threadId, userMessage } -> { assistantMessage: { id, content, created_at } }
// - vérifie le JWT
// - vérifie que le thread appartient à l'utilisateur
// - charge le contexte projet + rapports de toutes les sessions
// - appelle Lovable AI Gateway (gemini-3-flash-preview)
// - persiste le message user et la réponse assistant
// - retourne le message assistant

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MAX_HISTORY = 30; // nb de messages chargés en contexte
const MAX_USER_LEN = 4000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(project: any, criteria: any[], reports: any[]): string {
  const lines: string[] = [];
  lines.push(
    `Tu es un assistant IA expert en recrutement, sobre, factuel, qui aide un recruteur à analyser les candidatures du projet "${project?.title ?? "—"}" (poste : ${project?.job_title ?? "—"}).`,
  );
  lines.push(
    "Réponds toujours en français, de façon concise et structurée (Markdown : titres courts, listes, tableaux quand pertinent).",
  );
  lines.push(
    "Appuie tes réponses uniquement sur les données fournies ci-dessous. Si tu n'as pas l'info, dis-le clairement.",
  );
  lines.push(
    "Cite toujours les candidats par leur nom. Refuse poliment toute comparaison fondée sur des critères discriminatoires (origine, âge, genre, religion, apparence physique, situation familiale, etc.).",
  );

  if (criteria.length > 0) {
    lines.push("\n## Critères d'évaluation du projet");
    for (const c of criteria) {
      lines.push(`- **${c.label}** (poids ${c.weight ?? 0}) : ${c.description ?? ""}`.trim());
    }
  }

  lines.push(`\n## Candidats évalués (${reports.length})`);
  if (reports.length === 0) {
    lines.push("Aucun rapport d'évaluation disponible pour le moment.");
  } else {
    for (const r of reports) {
      const name = r.candidate_name || r.candidate_email || "Candidat anonyme";
      lines.push(`\n### ${name}`);
      if (typeof r.overall_score === "number") {
        lines.push(`- Score global : **${r.overall_score}/10**${r.overall_grade ? ` (${r.overall_grade})` : ""}`);
      }
      if (r.recommendation) lines.push(`- Recommandation IA : ${r.recommendation}`);
      if (r.recruiter_decision && r.recruiter_decision !== "none") {
        lines.push(`- Décision recruteur : ${r.recruiter_decision}`);
      }
      if (r.executive_summary_short) {
        lines.push(`- Résumé : ${r.executive_summary_short}`);
      } else if (r.executive_summary) {
        lines.push(`- Résumé : ${String(r.executive_summary).slice(0, 400)}`);
      }
      if (Array.isArray(r.strengths) && r.strengths.length) {
        lines.push(`- Forces : ${r.strengths.slice(0, 5).join(" ; ")}`);
      }
      if (Array.isArray(r.areas_for_improvement) && r.areas_for_improvement.length) {
        lines.push(`- Axes d'amélioration : ${r.areas_for_improvement.slice(0, 5).join(" ; ")}`);
      }
      if (r.criteria_scores && typeof r.criteria_scores === "object") {
        const entries = Object.entries(r.criteria_scores).slice(0, 8);
        if (entries.length) {
          const fmt = entries
            .map(([k, v]: [string, any]) => {
              const score = typeof v === "number" ? v : v?.score;
              return score != null ? `${k}: ${score}` : null;
            })
            .filter(Boolean)
            .join(" · ");
          if (fmt) lines.push(`- Scores critères : ${fmt}`);
        }
      }
      if (r.soft_skills && typeof r.soft_skills === "object") {
        const ss = Object.entries(r.soft_skills).slice(0, 6)
          .map(([k, v]: [string, any]) => {
            const score = typeof v === "number" ? v : v?.score;
            return score != null ? `${k}: ${score}` : null;
          })
          .filter(Boolean)
          .join(" · ");
        if (ss) lines.push(`- Soft skills : ${ss}`);
      }
      if (Array.isArray(r.red_flags) && r.red_flags.length) {
        const rf = r.red_flags.slice(0, 3).map((f: any) => f?.label || f?.text || String(f)).join(" ; ");
        lines.push(`- Points de vigilance : ${rf}`);
      }
      if (r.recruiter_note) {
        lines.push(`- Note du recruteur : ${String(r.recruiter_note).slice(0, 200)}`);
      }
    }
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "Non authentifié" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const threadId: string | undefined = body?.threadId;
    const userMessage: string = String(body?.userMessage ?? "").trim().slice(0, MAX_USER_LEN);
    if (!threadId || !userMessage) {
      return jsonResponse({ error: "threadId et userMessage requis" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Vérification du thread + propriété
    const { data: thread, error: threadErr } = await admin
      .from("copilot_threads")
      .select("id, project_id, created_by, title")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr || !thread) return jsonResponse({ error: "Thread introuvable" }, 404);
    if (thread.created_by !== userId) return jsonResponse({ error: "Accès refusé" }, 403);

    // Insertion du message user
    const { data: insertedUser, error: insUserErr } = await admin
      .from("copilot_messages")
      .insert({ thread_id: threadId, role: "user", content: userMessage })
      .select("id, created_at")
      .single();
    if (insUserErr) return jsonResponse({ error: "Erreur sauvegarde message" }, 500);

    // Charge contexte projet + critères + rapports
    const [{ data: project }, { data: criteria }, { data: sessionsData }] = await Promise.all([
      admin.from("projects").select("id, title, job_title").eq("id", thread.project_id).maybeSingle(),
      admin.from("evaluation_criteria").select("label, description, weight").eq("project_id", thread.project_id).order("order_index"),
      admin
        .from("sessions")
        .select(
          "id, candidate_name, candidate_email, recruiter_decision, recruiter_note, reports(overall_score, overall_grade, recommendation, executive_summary, executive_summary_short, strengths, areas_for_improvement, criteria_scores, soft_skills, red_flags)",
        )
        .eq("project_id", thread.project_id),
    ]);

    const reports = (sessionsData ?? [])
      .filter((s: any) => s.reports)
      .map((s: any) => ({
        candidate_name: s.candidate_name,
        candidate_email: s.candidate_email,
        recruiter_decision: s.recruiter_decision,
        recruiter_note: s.recruiter_note,
        ...(Array.isArray(s.reports) ? s.reports[0] : s.reports),
      }));

    // Charge l'historique de la conversation (les N derniers, ordre chronologique)
    const { data: history } = await admin
      .from("copilot_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);
    const chronological = (history ?? []).reverse();

    const systemPrompt = buildSystemPrompt(project, criteria ?? [], reports);

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...chronological.map((m) => ({ role: m.role, content: m.content })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }, 402);
      return jsonResponse({ error: "Erreur du service IA" }, 502);
    }

    const aiData = await aiResp.json();
    const assistantContent: string =
      aiData?.choices?.[0]?.message?.content?.trim() ||
      "Désolé, je n'ai pas pu générer de réponse.";

    // Insertion du message assistant
    const { data: insertedAi, error: insAiErr } = await admin
      .from("copilot_messages")
      .insert({ thread_id: threadId, role: "assistant", content: assistantContent })
      .select("id, content, created_at")
      .single();
    if (insAiErr) {
      console.error("Erreur insertion message assistant", insAiErr);
      return jsonResponse({ error: "Erreur sauvegarde réponse" }, 500);
    }

    // Génère le titre du thread depuis le 1er message si encore par défaut
    if (thread.title === "Nouvelle conversation") {
      const newTitle = userMessage.replace(/\s+/g, " ").slice(0, 60);
      await admin
        .from("copilot_threads")
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", threadId);
    } else {
      await admin
        .from("copilot_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    }

    return jsonResponse({
      userMessageId: insertedUser.id,
      assistantMessage: insertedAi,
    });
  } catch (e) {
    console.error("copilot-chat error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
