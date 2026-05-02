import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface SessionDetailData {
  session: any | null;
  report: any | null;
  messages: any[];
  shareUrl: string | null;
}

async function fetchSessionDetail(sessionId: string): Promise<SessionDetailData> {
  const [sRes, rRes, mRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, status, created_at, started_at, completed_at, duration_seconds, video_recording_url, audio_recording_url, project_id, recruiter_decision, recruiter_decision_at, recruiter_decision_by, projects(id, title, ai_persona_name, job_title, questions(id, content, order_index))",
      )
      .eq("id", sessionId)
      .single(),
    supabase.from("reports").select("*").eq("session_id", sessionId).maybeSingle(),
    supabase
      .from("session_messages")
      .select("id, role, content, content_raw, transcription_status, transcribed_at, timestamp, video_segment_url, audio_segment_url, question_id, is_follow_up")
      .eq("session_id", sessionId)
      .order("timestamp"),
  ]);

  let shareUrl: string | null = null;
  if (rRes.data?.id) {
    const { data: shares } = await supabase
      .from("report_shares")
      .select("share_token, is_active")
      .eq("report_id", rRes.data.id)
      .eq("is_active", true)
      .limit(1);
    if (shares?.[0]) {
      shareUrl = `${window.location.origin}/shared-report/${shares[0].share_token}`;
    }
  }

  return {
    session: sRes.data,
    report: rRes.data ?? null,
    messages: mRes.data ?? [],
    shareUrl,
  };
}

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionId ? queryKeys.session(sessionId) : ["session", "anon"],
    queryFn: () => fetchSessionDetail(sessionId as string),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });
}

export function useUpdateRecruiterNotes(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, notes }: { reportId: string; notes: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ recruiter_notes: notes })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}

export function useCreateReportShare(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, userId }: { reportId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("report_shares")
        .insert({ report_id: reportId, created_by: userId })
        .select("share_token")
        .single();
      if (error) throw error;
      return `${window.location.origin}/shared-report/${data.share_token}`;
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}

export type RecruiterDecision = "none" | "shortlisted" | "rejected" | "second_opinion";

export function useUpdateRecruiterDecision(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      decision,
      userId,
    }: {
      decision: RecruiterDecision;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("sessions")
        .update({
          recruiter_decision: decision,
          recruiter_decision_at: decision === "none" ? null : new Date().toISOString(),
          recruiter_decision_by: decision === "none" ? null : userId,
        } as never)
        .eq("id", sessionId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}

export function useRegenerateReport(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("Session manquante");
      // Supprime l'ancien rapport pour permettre la régénération
      const { error: delErr } = await supabase
        .from("reports")
        .delete()
        .eq("session_id", sessionId);
      if (delErr) throw delErr;
      const { error } = await supabase.functions.invoke("generate-report", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}
