import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CopilotThread {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
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

const threadsKey = (projectId: string, userId: string | null) =>
  ["copilot", "threads", projectId, userId] as const;
const messagesKey = (threadId: string) => ["copilot", "messages", threadId] as const;

export function useCopilotThreads(projectId: string | null, userId: string | null) {
  return useQuery({
    queryKey: threadsKey(projectId ?? "", userId),
    enabled: !!projectId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_threads")
        .select("id, project_id, created_by, title, created_at, updated_at")
        .eq("project_id", projectId as string)
        .order("updated_at", { ascending: false });
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
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("copilot_threads")
        .insert({ project_id: projectId, created_by: userId })
        .select("id, project_id, created_by, title, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as CopilotThread;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: threadsKey(vars.projectId, vars.userId) });
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
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: threadsKey(vars.projectId, vars.userId) });
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
