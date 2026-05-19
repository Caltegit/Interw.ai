import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectListItem {
  id: string;
  title: string;
  status: string;
  slug: string | null;
  created_at: string;
  sessions: { count: number }[];
}

async function fetchProjects(userId: string): Promise<ProjectListItem[]> {
  // Filtre sur l'organisation active du profil pour que le sélecteur d'orga
  // produise toujours une liste cohérente, y compris pour les super admins
  // qui ont accès à toutes les organisations.
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  const orgId = profile?.organization_id ?? null;

  let query = supabase
    .from("projects")
    .select("id, title, status, slug, created_at, sessions(count)")
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProjectListItem[];
}

export function useProjectsList(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["projects", userId] : ["projects", "anon"],
    queryFn: () => fetchProjects(userId as string),
    enabled: !!userId,
  });
}
