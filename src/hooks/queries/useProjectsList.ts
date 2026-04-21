import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface ProjectListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  slug: string | null;
  created_at: string;
  sessions: { count: number }[];
}

async function fetchProjects(): Promise<ProjectListItem[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, status, slug, created_at, sessions(count)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectListItem[];
}

export function useProjectsList(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.projects(userId) : ["projects", "anon"],
    queryFn: fetchProjects,
    enabled: !!userId,
  });
}
