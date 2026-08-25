// Rapport quotidien santé produit — envoyé à eva@alboteam.com uniquement.
// Cron : 5h et 6h UTC (couvre 7h Paris été/hiver), déduplication via idempotencyKey.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const HARD_RECIPIENT = "eva@alboteam.com";
const SITE_URL = Deno.env.get("SITE_URL") || "https://interw.ai";

const CRITICAL_FUNCTIONS = [
  "generate-report",
  "generate-fit-matrix",
  "transcribe-session",
  "process-report-queue",
  "backfill-report-timestamps",
  "store-repaired-video",
  "finalize-abandoned-session",
  "send-transactional-email",
  "analyze-nonverbal",
  "cleanup-abandoned-sessions",
  "send-abandon-reminders",
];

const SENSITIVE_PATH_PATTERNS = [
  /supabase\/functions\/generate-/,
  /supabase\/functions\/transcribe-session/,
  /supabase\/functions\/store-repaired-video/,
  /supabase\/functions\/finalize-abandoned-session/,
  /supabase\/migrations\//,
  /src\/pages\/InterviewStart\.tsx/,
  /src\/workers\/videoRepair/,
  /src\/hooks\/useSessionDetail/,
  /src\/components\/session\/SessionReportView/,
  /src\/components\/session\/FitMatrixCard/,
];

interface Ctx {
  supabase: ReturnType<typeof createClient>;
  supabaseUrl: string;
  serviceKey: string;
  periodStart: Date;
  periodEnd: Date;
  hours: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing env" }, 500);
  }

  // Parse params (period_hours + force)
  const url = new URL(req.url);
  let hours = Number(url.searchParams.get("period_hours") ?? "24");
  let force = url.searchParams.get("force") === "1";
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.period_hours) hours = Number(body.period_hours);
      if (body?.force) force = true;
    }
  } catch { /* noop */ }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 14) hours = 24;

  // Timezone guard : n'envoie que si l'heure Paris est 7h (sauf force / rétroactif).
  // Cron programmé à 5h & 6h UTC. Un des deux passera à 7h Paris.
  if (!force && hours <= 24) {
    const parisHour = getParisHour(new Date());
    if (parisHour !== 7) {
      return json({ skipped: true, parisHour });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - hours * 60 * 60 * 1000);
  const ctx: Ctx = { supabase, supabaseUrl, serviceKey, periodStart, periodEnd, hours };

  try {
    const [sessions, reports, jobs, msgs, feedbacks, alerts, purges, edgeStats, commits] = await Promise.all([
      loadSessions(ctx),
      loadReports(ctx),
      loadJobs(ctx),
      loadMessages(ctx),
      loadFeedbacks(ctx),
      loadAlerts(ctx),
      loadPurges(ctx),
      loadEdgeStats(ctx),
      loadCommits(ctx),
    ]);

    const anomalies = buildAnomalies(sessions, reports, jobs, msgs);

    const counters = {
      sessionsStarted: sessions.length,
      sessionsCompleted: sessions.filter((s) => s.status === "completed").length,
      sessionsAbandoned: sessions.filter((s) => s.status === "abandoned" || s.status === "cancelled").length,
      reportsOk: reports.length,
      reportsFailed: jobs.filter((j) => j.status === "failed").length,
      transcriptsOk: msgs.filter((m) => m.transcription_status === "completed").length,
      transcriptsFailed: msgs.filter((m) => ["failed", "too_large"].includes(m.transcription_status ?? "")).length,
      transcriptsLowConfidence: msgs.filter((m) => m.transcription_status === "low_confidence").length,
      edgeErrors: edgeStats.totalErrors,
      newFeedbacks: feedbacks.length,
      commits: commits?.length ?? 0,
    };

    const severity: "ok" | "warn" | "alert" =
      counters.reportsFailed >= 3 || counters.edgeErrors >= 20 || counters.transcriptsFailed >= 5
        ? "alert"
        : counters.reportsFailed > 0 || counters.edgeErrors > 0 || counters.transcriptsFailed > 0 || anomalies.length > 0
        ? "warn"
        : "ok";

    const periodLabel = formatPeriodLabel(periodStart, periodEnd);

    const parisDate = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }).split("/").reverse().join("-");
    const idempotencyKey = `daily-health-${parisDate}-${hours}h`;

    const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "daily-health-report",
        recipientEmail: HARD_RECIPIENT,
        idempotencyKey,
        templateData: {
          periodLabel,
          severity,
          counters,
          fnStats: edgeStats.perFunction,
          topErrors: edgeStats.topErrors,
          anomalies,
          feedbacks: feedbacks.map((f: any) => ({
            subject: f.subject ?? "(sans sujet)",
            status: f.status ?? "?",
            lastMessageAt: formatRelative(f.last_message_at ?? f.created_at),
          })),
          commits,
          emailAlerts: alerts.map((a: any) => ({
            at: formatRelative(a.triggered_at),
            failureCount: a.failure_count,
          })),
          purges: purges.map((p: any) => ({
            at: formatRelative(p.performed_at),
            source: p.source,
            count: 1,
          })),
        },
      },
    });

    if (invokeErr) {
      console.error("daily-health-report send failed", invokeErr);
      return json({ ok: false, error: invokeErr.message }, 500);
    }

    return json({ ok: true, severity, counters, anomaliesCount: anomalies.length });
  } catch (e) {
    console.error("daily-health-report error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// ============ Loaders ============

async function loadSessions(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("sessions")
    .select("id, status, candidate_name, candidate_email, created_at, completed_at, started_at, cancelled_at")
    .gte("created_at", ctx.periodStart.toISOString())
    .lte("created_at", ctx.periodEnd.toISOString())
    .limit(1000);
  return data ?? [];
}

async function loadReports(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("reports")
    .select("id, session_id, generated_at")
    .gte("generated_at", ctx.periodStart.toISOString())
    .lte("generated_at", ctx.periodEnd.toISOString())
    .limit(1000);
  return data ?? [];
}

async function loadJobs(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("report_jobs")
    .select("id, session_id, status, last_error, attempts, updated_at, created_at")
    .gte("created_at", ctx.periodStart.toISOString())
    .limit(1000);
  return data ?? [];
}

async function loadMessages(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("session_messages")
    .select("id, session_id, transcription_status, transcribed_at, timestamp")
    .gte("timestamp", ctx.periodStart.toISOString())
    .lte("timestamp", ctx.periodEnd.toISOString())
    .limit(1000);
  return data ?? [];
}

async function loadFeedbacks(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("feedback_threads")
    .select("id, subject, status, created_at, last_message_at")
    .or(`created_at.gte.${ctx.periodStart.toISOString()},last_message_at.gte.${ctx.periodStart.toISOString()}`)
    .order("last_message_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

async function loadAlerts(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("email_alert_log")
    .select("id, triggered_at, failure_count")
    .gte("triggered_at", ctx.periodStart.toISOString())
    .limit(50);
  return data ?? [];
}

async function loadPurges(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("data_purge_log")
    .select("id, performed_at, source")
    .gte("performed_at", ctx.periodStart.toISOString())
    .limit(50);
  return data ?? [];
}

async function loadEdgeStats(ctx: Ctx) {
  // Requête analytics via l'API SQL du management analytics endpoint
  // Fallback silencieux si non disponible.
  const perFunction: { name: string; invocations: number; errors: number; p95Ms: number | null }[] = [];
  const topErrors: { fn: string; message: string; count: number }[] = [];
  let totalErrors = 0;

  try {
    // On lit les logs edge fonctions via l'API REST analytics du poste.
    // L'endpoint canonique n'étant pas exposé côté runtime, on se rabat sur
    // report_jobs + email_alert_log qui donnent déjà un signal fiable.
    // (Analytics.query n'est disponible qu'à travers l'outil Lovable côté agent.)
    const { data: jobs } = await ctx.supabase
      .from("report_jobs")
      .select("status, last_error")
      .gte("created_at", ctx.periodStart.toISOString())
      .limit(500);

    const failedJobs = (jobs ?? []).filter((j: any) => j.status === "failed");
    totalErrors = failedJobs.length;

    if (failedJobs.length > 0) {
      perFunction.push({
        name: "generate-report (report_jobs failed)",
        invocations: (jobs ?? []).length,
        errors: failedJobs.length,
        p95Ms: null,
      });

      const errCounts = new Map<string, number>();
      for (const j of failedJobs) {
        const msg = (j.last_error ?? "unknown").split("\n")[0].slice(0, 200);
        errCounts.set(msg, (errCounts.get(msg) ?? 0) + 1);
      }
      for (const [message, count] of Array.from(errCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
        topErrors.push({ fn: "generate-report", message, count });
      }
    }
  } catch (e) {
    console.warn("edge stats fallback failed", e);
  }

  return { perFunction, topErrors, totalErrors };
}

async function loadCommits(ctx: Ctx): Promise<any[] | null> {
  const gh = Deno.env.get("GITHUB_API_KEY") || Deno.env.get("GITHUB_TOKEN");
  const repo = Deno.env.get("GITHUB_REPO"); // "owner/name"
  if (!gh || !repo) return null;

  try {
    const since = ctx.periodStart.toISOString();
    const res = await fetch(`https://api.github.com/repos/${repo}/commits?since=${since}&per_page=50`, {
      headers: {
        Authorization: `Bearer ${gh}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      console.warn("github commits fetch failed", res.status, await res.text());
      return null;
    }
    const raw = await res.json();
    return (raw as any[]).map((c) => {
      const files: string[] = (c.files ?? []).map((f: any) => f.filename ?? "");
      const sensitive = files.some((p) => SENSITIVE_PATH_PATTERNS.some((rx) => rx.test(p))) ||
        SENSITIVE_PATH_PATTERNS.some((rx) => rx.test(c.commit?.message ?? ""));
      return {
        sha: c.sha,
        message: (c.commit?.message ?? "").split("\n")[0],
        author: c.commit?.author?.name ?? c.author?.login ?? "?",
        url: c.html_url ?? "#",
        sensitive,
      };
    });
  } catch (e) {
    console.warn("github fetch error", e);
    return null;
  }
}

// ============ Anomalies ============

function buildAnomalies(sessions: any[], reports: any[], jobs: any[], msgs: any[]) {
  const out: { id: string; candidate: string; reason: string; url: string }[] = [];
  const reportBySession = new Set(reports.map((r) => r.session_id));

  for (const s of sessions) {
    if (s.status === "completed" && !reportBySession.has(s.id)) {
      out.push({
        id: s.id,
        candidate: s.candidate_name ?? s.candidate_email ?? s.id.slice(0, 8),
        reason: "Session terminée sans rapport",
        url: `${SITE_URL}/sessions/${s.id}`,
      });
    }
  }

  for (const j of jobs) {
    if (j.status === "failed") {
      out.push({
        id: j.session_id,
        candidate: `job ${j.id.slice(0, 8)}`,
        reason: `report_job failed (×${j.attempts}) — ${(j.last_error ?? "").slice(0, 120)}`,
        url: `${SITE_URL}/sessions/${j.session_id}`,
      });
    }
  }

  const stuckCutoff = Date.now() - 30 * 60 * 1000;
  for (const j of jobs) {
    if (j.status === "processing" && new Date(j.updated_at ?? j.created_at).getTime() < stuckCutoff) {
      out.push({
        id: j.session_id,
        candidate: `job ${j.id.slice(0, 8)}`,
        reason: "report_job bloqué en processing > 30 min",
        url: `${SITE_URL}/sessions/${j.session_id}`,
      });
    }
  }

  const badMsgBySession = new Map<string, number>();
  for (const m of msgs) {
    if (["failed", "too_large", "low_confidence"].includes(m.transcription_status ?? "")) {
      badMsgBySession.set(m.session_id, (badMsgBySession.get(m.session_id) ?? 0) + 1);
    }
  }
  for (const [sid, count] of badMsgBySession.entries()) {
    out.push({
      id: sid,
      candidate: sid.slice(0, 8),
      reason: `${count} message(s) avec transcription problématique`,
      url: `${SITE_URL}/sessions/${sid}`,
    });
  }

  return out;
}

// ============ Utils ============

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getParisHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}

function formatPeriodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
  return `${fmt(start)} → ${fmt(end)}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}
