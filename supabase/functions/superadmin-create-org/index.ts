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
    const pricing: string | null = body.pricing ? String(body.pricing).trim() : null;
    const clientNotes: string | null = body.client_notes ? String(body.client_notes).trim() : null;
    const seedLibraries: boolean = body.seed_libraries !== false; // défaut true
    const creditsUnlimited: boolean = body.session_credits_unlimited !== false; // défaut true
    const creditsTotalRaw = body.session_credits_total;
    const creditsTotal: number | null =
      !creditsUnlimited && creditsTotalRaw !== undefined && creditsTotalRaw !== null && creditsTotalRaw !== ""
        ? Math.max(0, Math.floor(Number(creditsTotalRaw)))
        : null;

    if (!orgName) return json({ error: "Nom d'organisation requis" }, 400);

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

    if (seedLibraries) {
      // Insertion avec owner_id = super admin pour déclencher le seed via trigger trg_seed_on_owner_set
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          name: orgName,
          slug: candidate,
          pricing,
          client_notes: clientNotes,
          owner_id: user.id,
          session_credits_unlimited: creditsUnlimited,
          session_credits_total: creditsTotal,
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      // On retire immédiatement l'owner pour ne pas verrouiller l'org sur le super admin
      await admin.from("organizations").update({ owner_id: null }).eq("id", org.id);

      return json({ success: true, organization_id: org.id, seeded: true });
    } else {
      // Pas de seed : insertion sans owner_id
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          name: orgName,
          slug: candidate,
          pricing,
          client_notes: clientNotes,
          owner_id: null,
          session_credits_unlimited: creditsUnlimited,
          session_credits_total: creditsTotal,
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      return json({ success: true, organization_id: org.id, seeded: false });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
