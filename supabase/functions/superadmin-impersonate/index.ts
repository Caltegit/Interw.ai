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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[impersonate] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      console.log("[impersonate] Claims error:", claimsErr?.message);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub as string;
    console.log("[impersonate] Caller:", callerId);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isSuperAdmin, error: roleErr } = await admin.rpc("is_super_admin", {
      _user_id: callerId,
    });
    if (roleErr) {
      console.log("[impersonate] is_super_admin RPC error:", roleErr.message);
    }
    if (!isSuperAdmin) {
      console.log("[impersonate] Caller is not super admin");
      return new Response(JSON.stringify({ error: "Réservé aux super administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetUserId);
    if (getErr || !targetUser?.user?.email) {
      console.log("[impersonate] getUserById error:", getErr?.message);
      return new Response(JSON.stringify({ error: getErr?.message || "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetEmail = targetUser.user.email;
    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const redirectTo = origin ? `${origin.replace(/\/$/, "")}/dashboard` : undefined;
    console.log("[impersonate] Target:", targetEmail, "redirectTo:", redirectTo);

    // Première tentative avec redirectTo
    let linkData: any = null;
    let linkErr: any = null;
    if (redirectTo) {
      const r = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
        options: { redirectTo },
      });
      linkData = r.data;
      linkErr = r.error;
      if (linkErr) {
        console.log("[impersonate] generateLink with redirectTo failed:", linkErr.message);
      }
    }

    // Repli sans redirectTo si la première tentative a échoué (ou a été ignorée)
    if (!linkData?.properties?.action_link) {
      const r = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      });
      linkData = r.data;
      linkErr = r.error;
      if (linkErr) {
        console.log("[impersonate] generateLink without redirectTo failed:", linkErr.message);
      }
    }

    if (!linkData?.properties?.action_link) {
      return new Response(
        JSON.stringify({ error: linkErr?.message || "Impossible de générer le lien" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[impersonate] Link generated successfully for", targetEmail);
    return new Response(
      JSON.stringify({
        action_link: linkData.properties.action_link,
        email: targetEmail,
        user_id: targetUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.log("[impersonate] Unexpected error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
