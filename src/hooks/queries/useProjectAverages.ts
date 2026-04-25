import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectAverages {
  count: number;
  overallScore: number | null;
  bigFive: Partial<Record<
    "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "emotional_stability",
    number
  >>;
  motivation: Partial<Record<
    "company_knowledge" | "role_fit" | "enthusiasm" | "long_term_intent",
    number
  >>;
  criteriaByLabel: Record<string, { avgPercent: number }>;
}

const BIG_FIVE = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotional_stability",
] as const;

const MOTIV_KEYS = ["company_knowledge", "role_fit", "enthusiasm", "long_term_intent"] as const;

async function fetchProjectAverages(projectId: string): Promise<ProjectAverages> {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed" as never);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) {
    return { count: 0, overallScore: null, bigFive: {}, motivation: {}, criteriaByLabel: {} };
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("overall_score, personality_profile, motivation_scores, criteria_scores")
    .in("session_id", sessionIds);

  const list = reports ?? [];
  if (list.length === 0) {
    return { count: 0, overallScore: null, bigFive: {}, motivation: {}, criteriaByLabel: {} };
  }

  const avg = (nums: number[]) =>
    nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length;

  const overallScore = avg(list.map((r: any) => Number(r.overall_score)).filter((n) => Number.isFinite(n)));

  const bigFive: ProjectAverages["bigFive"] = {};
  for (const trait of BIG_FIVE) {
    const vals = list
      .map((r: any) => r.personality_profile?.[trait]?.score)
      .filter((n: any): n is number => typeof n === "number");
    const a = avg(vals);
    if (a !== null) bigFive[trait] = a;
  }

  const motivation: ProjectAverages["motivation"] = {};
  for (const k of MOTIV_KEYS) {
    const vals = list
      .map((r: any) => r.motivation_scores?.[k])
      .filter((n: any): n is number => typeof n === "number");
    const a = avg(vals);
    if (a !== null) motivation[k] = a;
  }

  // Critères : on agrège par label (les ids changent par projet mais labels stables)
  const buckets: Record<string, number[]> = {};
  for (const r of list as any[]) {
    const cs = r.criteria_scores || {};
    for (const val of Object.values(cs) as any[]) {
      if (!val?.label || typeof val.score !== "number" || !val.max) continue;
      const pct = (val.score / val.max) * 100;
      buckets[val.label] = buckets[val.label] || [];
      buckets[val.label].push(pct);
    }
  }
  const criteriaByLabel: ProjectAverages["criteriaByLabel"] = {};
  for (const [label, arr] of Object.entries(buckets)) {
    const a = avg(arr);
    if (a !== null) criteriaByLabel[label] = { avgPercent: a };
  }

  return {
    count: list.length,
    overallScore: overallScore !== null ? Math.round(overallScore) : null,
    bigFive,
    motivation,
    criteriaByLabel,
  };
}

export function useProjectAverages(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-averages", projectId],
    queryFn: () => fetchProjectAverages(projectId as string),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
