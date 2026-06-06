// One-shot backfill : reprend toutes les sessions completed sans rapport.
// Idempotent via finalize-session. Annule les sessions sans aucun média.
// Skippe le thank-you email (sessions vieilles, un mail tardif spammerait).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  let skipThankYouEmail = true;
  try {
    const body = await req.json();
    if (typeof body?.skipThankYouEmail === "boolean") {
      skipThankYouEmail = body.skipThankYouEmail;
    }
  } catch { /* body optionnel */ }

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: orphans, error } = await supabase
    .from("sessions")
    .select("id, completed_at, reports!left(id)")
    .eq("status", "completed")
    .eq("is_demo", false)
    .lt("completed_at", cutoff)
    .is("reports.id", null)
    .order("completed_at", { ascending: true })
    .limit(500);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let processed = 0;
  let cancelled = 0;
  let failed = 0;
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

      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: session.id, skipThankYouEmail }),
        },
      );
      if (!res.ok && res.status !== 202) {
        failed += 1;
        errors.push(`finalize ${session.id}: HTTP ${res.status}`);
      } else {
        processed += 1;
      }
      await new Promise((r) => setTimeout(r, 5000));
    } catch (e) {
      failed += 1;
      errors.push(
        `${session.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const summary = {
    ok: true,
    total: orphans?.length ?? 0,
    processed,
    cancelled,
    failed,
    skipThankYouEmail,
    errors: errors.slice(0, 20),
  };
  console.log("backfill-orphan-reports", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
