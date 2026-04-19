import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Non autorisé" }, 401);

    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuper) return json({ error: "Réservé au super admin" }, 403);

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, full_name, organization_id, role, password } = body;
      if (!email) return json({ error: "Email requis" }, 400);

      const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
      const redirectTo = origin ? `${origin}/reset-password` : undefined;

      let newUserId: string;
      let invited = false;

      if (password && password.trim().length > 0) {
        // Création silencieuse avec mot de passe fourni
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || email },
        });
        if (createErr) throw createErr;
        newUserId = created.user!.id;
      } else {
        // Invitation par email
        const { data: invitedData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: full_name || email },
          redirectTo,
        });
        if (inviteErr) throw inviteErr;
        newUserId = invitedData.user!.id;
        invited = true;
      }

      if (organization_id) {
        await admin.from("profiles").update({ organization_id, full_name: full_name || email }).eq("user_id", newUserId);
      }
      if (role) {
        await admin.from("user_roles").insert({
          user_id: newUserId,
          role,
          organization_id: role === "super_admin" ? null : organization_id ?? null,
        });
      }
      return json({ success: true, user_id: newUserId, invited });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id requis" }, 400);
      if (user_id === user.id) return json({ error: "Impossible de se supprimer soi-même" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "set_role") {
      const { user_id, role, organization_id } = body;
      if (!user_id || !role) return json({ error: "Paramètres manquants" }, 400);
      // Supprimer rôles existants (global + org concernée)
      if (role === "super_admin") {
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "super_admin");
        const { error } = await admin.from("user_roles").insert({ user_id, role, organization_id: null });
        if (error) throw error;
      } else {
        if (!organization_id) return json({ error: "organization_id requis" }, 400);
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("organization_id", organization_id);
        const { error } = await admin.from("user_roles").insert({ user_id, role, organization_id });
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === "remove_role") {
      const { user_id, role, organization_id } = body;
      if (!user_id || !role) return json({ error: "Paramètres manquants" }, 400);
      let q = admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (organization_id) q = q.eq("organization_id", organization_id);
      else q = q.is("organization_id", null);
      const { error } = await q;
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "move_org") {
      const { user_id, organization_id } = body;
      if (!user_id) return json({ error: "user_id requis" }, 400);
      const { error } = await admin.from("profiles").update({ organization_id }).eq("user_id", user_id);
      if (error) throw error;
      // Nettoyer les rôles d'org qui ne correspondent plus
      await admin.from("user_roles").delete().eq("user_id", user_id).not("organization_id", "is", null);
      return json({ success: true });
    }

    if (action === "update_profile") {
      const { user_id, full_name, email } = body;
      if (!user_id) return json({ error: "user_id requis" }, 400);
      if (full_name !== undefined) {
        await admin.from("profiles").update({ full_name }).eq("user_id", user_id);
      }
      if (email) {
        const { error } = await admin.auth.admin.updateUserById(user_id, { email });
        if (error) throw error;
        await admin.from("profiles").update({ email }).eq("user_id", user_id);
      }
      return json({ success: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e: any) {
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
