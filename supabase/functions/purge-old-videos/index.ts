// Cron RGPD : supprime les fichiers vidéo/audio des sessions terminées
// depuis plus de 12 mois. Conserve la session, le rapport et le transcript.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { purgeSessionStorageFiles, nullifySessionMediaUrls } from "../_shared/session-storage-cleanup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffIso = cutoff.toISOString();

  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, candidate_email, completed_at, video_recording_url, audio_recording_url")
    .lt("completed_at", cutoffIso)
    .or("video_recording_url.not.is.null,audio_recording_url.not.is.null")
    .limit(500);

  if (error) {
    console.error("[purge-old-videos] select failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let purged = 0;
  let totalFiles = 0;
  for (const s of sessions ?? []) {
    const r = await purgeSessionStorageFiles(admin, s.id);
    await nullifySessionMediaUrls(admin, s.id);
    await admin.from("data_purge_log").insert({
      session_id: s.id,
      candidate_email: s.candidate_email ?? null,
      source: "cron_video_retention",
      details: { storage_files_deleted: r.deleted, completed_at: s.completed_at },
    });
    purged++;
    totalFiles += r.deleted;
  }

  console.log(`[purge-old-videos] done: ${purged} sessions, ${totalFiles} files removed`);
  return new Response(
    JSON.stringify({ success: true, sessions_purged: purged, files_removed: totalFiles }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
