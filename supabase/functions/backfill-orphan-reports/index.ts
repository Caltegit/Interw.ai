// One-shot : enqueue toutes les sessions completed sans rapport dans
// report_jobs. Le worker process-report-queue les traitera ensuite,
// 3 jobs/minute espacés 10 s. Aussi : annule les sessions completed sans
// aucun média (cas où candidate a closed le tab avant le 1er enregistrement).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: orphans, error } = await supabase
    .from("sessions")
    .select("id, organization_id, reports!left(id)")
    .eq("status", "completed")
    .eq("is_demo", false)
    .lt("completed_at", cutoff)
    .is("reports.id", null)
    .order("completed_at", { ascending: true })
    .limit(1000);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let enqueued = 0;
  let cancelled = 0;
  const errors: string[] = [];

  for (const session of orphans ?? []) {
    try {
      const { count: mediaCount } = await supabase
        .from("session_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("role", "candidate")
        .or("video_segment_url.not.is.null,audio_segment_url.not.is.null");

      if (!mediaCount || mediaCount === 0) {
        await supabase
          .from("sessions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          } as any)
          .eq("id", session.id);
        cancelled += 1;
        continue;
      }

      const { error: rpcErr } = await supabase.rpc("enqueue_report_job", {
        p_session_id: session.id,
      });
      if (rpcErr) {
        errors.push(`enqueue ${session.id}: ${rpcErr.message}`);
      } else {
        enqueued += 1;
      }
    } catch (e) {
      errors.push(`${session.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const summary = {
    ok: true,
    total: orphans?.length ?? 0,
    enqueued,
    cancelled,
    errors: errors.slice(0, 20),
  };
  console.log("backfill-orphan-reports", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
