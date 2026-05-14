import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CopilotMode = "analysis" | "design";

export interface CopilotThread {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  mode: CopilotMode;
  created_at: string;
  updated_at: string;
}

export interface CopilotMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const threadsKey = (projectId: string, userId: string | null, mode?: CopilotMode) =>
  ["copilot", "threads", projectId, userId, mode ?? "all"] as const;
const messagesKey = (threadId: string) => ["copilot", "messages", threadId] as const;

export function useCopilotThreads(
  projectId: string | null,
  userId: string | null,
  mode?: CopilotMode,
) {
  return useQuery({
    queryKey: threadsKey(projectId ?? "", userId, mode),
    enabled: !!projectId && !!userId,
    queryFn: async () => {
      let q = supabase
        .from("copilot_threads")
        .select("id, project_id, created_by, title, mode, created_at, updated_at")
        .eq("project_id", projectId as string)
        .order("updated_at", { ascending: false });
      if (mode) q = q.eq("mode", mode);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CopilotThread[];
    },
  });
}

export function useCopilotMessages(threadId: string | null) {
  return useQuery({
    queryKey: messagesKey(threadId ?? ""),
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_messages")
        .select("id, thread_id, role, content, created_at")
        .eq("thread_id", threadId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CopilotMessage[];
    },
  });
}

export function useCreateCopilotThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
      mode = "analysis",
    }: { projectId: string; userId: string; mode?: CopilotMode }) => {
      const { data, error } = await supabase
        .from("copilot_threads")
        .insert({ project_id: projectId, created_by: userId, mode })
        .select("id, project_id, created_by, title, mode, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as CopilotThread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["copilot", "threads"] });
    },
  });
}

export function useDeleteCopilotThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string; projectId: string; userId: string }) => {
      const { error } = await supabase.from("copilot_threads").delete().eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["copilot", "threads"] });
    },
  });
}

export function useSendCopilotMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, userMessage }: { threadId: string; userMessage: string }) => {
      if (!threadId) throw new Error("Aucune conversation sélectionnée");
      const { data, error } = await supabase.functions.invoke("copilot-chat", {
        body: { threadId, userMessage },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        userMessageId: string;
        assistantMessage: { id: string; content: string; created_at: string };
      };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: messagesKey(vars.threadId) });
      qc.invalidateQueries({ queryKey: ["copilot", "threads"] });
    },
  });
}

// ---------- Actions « 1-clic » mode design ----------

export interface QuestionSuggestion {
  title?: string;
  content: string;
  type?: string;
  rationale?: string;
}

export interface CriterionSuggestion {
  label: string;
  description?: string;
  weight?: number;
  rationale?: string;
}

function mapQuestionType(t?: string): "open" | "closed" | "scale" {
  const v = (t ?? "open").toLowerCase();
  if (v === "closed" || v === "fermée" || v === "fermee") return "closed";
  if (v === "scale" || v === "échelle" || v === "echelle") return "scale";
  return "open";
}

export function useAddQuestionToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, q }: { projectId: string; q: QuestionSuggestion }) => {
      const { data: existing } = await supabase
        .from("questions")
        .select("order_index")
        .eq("project_id", projectId)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextIndex = ((existing?.[0]?.order_index as number | undefined) ?? -1) + 1;
      const { error } = await supabase.from("questions").insert({
        project_id: projectId,
        title: q.title ?? "",
        content: q.content,
        type: mapQuestionType(q.type) as any,
        order_index: nextIndex,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

export function useAddCriterionToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, c }: { projectId: string; c: CriterionSuggestion }) => {
      const { data: existing } = await supabase
        .from("evaluation_criteria")
        .select("order_index")
        .eq("project_id", projectId)
        .order("order_index", { ascending: false })
        .limit(1);
      const nextIndex = ((existing?.[0]?.order_index as number | undefined) ?? -1) + 1;
      const { error } = await supabase.from("evaluation_criteria").insert({
        project_id: projectId,
        label: c.label,
        description: c.description ?? "",
        weight: typeof c.weight === "number" ? c.weight : 10,
        order_index: nextIndex,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["criteria"] });
    },
  });
}

export function useAddQuestionToLibrary() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      q,
    }: { organizationId: string; userId: string; q: QuestionSuggestion }) => {
      const { error } = await supabase.from("question_templates").insert({
        organization_id: organizationId,
        created_by: userId,
        title: q.title ?? "",
        content: q.content,
        type: "written",
      });
      if (error) throw error;
    },
  });
}

export function useAddCriterionToLibrary() {
  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      c,
    }: { organizationId: string; userId: string; c: CriterionSuggestion }) => {
      const { error } = await supabase.from("criteria_templates").insert({
        organization_id: organizationId,
        created_by: userId,
        label: c.label,
        description: c.description ?? "",
        weight: typeof c.weight === "number" ? c.weight : 10,
      });
      if (error) throw error;
    },
  });
}
