import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { purgeSessionStorageFiles } from "../_shared/session-storage-cleanup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentification requise" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return jsonResponse({ error: "Session invalide" }, 401);
    }
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return jsonResponse({ error: "session_id requis" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Récupère la session + projet pour le contrôle d'accès
    const { data: session, error: sessErr } = await admin
      .from("sessions")
      .select("id, project_id, candidate_email, projects:projects!inner(created_by, organization_id)")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessErr) {
      return jsonResponse({ error: `Lecture session impossible: ${sessErr.message}` }, 500);
    }
    if (!session) {
      return jsonResponse({ error: "Session introuvable" }, 404);
    }

    // deno-lint-ignore no-explicit-any
    const project = (session as any).projects;
    const isCreator = project.created_by === callerId;

    // Vérifie super-admin
    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { _user_id: callerId });

    // Vérifie appartenance à la même org
    const { data: callerOrgId } = await admin.rpc("get_user_organization_id", {
      _user_id: callerId,
    });
    const sameOrg =
      callerOrgId && project.organization_id && callerOrgId === project.organization_id;

    if (!isCreator && !isSuperAdmin && !sameOrg) {
      console.log("[delete-session] Forbidden", { callerId, sessionId });
      return jsonResponse({ error: "Vous n'avez pas le droit de supprimer cette session" }, 403);
    }

    // Purge des fichiers Storage avant la cascade BDD (best-effort, non bloquant)
    const storageResult = await purgeSessionStorageFiles(admin, sessionId);

    // Cascade côté serveur, atomique du point de vue de l'appelant.
    // Ordre : enfants → parents.
    const { data: reports } = await admin
      .from("reports")
      .select("id")
      .eq("session_id", sessionId);

    if (reports && reports.length > 0) {
      // deno-lint-ignore no-explicit-any
      const reportIds = reports.map((r: any) => r.id);
      const { error } = await admin
        .from("report_shares")
        .delete()
        .in("report_id", reportIds);
      if (error) {
        return jsonResponse({ error: `report_shares: ${error.message}` }, 500);
      }
    }

    const steps: Array<[string, () => Promise<{ error: unknown }>]> = [
      ["session_messages", () => admin.from("session_messages").delete().eq("session_id", sessionId)],
      ["transcripts", () => admin.from("transcripts").delete().eq("session_id", sessionId)],
      ["reports", () => admin.from("reports").delete().eq("session_id", sessionId)],
      ["sessions", () => admin.from("sessions").delete().eq("id", sessionId)],
    ];

    for (const [label, fn] of steps) {
      const { error } = await fn();
      if (error) {
        // deno-lint-ignore no-explicit-any
        console.log(`[delete-session] ${label} failed:`, (error as any).message);
        // deno-lint-ignore no-explicit-any
        return jsonResponse({ error: `${label}: ${(error as any).message}` }, 500);
      }
    }

    // Audit RGPD (best-effort)
    await admin.from("data_purge_log").insert({
      session_id: sessionId,
      candidate_email: session.candidate_email ?? null,
      source: "recruiter_manual",
      performed_by: callerId,
      details: { storage_files_deleted: storageResult.deleted },
    });

    console.log("[delete-session] OK", { sessionId, callerId, storageResult });
    return jsonResponse({ success: true, storage: storageResult });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.log("[delete-session] Exception:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
