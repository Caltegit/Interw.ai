// Envoi du récap hebdomadaire des entretiens par projet.
// Déclenché par pg_cron tous les lundis (08:00 et 09:00 UTC).
// La fonction vérifie l'heure locale Europe/Paris et ne s'exécute qu'à 10h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RECO_LABEL: Record<string, string> = {
  strong_yes: "À recommander fortement",
  yes: "À recommander",
  maybe: "À considérer",
  no: "À écarter",
};

function parisHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}

function formatDateParis(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function isoWeekKey(date = new Date()): string {
  // YYYY-Www (ISO 8601)
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function invokeSendEmail(body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "x-internal-secret": SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("send-transactional-email failed", res.status, t);
  }
}

async function processProject(
  supabase: ReturnType<typeof createClient>,
  project: {
    id: string;
    title: string;
    job_title: string;
    report_recipient_user_ids: string[];
  },
  weekKey: string,
  sinceIso: string,
) {
  // Sessions complétées des 7 derniers jours + leur rapport (jointure).
  const { data: weekSessions, error: wErr } = await supabase
    .from("sessions")
    .select(
      "id, candidate_name, candidate_email, completed_at, reports(overall_score, recommendation)",
    )
    .eq("project_id", project.id)
    .eq("status", "completed")
    .gte("completed_at", sinceIso)
    .order("completed_at", { ascending: false });
  if (wErr) {
    console.error("weekly-recap: sessions query failed", project.id, wErr);
    return;
  }
  if (!weekSessions || weekSessions.length === 0) {
    return; // Pas d'activité → pas d'email pour ce projet
  }

  // Stats cumulées (toutes les sessions complétées du projet).
  const { data: allSessions } = await supabase
    .from("sessions")
    .select("id, reports(overall_score, recommendation)")
    .eq("project_id", project.id)
    .eq("status", "completed");

  const candidates = weekSessions.map((s: any) => {
    const r = Array.isArray(s.reports) ? s.reports[0] : s.reports;
    return {
      name: s.candidate_name || "—",
      email: s.candidate_email || "",
      date: s.completed_at ? formatDateParis(s.completed_at) : "—",
      score: r?.overall_score != null ? Number(r.overall_score) : null,
      recommendation: r?.recommendation ? (RECO_LABEL[r.recommendation] ?? null) : null,
      reportUrl: `https://interw.ai/sessions/${s.id}`,
    };
  });

  const recCounts = { strong_yes: 0, yes: 0, maybe: 0, no: 0 } as Record<string, number>;
  let sumAll = 0, nAll = 0;
  for (const s of allSessions ?? []) {
    const r: any = Array.isArray((s as any).reports) ? (s as any).reports[0] : (s as any).reports;
    if (!r) continue;
    if (r.overall_score != null) { sumAll += Number(r.overall_score); nAll += 1; }
    if (r.recommendation && recCounts[r.recommendation] !== undefined) {
      recCounts[r.recommendation] += 1;
    }
  }
  let sumWeek = 0, nWeek = 0;
  for (const c of candidates) {
    if (c.score != null) { sumWeek += c.score; nWeek += 1; }
  }
  const stats = {
    totalSessions: (allSessions ?? []).length,
    weekSessions: weekSessions.length,
    averageScore: nAll > 0 ? sumAll / nAll : null,
    weekAverageScore: nWeek > 0 ? sumWeek / nWeek : null,
    recommendations: {
      strong_yes: recCounts.strong_yes,
      yes: recCounts.yes,
      maybe: recCounts.maybe,
      no: recCounts.no,
    },
  };

  // Destinataires (profils)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email, full_name")
    .in("user_id", project.report_recipient_user_ids);

  if (!profiles || profiles.length === 0) return;

  const projectUrl = `https://interw.ai/projects/${project.id}`;
  const jobTitle = project.job_title || project.title || "";

  for (const p of profiles) {
    if (!p.email) continue;
    const firstName = (p.full_name ?? "").trim().split(/\s+/)[0] ?? "";
    await invokeSendEmail({
      templateName: "weekly-project-recap",
      recipientEmail: p.email,
      idempotencyKey: `weekly-recap-${project.id}-${weekKey}-${p.user_id}`,
      templateData: {
        firstName,
        jobTitle,
        projectUrl,
        candidates,
        stats,
      },
    });
  }
}

async function runWeeklyRecaps(force = false) {
  // Garde-fou fuseau : on n'exécute qu'à 10h heure de Paris.
  if (!force && parisHour() !== 10) {
    console.log("weekly-recap: skipping (hour Paris != 10)", parisHour());
    return { skipped: true, parisHour: parisHour() };
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekKey = isoWeekKey();

  // Tous les projets actifs avec au moins 1 destinataire.
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, job_title, report_recipient_user_ids")
    .eq("status", "active")
    .not("report_recipient_user_ids", "is", null);
  if (error) {
    console.error("weekly-recap: projects query failed", error);
    return { error: error.message };
  }
  const filtered = (projects ?? []).filter(
    (p: any) => Array.isArray(p.report_recipient_user_ids) && p.report_recipient_user_ids.length > 0,
  );

  let processed = 0;
  for (const p of filtered) {
    try {
      await processProject(supabase, p as any, weekKey, sinceIso);
      processed += 1;
    } catch (e) {
      console.error("weekly-recap: project failed", (p as any).id, e);
    }
  }
  return { ok: true, projects: filtered.length, processed, weekKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  let force = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      force = !!body?.force;
    } else {
      const url = new URL(req.url);
      force = url.searchParams.get("force") === "1";
    }
  } catch { /* ignore */ }

  // @ts-ignore EdgeRuntime global
  EdgeRuntime.waitUntil(
    runWeeklyRecaps(force).catch((e) => console.error("weekly-recap error", e)),
  );
  return new Response(JSON.stringify({ status: "processing" }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
