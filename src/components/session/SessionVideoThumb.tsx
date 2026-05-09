import { User } from "lucide-react";

interface Props {
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  name?: string | null;
}

/**
 * Vignette ronde affichant une frame extraite d'une vidéo d'entretien.
 * Fallback : initiales du candidat si la vidéo n'est pas disponible.
 */
export function SessionVideoThumb({ thumbnailUrl, videoUrl, name }: Props) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : initials ? (
        <span className="text-xs font-medium text-muted-foreground">{initials}</span>
      ) : (
        <User className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
