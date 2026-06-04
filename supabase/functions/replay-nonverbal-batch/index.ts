// One-shot : relance analyze-nonverbal sur les N dernières sessions ayant des
// segments vidéo, pour bénéficier d'un nouveau prompt/calibrage.
// Réservé aux super-admins.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 50;
const DELAY_MS = 3000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth : on exige un super-admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "missing_auth" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "invalid_auth" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "super_admin",
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let limit = DEFAULT_LIMIT;
  let dryRun = false;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number" && body.limit > 0 && body.limit <= 200) {
      limit = body.limit;
    }
    if (body?.dry_run === true) dryRun = true;
  } catch {
    // body optionnel
  }

  // Cible : les `limit` derniers reports ayant une session avec ≥1 segment vidéo candidat.
  const { data: reports, error } = await admin
    .from("reports")
    .select("id, session_id, generated_at")
    .order("generated_at", { ascending: false })
    .limit(limit * 2); // marge pour filtrer ensuite

  if (error) {
    console.error("[replay-nonverbal-batch] query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sessionIds = (reports ?? []).map((r) => r.session_id);
  const withVideo = new Set<string>();
  if (sessionIds.length > 0) {
    const { data: vids } = await admin
      .from("session_messages")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("role", "candidate")
      .not("video_segment_url", "is", null);
    (vids ?? []).forEach((m: any) => withVideo.add(m.session_id));
  }

  const targets = (reports ?? [])
    .filter((r) => withVideo.has(r.session_id))
    .slice(0, limit);

  if (dryRun) {
    return new Response(
      JSON.stringify({ dry_run: true, count: targets.length, session_ids: targets.map((t) => t.session_id) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[replay-nonverbal-batch] relance ${targets.length} sessions`);

  // Lance en série en arrière-plan pour ne pas bloquer la réponse HTTP.
  const run = async () => {
    let ok = 0;
    let fail = 0;
    for (const t of targets) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-nonverbal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ session_id: t.session_id, force: true }),
        });
        if (res.ok) ok++;
        else {
          fail++;
          console.warn("[replay] non-2xx", t.session_id, res.status);
        }
        await res.text().catch(() => undefined);
      } catch (e) {
        fail++;
        console.warn("[replay] error", t.session_id, e);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    console.log(`[replay-nonverbal-batch] terminé : ${ok} ok, ${fail} échecs`);
  };

  // @ts-ignore — EdgeRuntime.waitUntil dispo dans Supabase Edge
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(run());
  } else {
    run();
  }

  return new Response(
    JSON.stringify({ started: true, count: targets.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
