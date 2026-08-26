// Envoie un email de relance unique aux candidats inactifs depuis 30 min
// (sessions pending ou in_progress, jamais relancées, < 24h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const INACTIVITY_MINUTES = 30;
const MAX_AGE_HOURS = 24;
const SITE_URL = Deno.env.get("SITE_URL") || "https://interw.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authFail = requireInternal(req, corsHeaders);
  if (authFail) return authFail;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const inactiveCutoff = new Date(Date.now() - INACTIVITY_MINUTES * 60 * 1000).toISOString();
  const maxAgeCutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, candidate_name, candidate_email, token, last_activity_at, created_at, is_demo, project:projects(title, slug)")
    .in("status", ["pending", "in_progress"])
    .is("abandon_reminder_sent_at", null)
    .gt("created_at", maxAgeCutoff)
    .or(`last_activity_at.lt.${inactiveCutoff},and(last_activity_at.is.null,created_at.lt.${inactiveCutoff})`)
    .limit(100);

  if (error) {
    console.error("select_failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of sessions ?? []) {
    try {
      if (s.is_demo) { skipped++; continue; }
      const project: any = Array.isArray(s.project) ? s.project[0] : s.project;
      if (!project?.slug || !s.candidate_email || !s.token) { skipped++; continue; }

      const prenom = (s.candidate_name || "").trim().split(/\s+/)[0] || "";
      const sessionName = project.title || "votre entretien";
      const sessionUrl = `${SITE_URL}/session/${project.slug}/start/${s.token}`;

      const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "candidate-abandon-reminder",
          recipientEmail: s.candidate_email,
          idempotencyKey: `abandon-reminder-${s.id}`,
          templateData: { prenom, sessionName, sessionUrl },
        },
      });

      if (invokeErr) {
        errors.push(`${s.id}: ${invokeErr.message}`);
        continue;
      }

      const { error: updateErr } = await supabase
        .from("sessions")
        .update({ abandon_reminder_sent_at: new Date().toISOString() })
        .eq("id", s.id)
        .is("abandon_reminder_sent_at", null);

      if (updateErr) {
        errors.push(`${s.id} (update): ${updateErr.message}`);
      } else {
        sent++;
      }
    } catch (e) {
      errors.push(`${s.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({ candidates: sessions?.length ?? 0, sent, skipped, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
