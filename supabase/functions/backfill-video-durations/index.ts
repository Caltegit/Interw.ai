// Remplit `video_duration_seconds` pour les réponses vidéo existantes.
// Les WebM MediaRecorder ne déclarent pas leur durée ; le manifest des
// chunks (1 chunk par seconde) permet de la retrouver : durée ≈ nb chunks.
// À appeler une fois après déploiement, avec la clé de service en Bearer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { toStoragePath } from "../_shared/interview-media.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function manifestPathFor(videoPath: string): string | null {
  // interviews/{sessionId}/q3.webm -> interviews/{sessionId}/q3/manifest.json
  const m = videoPath.match(/^(interviews\/[^/]+\/q\d+)\.[a-z0-9]+$/i);
  return m ? `${m[1]}/manifest.json` : null;
}

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${SERVICE_KEY}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: messages, error } = await admin
    .from("session_messages")
    .select("id, video_segment_url")
    .eq("role", "candidate")
    .not("video_segment_url", "is", null)
    .is("video_duration_seconds", null)
    .limit(20000);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let updated = 0;
  let skipped = 0;
  for (const msg of messages ?? []) {
    const videoPath = toStoragePath(msg.video_segment_url);
    const manifestPath = videoPath ? manifestPathFor(videoPath) : null;
    if (!manifestPath) {
      skipped++;
      continue;
    }
    const { data: file, error: dlError } = await admin.storage
      .from("media")
      .download(manifestPath);
    if (dlError || !file) {
      skipped++;
      continue;
    }
    try {
      const manifest = JSON.parse(await file.text());
      const count = Array.isArray(manifest?.chunks) ? manifest.chunks.length : 0;
      if (count <= 0) {
        skipped++;
        continue;
      }
      const { error: upError } = await admin
        .from("session_messages")
        .update({ video_duration_seconds: count })
        .eq("id", msg.id)
        .is("video_duration_seconds", null);
      if (upError) skipped++;
      else updated++;
    } catch {
      skipped++;
    }
  }

  return Response.json({ total: messages?.length ?? 0, updated, skipped });
});
