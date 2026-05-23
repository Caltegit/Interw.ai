import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface SessionDetailData {
  session: any | null;
  report: any | null;
  messages: any[];
  shareUrl: string | null;
  shareExpiresAt: string | null;
}

async function fetchSessionDetail(sessionId: string): Promise<SessionDetailData> {
  const [sRes, rRes, mRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, candidate_linkedin_url, candidate_cv_url, candidate_cv_filename, status, created_at, started_at, completed_at, duration_seconds, video_recording_url, audio_recording_url, project_id, recruiter_decision, recruiter_decision_at, recruiter_decision_by, recruiter_note, projects(id, title, ai_persona_name, job_title, questions(id, content, order_index))",
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
  let shareExpiresAt: string | null = null;
  if (rRes.data?.id) {
    const nowIso = new Date().toISOString();
    const { data: shares } = await supabase
      .from("report_shares")
      .select("share_token, is_active, expires_at")
      .eq("report_id", rRes.data.id)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1);
    if (shares?.[0]) {
      shareUrl = `${window.location.origin}/shared-report/${shares[0].share_token}`;
      shareExpiresAt = (shares[0] as any).expires_at ?? null;
    }
  }

  let decisionByName: string | null = null;
  const decisionByUserId = (sRes.data as any)?.recruiter_decision_by;
  if (decisionByUserId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", decisionByUserId)
      .maybeSingle();
    decisionByName = prof?.full_name || prof?.email || null;
  }

  // Backfill auto des `start_seconds`. Deux cas :
  // 1) Le rapport n'a pas encore été passé par la version 2 de l'algorithme
  //    → on relance en mode `force` pour appliquer la règle simple uniforme.
  // 2) Sinon, on relance uniquement si des entrées avec citation n'ont pas
  //    encore de timestamp valide.
  if (rRes.data?.id) {
    const stats = (rRes.data.stats ?? {}) as Record<string, any>;
    const algoVersion = Number(stats.timestamps_algo_version) || 0;
    const fitBreakdown = stats.fit_breakdown;
    const needsBackfill =
      Array.isArray(fitBreakdown) &&
      fitBreakdown.some(
        (e: any) =>
          e?.message_id && (typeof e?.start_seconds !== "number" || e.start_seconds <= 0),
      );
    if (algoVersion < 2 || needsBackfill) {
      // Fire-and-forget : on ne bloque pas l'affichage. La requête sera
      // rafraîchie au prochain refetch (refetchInterval 5s).
      supabase.functions
        .invoke("backfill-report-timestamps", {
          body: { session_id: sessionId, force: algoVersion < 2 },
        })
        .catch(() => {});
    }
  }

  return {
    session: sRes.data ? { ...sRes.data, decision_by_name: decisionByName } : null,
    report: rRes.data ?? null,
    messages: mRes.data ?? [],
    shareUrl,
    shareExpiresAt,
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
    mutationFn: async ({ notes }: { reportId?: string; notes: string }) => {
      if (!sessionId) throw new Error("Session manquante");
      const { error } = await supabase
        .from("sessions")
        .update({ recruiter_note: notes })
        .eq("id", sessionId);
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
      const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("report_shares")
        .insert({ report_id: reportId, created_by: userId, expires_at: expiresAt })
        .select("share_token, expires_at")
        .single();
      if (error) throw error;
      return {
        url: `${window.location.origin}/shared-report/${data.share_token}`,
        expiresAt: (data as any).expires_at as string,
      };
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}

export type RecruiterDecision = "none" | "in_progress" | "shortlisted" | "rejected" | "second_opinion" | "accepted";

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
      // On garde l'ancien rapport jusqu'au succès de la regénération
      // (upsert côté edge function). Si l'IA échoue, l'utilisateur ne se
      // retrouve pas avec un écran vide.
      const { error } = await supabase.functions.invoke("generate-report", {
        body: { session_id: sessionId, force: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    },
  });
}
