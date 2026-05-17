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
    const ownerEmail: string = (body.owner_email ?? "").trim().toLowerCase();
    const ownerFirstName: string = (body.owner_first_name ?? "").trim();
    const ownerLastName: string = (body.owner_last_name ?? "").trim();
    const pricing: string | null = body.pricing ? String(body.pricing).trim() : null;
    const clientNotes: string | null = body.client_notes ? String(body.client_notes).trim() : null;
    const seedLibraries: boolean = body.seed_libraries !== false;
    const creditsUnlimited: boolean = body.session_credits_unlimited !== false;
    const creditsTotalRaw = body.session_credits_total;
    const creditsTotal: number | null =
      !creditsUnlimited && creditsTotalRaw !== undefined && creditsTotalRaw !== null && creditsTotalRaw !== ""
        ? Math.max(0, Math.floor(Number(creditsTotalRaw)))
        : null;

    if (!orgName) return json({ error: "Nom d'organisation requis" }, 400);
    if (!ownerEmail || !ownerFirstName || !ownerLastName) {
      return json({ error: "Email, prénom et nom du propriétaire requis" }, 400);
    }

    // Slug unique
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

    // Recherche d'un user existant avec cet email
    let ownerUserId: string | null = null;
    {
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", ownerEmail)
        .maybeSingle();
      ownerUserId = prof?.user_id ?? null;
    }

    const fullName = `${ownerFirstName} ${ownerLastName}`.trim();
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || supabaseUrl;
    const redirectTo = `${origin}/auth/magic-link`;

    const ownerAlreadyExisted = !!ownerUserId;

    // Si le propriétaire n'existe pas encore : on l'invite (envoi du lien magique natif Supabase, valable 24h, usage unique).
    if (!ownerUserId) {
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
        redirectTo,
        data: { full_name: fullName },
      });
      if (inviteErr) {
        console.error("inviteUserByEmail failed:", inviteErr);
        return json({ error: `Envoi du lien magique impossible : ${inviteErr.message}` }, 500);
      }
      ownerUserId = invited.user!.id;
    }

    // Création de l'organisation avec owner_id (déclenche le seed via trigger).
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: orgName,
        slug: candidate,
        pricing,
        client_notes: clientNotes,
        owner_id: ownerUserId,
        session_credits_unlimited: creditsUnlimited,
        session_credits_total: creditsTotal,
      })
      .select()
      .single();
    if (orgErr) throw orgErr;

    // Rattachement profil + membership + rôle admin
    await admin
      .from("profiles")
      .update({ organization_id: org.id, full_name: fullName })
      .eq("user_id", ownerUserId);

    await admin
      .from("organization_members")
      .upsert({ user_id: ownerUserId, organization_id: org.id }, { onConflict: "user_id,organization_id" });

    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", ownerUserId)
      .eq("organization_id", org.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!existingRole) {
      await admin.from("user_roles").insert({
        user_id: ownerUserId,
        role: "admin",
        organization_id: org.id,
      });
    }

    return json({
      success: true,
      organization_id: org.id,
      seeded: seedLibraries,
      owner_existing: ownerAlreadyExisted,
      magic_link_sent: !ownerAlreadyExisted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
