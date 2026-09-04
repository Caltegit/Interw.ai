import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_postes",
  title: "Lister les postes",
  description: "Liste les postes de recrutement accessibles à l'utilisateur connecté.",
  inputSchema: {
    status: z.enum(["draft", "active", "archived"]).optional().describe("Filtrer par statut du poste."),
    limit: z.number().int().min(1).max(100).default(20).describe("Nombre maximum de postes retournés."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("projects")
      .select("id, title, job_title, status, language, slug, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { postes: data ?? [] },
    };
  },
});
