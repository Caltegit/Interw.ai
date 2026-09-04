import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_rapport",
  title: "Rapport d'entretien",
  description: "Récupère le rapport d'évaluation d'une session candidat : score, synthèse, points forts et axes de progrès.",
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
      .from("reports")
      .select(
        "id, session_id, overall_score, overall_grade, recommendation, executive_summary, executive_summary_short, strengths, areas_for_improvement, criteria_scores, generated_at",
      )
      .eq("session_id", session_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Aucun rapport disponible pour cette session." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { rapport: data },
    };
  },
});
