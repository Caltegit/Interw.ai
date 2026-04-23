import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "org";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Non autorisé" }, 401);

    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuper) return json({ error: "Réservé au super admin" }, 403);

    const body = await req.json();
    const orgName: string = (body.org_name ?? "").trim();
    const adminEmail: string = (body.admin_email ?? "").trim().toLowerCase();
    const adminFullName: string = (body.admin_full_name ?? "").trim() || adminEmail;

    if (!orgName) return json({ error: "Nom d'organisation requis" }, 400);
    if (!adminEmail || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      return json({ error: "Email invalide" }, 400);
    }

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "";

    // 1. Slug unique
    const baseSlug = slugify(orgName);
    let candidate = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!existing) break;
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
      if (counter > 50) return json({ error: "Impossible de générer un slug unique" }, 500);
    }

    // 2. Trouver ou créer le user auth
    let adminUserId: string | null = null;
    let invited = false;

    // Recherche dans profiles d'abord (rapide)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", adminEmail)
      .maybeSingle();

    if (existingProfile?.user_id) {
      adminUserId = existingProfile.user_id;
    } else {
      // Tentative de listage côté auth
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === adminEmail,
      );
      if (found) {
        adminUserId = found.id;
      } else {
        const redirectTo = origin ? `${origin}/login` : undefined;
        const { data: invitedData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
          adminEmail,
          {
            data: { full_name: adminFullName },
            redirectTo,
          },
        );
        if (inviteErr) throw inviteErr;
        adminUserId = invitedData.user!.id;
        invited = true;
      }
    }

    if (!adminUserId) return json({ error: "Impossible de résoudre l'utilisateur admin" }, 500);

    // 3. Créer l'organisation avec owner_id positionné
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: orgName, slug: candidate, owner_id: adminUserId })
      .select()
      .single();
    if (orgErr) throw orgErr;

    // 4. Mettre à jour le profil (rattachement org + nom complet si vide)
    await admin
      .from("profiles")
      .update({ organization_id: org.id, full_name: adminFullName })
      .eq("user_id", adminUserId);

    // 5. Rôle admin (idempotent)
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUserId)
      .eq("organization_id", org.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!existingRole) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: adminUserId, role: "admin", organization_id: org.id });
      if (roleErr) throw roleErr;
    }

    // 6. Trace d'invitation (status accepted directement)
    await admin.from("organization_invitations").insert({
      organization_id: org.id,
      email: adminEmail,
      invited_by: user.id,
      status: "accepted",
    });

    // Le trigger trg_seed_on_owner_set s'occupe du seed (templates + projet démo)
    // car on a positionné owner_id dès l'insert.

    return json({
      success: true,
      organization_id: org.id,
      user_id: adminUserId,
      invited,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
