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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { token } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Token requis" }, 400);

    const { data: row, error: selErr } = await admin
      .from("superadmin_magic_links")
      .select("id, email, redirect_to, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row) return json({ error: "Lien invalide." }, 404);

    if (row.used_at) return json({ error: "Ce lien a déjà été utilisé." }, 410);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "Ce lien a expiré." }, 410);
    }

    // Marquer comme utilisé d'abord (atomique : on ne consomme qu'une fois)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const { data: updated, error: updErr } = await admin
      .from("superadmin_magic_links")
      .update({ used_at: new Date().toISOString(), used_ip: ip })
      .eq("id", row.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updated) return json({ error: "Ce lien a déjà été utilisé." }, 410);

    // Générer un vrai lien magique Supabase (valable 24h, à usage unique côté Supabase)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
      options: { redirectTo: row.redirect_to ?? undefined },
    });
    if (linkErr) throw linkErr;

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) return json({ error: "Génération du lien impossible" }, 500);

    return json({ action_link: actionLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
