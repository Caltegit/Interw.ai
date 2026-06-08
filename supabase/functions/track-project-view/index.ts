import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const projectId = typeof body.project_id === "string" ? body.project_id : null;
    const referrer = typeof body.referrer === "string" ? body.referrer : "";
    if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      return new Response(JSON.stringify({ error: "invalid project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";
    const ua = req.headers.get("user-agent") ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const ipTrunc = ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip.split(".").slice(0, 3).join(".");
    const raw = `${projectId}|${ipTrunc}|${ua}|${today}`;
    const enc = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const visitorHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);

    let referrerHost: string | null = null;
    if (referrer) {
      try {
        referrerHost = new URL(referrer).hostname || null;
      } catch {
        referrerHost = null;
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert; rely on unique index for daily dedup
    const { error } = await supabase.from("project_page_views").insert({
      project_id: projectId,
      visitor_hash: visitorHash,
      referrer_host: referrerHost,
    });

    // Ignore unique violations (already counted today)
    if (error && !String(error.message).includes("duplicate")) {
      console.error("track-project-view insert error", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
