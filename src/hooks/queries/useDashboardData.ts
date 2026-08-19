import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardData {
  stats: {
    projects: number;
    projectsThisMonth: number;
    pending: number;
    pendingStale: number;
    completed30d: number;
    completedTrendPct: number | null;
    avgScore30d: number;
  };
  topCandidates: any[];
  recoDistribution: Record<string, number>;
  recentSessions: any[];
  reportsBySession: Record<string, { score: number; recommendation: string | null; unusable: boolean }>;
  stalePending: any[];
  recentProjects: { id: string; title: string; job_title: string | null; created_at: string; sessionCount: number }[];
  toProcess: { session_id: string; candidate_name: string | null; project_title: string; generated_at: string; overall_score: number; recommendation: string | null }[];
  credits: {
    unlimited: boolean;
    total: number | null;
    used: number;
  };
}

const RECO_ORDER = ["strong_yes", "yes", "maybe", "no"];

/**
 * Détermine si un rapport est inexploitable.
 * Ne se base QUE sur des signaux d'échec avérés — jamais sur un seuil temporel
 * ni sur l'absence de rapport (une génération en cours reste "en cours").
 */
export function isReportUnusable(input: {
  report?: { audio_health?: any; executive_summary?: string | null } | null;
  jobStatus?: string | null;
}): boolean {
  if (input.jobStatus === "failed") return true;
  const r = input.report;
  if (!r) return false;
  if (r.audio_health?.verdict === "failed") return true;
  if (!r.executive_summary || !String(r.executive_summary).trim()) return true;
  return false;
}

async function fetchDashboard(userId: string): Promise<DashboardData> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since60 = new Date(now.getTime() - 60 * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Récupérer l'organisation de l'utilisateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  const orgId = profile?.organization_id ?? null;

  const [
    { count: projectCount },
    { count: projectsThisMonthCount },
    { data: sessions },
    { data: pendingAll },
    { data: reports },
    orgRes,
    creditsUsedRes,
  ] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, status, created_at, project_id, projects!inner(title, job_title)",
      )
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sessions")
      .select("id, candidate_name, candidate_email, created_at, project_id, projects!inner(title)")
      .eq("status", "pending")
      .eq("is_demo", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("reports")
      .select(
        "overall_score, recommendation, generated_at, session_id, audio_health, executive_summary, sessions!inner(candidate_name, project_id, projects!inner(title))",
      )
      .gte("generated_at", since60.toISOString())
      .order("overall_score", { ascending: false }),
    orgId
      ? supabase
          .from("organizations")
          .select("session_credits_unlimited, session_credits_total")
          .eq("id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    orgId
      ? supabase
          .from("sessions")
          .select("id, projects!inner(organization_id)", { count: "exact", head: true })
          .eq("status", "completed")
          .eq("is_demo", false)
          .eq("projects.organization_id", orgId)
      : Promise.resolve({ count: 0 }),
  ]);

  // Derniers projets actifs : on priorise ceux où un entretien a réellement été
  // passé (sessions complétées non démo), triés par date du dernier entretien
  // terminé. Puis on complète avec les projets sans entretien terminé.
  const { data: recentProjectsRaw } = await supabase
    .from("projects")
    .select(
      "id, title, job_title, created_at, sessions_done:sessions(completed_at, created_at, status, is_demo, reports(id))",
    )
    .eq("status", "active")
    .limit(200);
  const mapped = (recentProjectsRaw ?? []).map((p: any) => {
    // Même règle que la page projet : session terminée ET rapport généré
    const completedSessions = Array.isArray(p.sessions_done)
      ? p.sessions_done.filter(
          (s: any) =>
            s &&
            s.is_demo === false &&
            s.status === "completed" &&
            (Array.isArray(s.reports) ? s.reports.length > 0 : !!s.reports),
        )
      : [];

    const completedDates = completedSessions
      .map((s: any) => s?.completed_at ?? s?.created_at)
      .filter(Boolean);
    const lastCompletedAt = completedDates.length
      ? completedDates.reduce((a: string, b: string) => (a > b ? a : b))
      : null;
    return {
      id: p.id as string,
      title: p.title as string,
      job_title: (p.job_title ?? null) as string | null,
      created_at: p.created_at as string,
      sessionCount: completedSessions.length,
      lastCompletedAt: lastCompletedAt as string | null,
    };
  });
  const withCompleted = mapped
    .filter((p) => p.lastCompletedAt)
    .sort((a, b) => (b.lastCompletedAt ?? "").localeCompare(a.lastCompletedAt ?? ""))
    .slice(0, 5);
  const withoutCompleted = mapped
    .filter((p) => !p.lastCompletedAt)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const recentProjects = [
    ...withCompleted,
    ...withoutCompleted.slice(0, Math.max(0, 5 - withCompleted.length)),
  ].map(({ lastCompletedAt: _omit, ...rest }) => rest);

  // Candidats "à traiter" : sessions complétées dans des projets actifs de l'org,
  // avec un rapport généré exploitable, et sans décision recruteur.
  let toProcess: DashboardData["toProcess"] = [];
  if (orgId) {
    const { data: toProcessRaw } = await supabase
      .from("sessions")
      .select(
        "id, candidate_name, recruiter_decision, completed_at, projects!inner(title, status, organization_id), reports!inner(overall_score, recommendation, generated_at, audio_health, executive_summary)",
      )
      .eq("status", "completed")
      .eq("is_demo", false)
      .eq("projects.status", "active")
      .eq("projects.organization_id", orgId)
      .or("recruiter_decision.is.null,recruiter_decision.eq.none")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(20);
    toProcess = (toProcessRaw ?? [])
      .map((s: any) => {
        const rep = Array.isArray(s.reports) ? s.reports[0] : s.reports;
        const proj = Array.isArray(s.projects) ? s.projects[0] : s.projects;
        if (!rep) return null;
        if (isReportUnusable({ report: rep })) return null;
        return {
          session_id: s.id as string,
          candidate_name: s.candidate_name ?? null,
          project_title: proj?.title ?? "",
          generated_at: (s.completed_at ?? rep.generated_at) as string,
          overall_score: Math.round(Number(rep.overall_score ?? 0)),
          recommendation: rep.recommendation ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
      .slice(0, 7);
  }

  const pendingCount = pendingAll?.length ?? 0;
  const staleList = (pendingAll ?? []).filter((s) => new Date(s.created_at) < since7);

  // Filtre "usable" appliqué à toutes les agrégats basés sur reports (60j).
  const usableReports = (reports ?? []).filter((r: any) => !isReportUnusable({ report: r }));

  const reports30 = usableReports.filter((r) => new Date(r.generated_at) >= since30);
  const reportsPrev = usableReports.filter(
    (r) => new Date(r.generated_at) < since30 && new Date(r.generated_at) >= since60,
  );

  const avgScore30d =
    reports30.length > 0
      ? reports30.reduce((s, r) => s + Number(r.overall_score), 0) / reports30.length
      : 0;

  const completed30d = reports30.length;
  const completedPrev = reportsPrev.length;
  const completedTrendPct =
    completedPrev > 0 ? Math.round(((completed30d - completedPrev) / completedPrev) * 100) : null;

  const dist: Record<string, number> = {};
  RECO_ORDER.forEach((k) => (dist[k] = 0));
  reports30.forEach((r) => {
    if (r.recommendation && dist[r.recommendation] !== undefined) {
      dist[r.recommendation]++;
    }
  });

  const top = [...reports30]
    .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
    .slice(0, 5);

  // Reports + statuts de génération pour les sessions récentes.
  const reportsBySession: Record<string, { score: number; recommendation: string | null; unusable: boolean }> = {};
  const recentIds = (sessions ?? []).map((s) => s.id);
  if (recentIds.length > 0) {
    const [{ data: recentReports }, { data: recentJobs }] = await Promise.all([
      supabase
        .from("reports")
        .select("session_id, overall_score, recommendation, audio_health, executive_summary")
        .in("session_id", recentIds),
      supabase
        .from("report_jobs")
        .select("session_id, status")
        .in("session_id", recentIds),
    ]);
    const jobStatusBySession: Record<string, string> = {};
    (recentJobs ?? []).forEach((j: any) => {
      jobStatusBySession[j.session_id] = j.status;
    });
    (recentReports ?? []).forEach((r: any) => {
      reportsBySession[r.session_id] = {
        score: Math.round(Number(r.overall_score)),
        recommendation: r.recommendation,
        unusable: isReportUnusable({ report: r, jobStatus: jobStatusBySession[r.session_id] }),
      };
    });
    // Sessions sans rapport mais dont le job a définitivement échoué.
    recentIds.forEach((sid) => {
      if (reportsBySession[sid]) return;
      if (jobStatusBySession[sid] === "failed") {
        reportsBySession[sid] = { score: 0, recommendation: null, unusable: true };
      }
    });
  }

  const orgData = (orgRes as { data: { session_credits_unlimited: boolean; session_credits_total: number | null } | null }).data;
  const creditsUsed = (creditsUsedRes as { count: number | null }).count ?? 0;

  return {
    stats: {
      projects: projectCount ?? 0,
      projectsThisMonth: projectsThisMonthCount ?? 0,
      pending: pendingCount,
      pendingStale: staleList.length,
      completed30d,
      completedTrendPct,
      avgScore30d: Math.round(avgScore30d),
    },
    topCandidates: top,
    recoDistribution: dist,
    recentSessions: sessions ?? [],
    reportsBySession,
    stalePending: staleList,
    recentProjects,
    toProcess,
    credits: {
      unlimited: orgData?.session_credits_unlimited ?? true,
      total: orgData?.session_credits_total ?? null,
      used: creditsUsed,
    },
  };
}

export function useDashboardData(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.dashboard(userId) : ["dashboard", "anon"],
    queryFn: () => fetchDashboard(userId as string),
    enabled: !!userId,
  });
}
