import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_transcript",
  title: "Transcription d'entretien",
  description: "Récupère les échanges transcrits d'une session candidat, dans l'ordre chronologique.",
  inputSchema: {
    session_id: z.string().uuid().describe("Identifiant de la session candidat."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("session_messages")
      .select("id, role, content, timestamp, question_id, is_follow_up, transcription_status, transcribed_at")
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true })
      .limit(200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { messages: data ?? [] },
    };
  },
});
