import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
      console.log("[impersonate] Missing or invalid Authorization header");
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
      console.log("[impersonate] getUser error:", userErr?.message);
      return jsonResponse({ error: "Session invalide" }, 401);
    }

    const callerId = userData.user.id;
    console.log("[impersonate] Caller:", callerId);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isSuperAdmin, error: roleErr } = await admin.rpc("is_super_admin", {
      _user_id: callerId,
    });
    if (roleErr) {
      console.log("[impersonate] is_super_admin RPC error:", roleErr.message);
      return jsonResponse({ error: `Vérification du rôle impossible: ${roleErr.message}` }, 500);
    }
    if (!isSuperAdmin) {
      console.log("[impersonate] Caller is not super admin");
      return jsonResponse({ error: "Réservé aux super administrateurs" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonResponse({ error: "user_id requis" }, 400);
    }

    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetUserId);
    if (getErr || !targetUser?.user?.email) {
      console.log("[impersonate] getUserById error:", getErr?.message);
      return jsonResponse({ error: getErr?.message || "Utilisateur introuvable" }, 404);
    }

    const targetEmail = targetUser.user.email;
    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const redirectTo = origin ? `${origin.replace(/\/$/, "")}/dashboard` : undefined;
    console.log("[impersonate] Target:", targetEmail, "redirectTo:", redirectTo);

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
      return jsonResponse(
        { error: linkErr?.message || "Impossible de générer le lien magique" },
        500,
      );
    }

    console.log("[impersonate] Link generated successfully for", targetEmail);
    return jsonResponse({
      action_link: linkData.properties.action_link,
      email: targetEmail,
      user_id: targetUserId,
    });
  } catch (e) {
    console.log("[impersonate] Unexpected error:", (e as Error).message);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
