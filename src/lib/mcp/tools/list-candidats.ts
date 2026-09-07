import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_candidats",
  title: "Lister les candidats",
  description:
    "Liste les candidats accessibles, avec score global, recommandation et notes par critère. Filtrable par poste, statut, recherche. Supporte le tri par score/date et la pagination. Quand la liste est tronquée, le total est indiqué.",
  inputSchema: {
    poste_id: z.string().uuid().optional().describe("Identifiant du poste à filtrer."),
    status: z
      .enum(["pending", "in_progress", "completed", "cancelled", "expired"])
      .optional()
      .describe("Statut de la session candidat."),
    search: z.string().trim().min(1).optional().describe("Recherche sur le nom du candidat."),
    sort_by: z
      .enum(["date", "score"])
      .optional()
      .default("date")
      .describe("Tri : date de création (défaut) ou score global."),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .default("desc")
      .describe("Ordre du tri."),
    limit: z.number().int().min(1).max(100).default(20).describe("Nombre maximum de candidats retournés (max 100)."),
    offset: z.number().int().min(0).default(0).describe("Index de départ pour la pagination."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ poste_id, status, search, sort_by, order, limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("mcp_candidats")
      .select(
        "id, project_id, candidate_name, candidate_email, status, started_at, completed_at, duration_seconds, recruiter_decision, overall_score, overall_grade, recommendation, criteria_scores",
        { count: "exact" },
      )
      .order(sort_by === "score" ? "overall_score" : "created_at", { ascending: order === "asc", nullsFirst: false })
      .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

    if (poste_id) query = query.eq("project_id", poste_id);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("candidate_name", `%${search}%`);

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const total = count ?? data?.length ?? 0;
    const start = offset ?? 0;
    const end = start + (data?.length ?? 0);
    const next_offset = end < total ? end : null;

    const summary = `${data?.length ?? 0} candidat${(data?.length ?? 0) > 1 ? "s" : ""} sur ${total}${next_offset !== null ? ` (offset actuel : ${start}, utilisez offset=${next_offset} pour la suite)` : ""}`;

    return {
      content: [
        { type: "text", text: summary },
        { type: "text", text: JSON.stringify(data ?? []) },
      ],
      structuredContent: { candidats: data ?? [], total, offset: start, next_offset, count: data?.length ?? 0 },
    };
  },
});
