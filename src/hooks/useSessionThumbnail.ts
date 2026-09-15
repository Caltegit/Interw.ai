import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const THUMB_SIZE = 96;

/**
 * Génère paresseusement la vignette d'un entretien terminé qui n'en a pas :
 * capture une image de la première vidéo candidat, l'envoie dans le stockage
 * privé et référence le fichier sur la session. Silencieux : en cas d'échec,
 * l'interface garde le repli (initiales).
 */
export function useSessionThumbnail(
  sessionId: string | undefined,
  thumbnailUrl: string | null | undefined,
  firstVideoUrl: string | null | undefined,
) {
  const queryClient = useQueryClient();
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || thumbnailUrl || !firstVideoUrl) return;
    if (attemptedRef.current === sessionId) return;
    attemptedRef.current = sessionId;
    let cancelled = false;

    (async () => {
      try {
        const signedUrl = await resolveMediaUrl(firstVideoUrl);
        if (!signedUrl || cancelled) return;

        const blob = await captureFrame(signedUrl);
        if (!blob || cancelled) return;

        const path = `interviews/${sessionId}/thumbnail.jpg`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) return;

        const { error: updateError } = await supabase
          .from("sessions")
          .update({ thumbnail_url: path })
          .eq("id", sessionId)
          .is("thumbnail_url", null);
        if (updateError || cancelled) return;

        queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      } catch {
        /* repli silencieux : les initiales restent affichées */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, thumbnailUrl, firstVideoUrl, queryClient]);
}

function captureFrame(src: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const done = (b: Blob | null) => {
      video.src = "";
      video.load();
      resolve(b);
    };
    const timeout = window.setTimeout(() => done(null), 15000);

    video.onerror = () => {
      window.clearTimeout(timeout);
      done(null);
    };
    video.onloadedmetadata = () => {
      const t = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.5, video.duration / 4)
        : 0.1;
      video.currentTime = t;
    };
    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          window.clearTimeout(timeout);
          return done(null);
        }
        const side = Math.min(w, h);
        const canvas = document.createElement("canvas");
        canvas.width = THUMB_SIZE;
        canvas.height = THUMB_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          window.clearTimeout(timeout);
          return done(null);
        }
        ctx.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
        canvas.toBlob(
          (b) => {
            window.clearTimeout(timeout);
            done(b);
          },
          "image/jpeg",
          0.8,
        );
      } catch {
        window.clearTimeout(timeout);
        done(null);
      }
    };
    video.src = src;
  });
}
