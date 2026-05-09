import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";

interface Props {
  videoUrl?: string | null;
  name?: string | null;
}

/**
 * Vignette ronde affichant une frame extraite d'une vidéo d'entretien.
 * Fallback : initiales du candidat si la vidéo n'est pas disponible.
 */
export function SessionVideoThumb({ videoUrl, name }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!videoUrl) return;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    const onLoaded = () => {
      try {
        video.currentTime = Math.min(1.5, (video.duration || 2) / 2);
      } catch {
        setFailed(true);
      }
    };
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = 80;
        const h = 80;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return setFailed(true);
        // crop carré centré
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const size = Math.min(vw, vh);
        const sx = (vw - size) / 2;
        const sy = (vh - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, w, h);
        setDataUrl(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        setFailed(true);
      }
    };
    const onError = () => setFailed(true);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      video.src = "";
    };
  }, [videoUrl]);

  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
      {dataUrl && !failed ? (
        <img src={dataUrl} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        <span className="text-xs font-medium text-muted-foreground">{initials}</span>
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
      <video ref={videoRef} className="hidden" />
    </div>
  );
}
