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

    const { organization_id } = await req.json();
    if (!organization_id) return json({ error: "organization_id requis" }, 400);

    // Récupérer projets de l'org → cascade sessions/questions/criteria/reports
    const { data: projects } = await admin.from("projects").select("id").eq("organization_id", organization_id);
    const projectIds = (projects ?? []).map((p) => p.id);

    if (projectIds.length) {
      const { data: sessions } = await admin.from("sessions").select("id").in("project_id", projectIds);
      const sessionIds = (sessions ?? []).map((s) => s.id);

      if (sessionIds.length) {
        const { data: reports } = await admin.from("reports").select("id").in("session_id", sessionIds);
        const reportIds = (reports ?? []).map((r) => r.id);
        if (reportIds.length) await admin.from("report_shares").delete().in("report_id", reportIds);
        await admin.from("reports").delete().in("session_id", sessionIds);
        await admin.from("transcripts").delete().in("session_id", sessionIds);
        await admin.from("session_messages").delete().in("session_id", sessionIds);
      }
      await admin.from("sessions").delete().in("project_id", projectIds);
      await admin.from("questions").delete().in("project_id", projectIds);
      await admin.from("evaluation_criteria").delete().in("project_id", projectIds);
      await admin.from("projects").delete().in("id", projectIds);
    }

    // Templates de questions de l'org
    await admin.from("question_templates").delete().eq("organization_id", organization_id);

    // Invitations
    await admin.from("organization_invitations").delete().eq("organization_id", organization_id);

    // Rôles liés à l'org
    await admin.from("user_roles").delete().eq("organization_id", organization_id);

    // Détacher les profils
    await admin.from("profiles").update({ organization_id: null }).eq("organization_id", organization_id);

    // Supprimer l'org
    const { error } = await admin.from("organizations").delete().eq("id", organization_id);
    if (error) throw error;

    return json({ success: true });
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
