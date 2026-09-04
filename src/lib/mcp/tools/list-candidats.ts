import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_candidats",
  title: "Lister les candidats",
  description: "Liste les sessions candidats, avec filtre optionnel par poste, statut ou recherche sur le nom.",
  inputSchema: {
    poste_id: z.string().uuid().optional().describe("Identifiant du poste à filtrer."),
    status: z
      .enum(["pending", "in_progress", "completed", "cancelled", "expired"])
      .optional()
      .describe("Statut de la session candidat."),
    search: z.string().trim().min(1).optional().describe("Recherche sur le nom du candidat."),
    limit: z.number().int().min(1).max(100).default(20).describe("Nombre maximum de candidats retournés."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ poste_id, status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("sessions")
      .select(
        "id, project_id, candidate_name, candidate_email, status, started_at, completed_at, duration_seconds, recruiter_decision",
      )
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (poste_id) query = query.eq("project_id", poste_id);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("candidate_name", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { candidats: data ?? [] },
    };
  },
});
