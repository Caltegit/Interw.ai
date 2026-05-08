// Helpers partagés pour purger les fichiers media d'une session.
// Tous les fichiers sont stockés sous `interviews/{sessionId}/...` dans le bucket `media`.

const STORAGE_BUCKET = "media";
const STORAGE_PREFIX = "interviews";

/**
 * Supprime tous les fichiers media (vidéos, audios, segments) d'une session.
 * Best-effort : log l'erreur mais ne lève pas d'exception.
 */
export async function purgeSessionStorageFiles(
  // deno-lint-ignore no-explicit-any
  admin: any,
  sessionId: string,
): Promise<{ deleted: number; error?: string }> {
  try {
    const prefix = `${STORAGE_PREFIX}/${sessionId}`;
    const { data: files, error: listErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .list(prefix, { limit: 1000 });
    if (listErr) {
      console.warn(`[storage-cleanup] list failed for ${sessionId}:`, listErr.message);
      return { deleted: 0, error: listErr.message };
    }
    if (!files || files.length === 0) {
      return { deleted: 0 };
    }
    const paths = files.map((f: { name: string }) => `${prefix}/${f.name}`);
    const { error: delErr } = await admin.storage.from(STORAGE_BUCKET).remove(paths);
    if (delErr) {
      console.warn(`[storage-cleanup] remove failed for ${sessionId}:`, delErr.message);
      return { deleted: 0, error: delErr.message };
    }
    return { deleted: paths.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[storage-cleanup] exception for ${sessionId}:`, msg);
    return { deleted: 0, error: msg };
  }
}

/**
 * Met à NULL toutes les références d'URL media sur une session et ses messages.
 * Utilisé après une purge de fichiers (rétention 12 mois) pour garder la cohérence.
 */
export async function nullifySessionMediaUrls(
  // deno-lint-ignore no-explicit-any
  admin: any,
  sessionId: string,
): Promise<void> {
  await admin
    .from("sessions")
    .update({ video_recording_url: null, audio_recording_url: null })
    .eq("id", sessionId);

  await admin
    .from("session_messages")
    .update({
      video_segment_url: null,
      audio_segment_url: null,
      video_chunks_manifest_url: null,
    })
    .eq("session_id", sessionId);
}
