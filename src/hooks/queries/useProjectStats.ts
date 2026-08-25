import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatsPeriod = "7d" | "30d" | "90d" | "all";

export interface ProjectStatsData {
  project: { id: string; title: string; organization_id: string | null } | null;
  clicks: number;
  forms: number;
  started: number;
  completed: number;
  cancelled: number;
  abandoned: number;
  pendingNotStarted: number;
  avgDurationSeconds: number | null;
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
  topReferrers: Array<{ host: string; count: number }>;
  timeseries: Array<{ day: string; clicks: number; forms: number; started: number; completed: number }>;
}

function periodToFromTo(period: StatsPeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (period === "7d") from.setDate(to.getDate() - 7);
  else if (period === "30d") from.setDate(to.getDate() - 30);
  else if (period === "90d") from.setDate(to.getDate() - 90);
  else from.setFullYear(2020, 0, 1);
  return { from, to };
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useProjectStats(projectId: string | undefined, period: StatsPeriod) {
  return useQuery({
    queryKey: ["project-stats", projectId, period],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectStatsData> => {
      let { from, to } = periodToFromTo(period);

      if (period === "all") {
        const [firstView, firstSession] = await Promise.all([
          supabase
            .from("project_page_views")
            .select("viewed_at")
            .eq("project_id", projectId!)
            .order("viewed_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("sessions")
            .select("created_at")
            .eq("project_id", projectId!)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        const candidates: number[] = [];
        if (firstView.data?.viewed_at) candidates.push(new Date(firstView.data.viewed_at).getTime());
        if (firstSession.data?.created_at) candidates.push(new Date(firstSession.data.created_at).getTime());
        if (candidates.length) {
          from = new Date(Math.min(...candidates));
          from.setHours(0, 0, 0, 0);
        } else {
          from = new Date();
          from.setDate(to.getDate() - 7);
        }
      }

      const fromIso = from.toISOString();
      const toIso = to.toISOString();

      const [projRes, viewsRes, sessionsRes, tsRes] = await Promise.all([
        supabase.from("projects").select("id, title, organization_id").eq("id", projectId!).maybeSingle(),
        supabase
          .from("project_page_views")
          .select("referrer_host, viewed_at")
          .eq("project_id", projectId!)
          .gte("viewed_at", fromIso)
          .lt("viewed_at", toIso),
        supabase
          .from("sessions")
          .select("status, started_at, completed_at, last_activity_at, duration_seconds, created_at")
          .eq("project_id", projectId!)
          .gte("created_at", fromIso)
          .lt("created_at", toIso),
        (supabase.rpc as any)("get_project_stats_timeseries", {
          p_project_id: projectId!,
          p_from: fromIso,
          p_to: toIso,
        }),
      ]);

      const views = viewsRes.data ?? [];
      const sessions = (sessionsRes.data ?? []) as any[];

      const completedSessions = sessions.filter((s) => s.status === "completed");
      const cancelled = sessions.filter((s) => s.status === "cancelled").length;

      // started_at n'est pas systématiquement renseigné en base : on s'appuie
      // sur le statut et last_activity_at pour détecter qu'une session a démarré.
      const hasStartSignal = (s: any) =>
        s.status === "completed" ||
        s.status === "cancelled" ||
        !!s.started_at ||
        !!s.last_activity_at;
      const startedCount = sessions.filter(hasStartSignal).length;

      const now = Date.now();
      const abandoned = sessions.filter((s) => {
        if (s.status !== "pending") return false;
        const activitySignal = s.last_activity_at ?? s.started_at;
        if (!activitySignal) return false;
        return now - new Date(activitySignal).getTime() > 30 * 60 * 1000;
      }).length;
      const pendingNotStarted = sessions.filter(
        (s) => s.status === "pending" && !s.started_at && !s.last_activity_at,
      ).length;

      const durations = completedSessions
        .map((s) => Number(s.duration_seconds))
        .filter((n) => Number.isFinite(n) && n > 0);
      const avgDurationSeconds = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
      const minDurationSeconds = durations.length ? Math.min(...durations) : null;
      const maxDurationSeconds = durations.length ? Math.max(...durations) : null;

      const refMap = new Map<string, number>();
      for (const v of views) {
        const h = (v as any).referrer_host || "Direct";
        refMap.set(h, (refMap.get(h) ?? 0) + 1);
      }
      const topReferrers = Array.from(refMap.entries())
        .map(([host, count]) => ({ host, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const timeseries = (tsRes.data ?? []).map((r: any) => ({
        day: r.day,
        clicks: Number(r.clicks),
        forms: Number(r.forms),
        started: Number(r.started),
        completed: Number(r.completed),
      }));

      // Socle minimum de clics forcé pour certains postes : les nouveaux
      // clics réels s'additionnent au socle au lieu de l'écraser.
      const FORCED_CLICKS_BASELINE: Record<string, number> = {
        "7ea73a6b-27d6-4dac-916b-2157a09a323d": 120,
      };
      const baseline = FORCED_CLICKS_BASELINE[projectId!] ?? 0;
      const clicks = baseline ? baseline + Math.max(0, views.length - 1) : views.length;

      return {
        project: projRes.data ?? null,
        clicks,
        forms: sessions.length,
        started: startedCount,
        completed: completedSessions.length,
        cancelled,
        abandoned,
        pendingNotStarted,
        avgDurationSeconds,
        minDurationSeconds,
        maxDurationSeconds,
        topReferrers,
        timeseries,
      };
    },
  });
}
