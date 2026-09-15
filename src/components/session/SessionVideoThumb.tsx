import { useState } from "react";
import { User } from "lucide-react";
import { useRefreshableMediaUrl } from "@/lib/mediaUrl";

interface Props {
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  name?: string | null;
  /** Adresse déjà résolue par le parent (résolution groupée) ; prioritaire. */
  resolvedUrl?: string | null;
}

/**
 * Vignette ronde affichant une frame extraite d'une vidéo d'entretien.
 * Fallback : initiales du candidat si la vidéo n'est pas disponible.
 */
export function SessionVideoThumb({ thumbnailUrl, videoUrl, name, resolvedUrl }: Props) {
  const { url: resolvedThumb, refresh } = useRefreshableMediaUrl(
    resolvedUrl !== undefined ? undefined : thumbnailUrl,
  );
  const [retried, setRetried] = useState(false);
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const src = resolvedUrl !== undefined ? resolvedUrl : resolvedThumb;

  return (
    <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onLoad={() => setRetried(false)}
          onError={() => {
            if (retried || resolvedUrl !== undefined) return;
            setRetried(true);
            void refresh();
          }}
        />
      ) : initials ? (
        <span className="text-xs font-medium text-muted-foreground">{initials}</span>
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
