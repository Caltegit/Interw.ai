// Utilitaires partagés pour les enregistrements d'entretien stockés
// dans le bucket privé `media` sous `interviews/…`.
// Accepte indifféremment un chemin ou une adresse absolue héritée.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const MEDIA_BUCKET = "media";

/** Convertit une adresse (absolue, signée ou chemin) en chemin de stockage. */
export function toStoragePath(input?: string | null): string | null {
  if (!input) return null;
  let path = String(input).trim();
  for (const marker of [
    `/object/public/${MEDIA_BUCKET}/`,
    `/object/sign/${MEDIA_BUCKET}/`,
    `/object/authenticated/${MEDIA_BUCKET}/`,
  ]) {
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      path = path.slice(idx + marker.length);
      break;
    }
  }
  path = path.split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch { /* chemin déjà décodé */ }
  path = path.replace(/^\/+/, "");
  if (!path || path.includes("..")) return null;
  return path;
}

/** Télécharge un fichier d'entretien depuis le stockage privé. */
export async function downloadMedia(
  admin: SupabaseClient,
  urlOrPath?: string | null,
): Promise<Blob | null> {
  const path = toStoragePath(urlOrPath);
  if (!path) return null;
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

/** Renvoie une adresse temporaire signée (par défaut 1 h). */
export async function signMedia(
  admin: SupabaseClient,
  urlOrPath?: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  const path = toStoragePath(urlOrPath);
  if (!path) return null;
  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
