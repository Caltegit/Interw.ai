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
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return jsonResponse({ error: "token requis" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("id, candidate_email")
      .eq("token", token)
      .maybeSingle();

    if (sErr) {
      return jsonResponse({ error: `Lecture session impossible: ${sErr.message}` }, 500);
    }
    if (!session) {
      return jsonResponse({ error: "Session introuvable" }, 404);
    }

    const sessionId = session.id;

    // Purge des fichiers Storage (best-effort)
    const storageResult = await purgeSessionStorageFiles(admin, sessionId);

    // Cascade BDD
    const { data: reports } = await admin
      .from("reports")
      .select("id")
      .eq("session_id", sessionId);

    if (reports && reports.length > 0) {
      // deno-lint-ignore no-explicit-any
      const reportIds = reports.map((r: any) => r.id);
      await admin.from("report_shares").delete().in("report_id", reportIds);
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
        console.log(`[candidate-self-delete] ${label} failed:`, (error as any).message);
        // deno-lint-ignore no-explicit-any
        return jsonResponse({ error: `${label}: ${(error as any).message}` }, 500);
      }
    }

    await admin.from("data_purge_log").insert({
      session_id: sessionId,
      candidate_email: session.candidate_email ?? null,
      source: "candidate_self_request",
      details: { storage_files_deleted: storageResult.deleted },
    });

    console.log("[candidate-self-delete] OK", { sessionId, storageResult });
    return jsonResponse({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.log("[candidate-self-delete] Exception:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
