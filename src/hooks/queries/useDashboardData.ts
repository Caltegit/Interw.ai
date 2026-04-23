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
  reportsBySession: Record<string, { score: number; recommendation: string | null }>;
  stalePending: any[];
  credits: {
    unlimited: boolean;
    total: number | null;
    used: number;
  };
}

const RECO_ORDER = ["strong_yes", "yes", "maybe", "no"];

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
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sessions")
      .select("id, candidate_name, candidate_email, created_at, project_id, projects!inner(title)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("reports")
      .select(
        "overall_score, recommendation, generated_at, session_id, sessions!inner(candidate_name, project_id, projects!inner(title))",
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
          .eq("projects.organization_id", orgId)
      : Promise.resolve({ count: 0 }),
  ]);

  const pendingCount = pendingAll?.length ?? 0;
  const staleList = (pendingAll ?? []).filter((s) => new Date(s.created_at) < since7);

  const reports30 = (reports ?? []).filter((r) => new Date(r.generated_at) >= since30);
  const reportsPrev = (reports ?? []).filter(
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

  // Reports pour les sessions récentes
  const reportsBySession: Record<string, { score: number; recommendation: string | null }> = {};
  const recentIds = (sessions ?? []).map((s) => s.id);
  if (recentIds.length > 0) {
    const { data: recentReports } = await supabase
      .from("reports")
      .select("session_id, overall_score, recommendation")
      .in("session_id", recentIds);
    (recentReports ?? []).forEach((r) => {
      reportsBySession[r.session_id] = {
        score: Math.round(Number(r.overall_score)),
        recommendation: r.recommendation,
      };
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
