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
      const { email, full_name, organization_id, role } = body;
      if (!email) return json({ error: "Email requis" }, 400);

      const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
      const redirectTo = origin ? `${origin}/auth/magic-link` : undefined;

      let newUserId: string | null = null;
      let invited = false;
      let attached = false;

      const isEmailExists = (err: any) => {
        const code = err?.code || err?.error_code;
        const status = err?.status;
        const msg = String(err?.message ?? "").toLowerCase();
        return code === "email_exists" || status === 422 || msg.includes("already been registered") || msg.includes("already exists");
      };

      const findUserIdByEmail = async (target: string): Promise<string | null> => {
        const lower = target.toLowerCase();
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) throw error;
          const found = data.users.find((u) => (u.email ?? "").toLowerCase() === lower);
          if (found) return found.id;
          if (data.users.length < 200) break;
        }
        return null;
      };

      try {
        const { data: invitedData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: full_name || email },
          redirectTo,
        });
        if (inviteErr) throw inviteErr;
        newUserId = invitedData.user!.id;
        invited = true;
      } catch (err: any) {
        if (!isEmailExists(err)) throw err;
        // Utilisateur existant : on tente de le rattacher à l'organisation
        if (!organization_id) {
          return json({ error: "Cet utilisateur existe déjà." }, 409);
        }
        const existingId = await findUserIdByEmail(email);
        if (!existingId) {
          return json({ error: "Utilisateur existant introuvable." }, 500);
        }
        const { data: existingMembership } = await admin
          .from("organization_members")
          .select("id")
          .eq("user_id", existingId)
          .eq("organization_id", organization_id)
          .maybeSingle();
        const alreadyMember = !!existingMembership;
        if (!alreadyMember) {
          await admin.from("organization_members").insert({ user_id: existingId, organization_id });
        }
        const targetRole = role || "member";
        const { data: existingRole } = await admin
          .from("user_roles")
          .select("id")
          .eq("user_id", existingId)
          .eq("organization_id", organization_id)
          .eq("role", targetRole)
          .maybeSingle();
        if (!existingRole) {
          await admin.from("user_roles").insert({
            user_id: existingId,
            role: targetRole,
            organization_id,
          });
        }
        return json({ success: true, user_id: existingId, attached: true, already_member: alreadyMember });
      }

      if (organization_id && newUserId) {
        // Attendre que le trigger handle_new_user ait inséré le profil
        let profileExists = false;
        for (let i = 0; i < 8; i++) {
          const { data: prof } = await admin.from("profiles").select("id").eq("user_id", newUserId).maybeSingle();
          if (prof) { profileExists = true; break; }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!profileExists) {
          const { error: profInsertErr } = await admin.from("profiles").insert({
            user_id: newUserId,
            email,
            full_name: full_name || email,
            organization_id,
          });
          if (profInsertErr) return json({ error: `Création du profil impossible : ${profInsertErr.message}` }, 500);
        } else {
          const { error: profErr } = await admin
            .from("profiles")
            .upsert(
              { user_id: newUserId, email, full_name: full_name || email, organization_id },
              { onConflict: "user_id" },
            );
          if (profErr) return json({ error: `Rattachement profil impossible : ${profErr.message}` }, 500);
        }
        const { error: memErr } = await admin
          .from("organization_members")
          .upsert({ user_id: newUserId, organization_id }, { onConflict: "user_id,organization_id" });
        if (memErr) return json({ error: `Création membership impossible : ${memErr.message}` }, 500);
      }
      if (role && newUserId) {
        const { error: roleErr } = await admin.from("user_roles").insert({
          user_id: newUserId,
          role,
          organization_id: role === "super_admin" ? null : organization_id ?? null,
        });
        if (roleErr) return json({ error: `Attribution du rôle impossible : ${roleErr.message}` }, 500);

        // Si admin d'une org sans owner, on le désigne comme owner (déclenche le seed via trigger)
        if (role === "admin" && organization_id) {
          const { data: org } = await admin
            .from("organizations")
            .select("owner_id")
            .eq("id", organization_id)
            .maybeSingle();
          if (org && !org.owner_id) {
            const { error: ownErr } = await admin.from("organizations").update({ owner_id: newUserId }).eq("id", organization_id);
            if (ownErr) return json({ error: `Désignation owner impossible : ${ownErr.message}` }, 500);
          }
        }
      }
      return json({ success: true, user_id: newUserId, invited, attached });
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
