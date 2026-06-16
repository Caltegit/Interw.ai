import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectResult {
  id: string;
  title: string;
  created_at: string;
  session_count: number;
}

export interface CandidateResult {
  id: string;
  candidate_name: string | null;
  candidate_email: string | null;
  status: string;
  completed_at: string | null;
  project_id: string;
  project_title: string;
}

export interface GlobalSearchResults {
  projects: ProjectResult[];
  candidates: CandidateResult[];
}

async function fetchGlobalSearch(term: string): Promise<GlobalSearchResults> {
  const like = `%${term}%`;

  const [projectsRes, sessionsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, created_at, sessions(count)")
      .ilike("title", like)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, status, completed_at, project_id, projects(id, title)",
      )
      .or(`candidate_name.ilike.${like},candidate_email.ilike.${like}`)
      .eq("is_demo", false)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(9),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const projects: ProjectResult[] = (projectsRes.data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    created_at: p.created_at,
    session_count: Array.isArray(p.sessions) ? p.sessions[0]?.count ?? 0 : 0,
  }));

  const candidates: CandidateResult[] = (sessionsRes.data ?? [])
    .filter((s: any) => s.projects)
    .map((s: any) => ({
      id: s.id,
      candidate_name: s.candidate_name,
      candidate_email: s.candidate_email,
      status: s.status,
      completed_at: s.completed_at,
      project_id: s.project_id,
      project_title: s.projects?.title ?? "",
    }));

  return { projects, candidates };
}

export function useGlobalSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["global-search", trimmed],
    queryFn: () => fetchGlobalSearch(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });
}
