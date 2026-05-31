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

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, peek, viewerSecret } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return json({ error: "token requis" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: share } = await admin
      .from("report_shares")
      .select("id, report_id, is_active, expires_at, viewed_at, viewer_secret")
      .eq("share_token", token)
      .maybeSingle();

    if (!share) return json({ error: "Lien introuvable" }, 404);
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: "Ce lien a expiré." }, 410);
    }

    let issuedSecret: string | null = null;

    if (!peek) {
      if (share.viewed_at && share.viewer_secret) {
        // Lien déjà ouvert : seul le navigateur qui détient le secret peut revenir.
        if (!viewerSecret || viewerSecret !== share.viewer_secret) {
          return json(
            { error: "Ce lien a déjà été ouvert sur un autre appareil et ne peut plus être consulté ici." },
            410,
          );
        }
      } else if (!share.viewed_at) {
        // Première ouverture : on verrouille le lien sur ce navigateur.
        const newSecret = generateSecret();
        const { data: updated, error: updErr } = await admin
          .from("report_shares")
          .update({
            viewed_at: new Date().toISOString(),
            viewer_secret: newSecret,
          })
          .eq("id", share.id)
          .is("viewed_at", null)
          .select("id, viewer_secret")
          .maybeSingle();
        if (updErr || !updated) {
          // Race condition : un autre appel a verrouillé entre temps.
          return json(
            { error: "Ce lien vient d'être ouvert sur un autre appareil et ne peut plus être consulté ici." },
            410,
          );
        }
        issuedSecret = updated.viewer_secret;
      } else if (!share.is_active) {
        // Ancien lien verrouillé sans viewer_secret (avant ce correctif) → désactivé.
        return json({ error: "Ce lien a été désactivé." }, 410);
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

    return json({
      report,
      session,
      messages: messages ?? [],
      viewerSecret: issuedSecret,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ error: msg }, 500);
  }
});
