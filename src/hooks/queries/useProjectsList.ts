import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface ProjectListItem {
  id: string;
  title: string;
  status: string;
  slug: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  sessions: { count: number }[];
}

async function fetchProjects(): Promise<ProjectListItem[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, slug, created_at, created_by, sessions(count)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const projects = (data ?? []) as Omit<ProjectListItem, "created_by_name">[];

  const creatorIds = Array.from(
    new Set(projects.map((p) => p.created_by).filter((v): v is string => !!v)),
  );

  let nameMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", creatorIds);
    nameMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.user_id, p.full_name?.trim() || p.email || ""]),
    );
  }

  return projects.map((p) => ({
    ...p,
    created_by_name: p.created_by ? nameMap[p.created_by] ?? null : null,
  }));
}

export function useProjectsList(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.projects(userId) : ["projects", "anon"],
    queryFn: fetchProjects,
    enabled: !!userId,
  });
}
