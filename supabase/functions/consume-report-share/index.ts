import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, peek } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return json({ error: "token requis" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: share } = await admin
      .from("report_shares")
      .select("id, report_id, is_active, expires_at, viewed_at")
      .eq("share_token", token)
      .maybeSingle();

    if (!share) return json({ error: "Lien introuvable" }, 404);
    if (share.viewed_at) return json({ error: "Ce lien a déjà été consulté et n'est plus valide." }, 410);
    if (!share.is_active) return json({ error: "Ce lien a été désactivé." }, 410);
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: "Ce lien a expiré." }, 410);
    }

    if (!peek) {
      const { data: updated, error: updErr } = await admin
        .from("report_shares")
        .update({ viewed_at: new Date().toISOString(), is_active: false })
        .eq("id", share.id)
        .is("viewed_at", null)
        .select("id")
        .maybeSingle();
      if (updErr || !updated) {
        return json({ error: "Ce lien a déjà été consulté et n'est plus valide." }, 410);
      }
    }

    const { data: report } = await admin
      .from("reports")
      .select("*")
      .eq("id", share.report_id)
      .single();

    if (!report) return json({ error: "Rapport introuvable" }, 404);

    const { data: session } = await admin
      .from("sessions")
      .select(
        "id, candidate_name, candidate_email, created_at, duration_seconds, video_recording_url, project_id, projects(id, title, job_title, ai_persona_name, questions(id, content, order_index))",
      )
      .eq("id", report.session_id)
      .single();

    const { data: messages } = await admin
      .from("session_messages")
      .select(
        "id, role, content, timestamp, video_segment_url, audio_segment_url, question_id, is_follow_up, transcription_status",
      )
      .eq("session_id", report.session_id)
      .order("timestamp");

    return json({ report, session, messages: messages ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ error: msg }, 500);
  }
});
