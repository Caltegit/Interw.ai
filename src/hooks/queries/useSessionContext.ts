import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionContext {
  id: string;
  project_id: string;
  candidate_name: string | null;
}

export function useSessionContext(sessionId: string | null) {
  return useQuery({
    queryKey: ["session-context", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, project_id, candidate_name")
        .eq("id", sessionId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SessionContext | null;
    },
  });
}
