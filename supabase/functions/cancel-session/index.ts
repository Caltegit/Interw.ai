import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  sessionToken?: string;
}

const STORAGE_BUCKETS = ["session-recordings", "interview-recordings", "recordings"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionToken } = (await req.json()) as Body;
    if (!sessionToken || typeof sessionToken !== "string") {
      return new Response(JSON.stringify({ error: "sessionToken required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Trouver la session par token
    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("id, status, project_id")
      .eq("token", sessionToken)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!session) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (session.status === "completed") {
      return new Response(JSON.stringify({ error: "session already completed" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId = session.id;

    // 2. Marquer comme cancelled (traçabilité avant purge)
    await admin
      .from("sessions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", sessionId);

    // 3. Supprimer fichiers storage de tous les buckets potentiels
    for (const bucket of STORAGE_BUCKETS) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(sessionId, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `${sessionId}/${f.name}`);
          await admin.storage.from(bucket).remove(paths);
        }
        // Sous-dossiers éventuels
        const { data: subdirs } = await admin.storage.from(bucket).list(sessionId, { limit: 100 });
        if (subdirs) {
          for (const sd of subdirs) {
            if (sd.id === null) {
              const { data: nested } = await admin.storage
                .from(bucket)
                .list(`${sessionId}/${sd.name}`, { limit: 1000 });
              if (nested && nested.length > 0) {
                await admin.storage
                  .from(bucket)
                  .remove(nested.map((f) => `${sessionId}/${sd.name}/${f.name}`));
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[cancel-session] storage cleanup failed for bucket ${bucket}:`, e);
      }
    }

    // 4. Supprimer données liées
    await admin.from("reports").delete().eq("session_id", sessionId);
    await admin.from("transcripts").delete().eq("session_id", sessionId);
    await admin.from("session_messages").delete().eq("session_id", sessionId);
    const { error: delErr } = await admin.from("sessions").delete().eq("id", sessionId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cancel-session] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
