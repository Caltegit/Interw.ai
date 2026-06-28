import { useEffect, useState } from "react";
import { MicOff, AlertTriangle, Loader2, RotateCcw, Volume1 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MicHealthStatus } from "@/hooks/useMicHealthWatcher";

interface MicFailureBannerProps {
  status: MicHealthStatus;
  reacquiring?: boolean;
  onReacquire: () => void;
  onChangeDevice?: () => void;
  /** Pic RMS instantané (0 → 1) du flux micro, pour mini vu-mètre. */
  peak?: number;
}

/**
 * Bannière affichée pendant l'entretien lorsque le micro tombe :
 * - "too-quiet" → conseil (voix captée mais trop faible)
 * - "silent" → avertissement (le candidat parle peut-être dans le vide)
 * - "track-dead" → bloquant, action requise pour réactiver le micro
 *
 * Debounce : on attend ~1.5 s de stabilité avant de masquer une bannière
 * déjà visible, pour éviter les clignotements.
 */
export default function MicFailureBanner({
  status,
  reacquiring,
  onReacquire,
  onChangeDevice,
  peak,
}: MicFailureBannerProps) {
  const [visible, setVisible] = useState<MicHealthStatus>(status === "track-dead" ? "track-dead" : "ok");

  useEffect(() => {
    if (status === "track-dead") {
      setVisible("track-dead");
      return;
    }
    if (status === "silent") {
      const t = setTimeout(() => setVisible("silent"), 800);
      return () => clearTimeout(t);
    }
    if (status === "too-quiet") {
      const t = setTimeout(() => setVisible("too-quiet"), 800);
      return () => clearTimeout(t);
    }
    // status === "ok" : debounce de fermeture pour éviter le flicker.
    const t = setTimeout(() => setVisible("ok"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  if (visible === "ok") return null;

  const isDead = visible === "track-dead";
  const isTooQuiet = visible === "too-quiet";

  const palette = isDead
    ? { bg: "hsl(var(--destructive) / 0.12)", border: "hsl(var(--destructive) / 0.5)", color: "hsl(var(--destructive))" }
    : { bg: "hsl(var(--warning) / 0.15)", border: "hsl(var(--warning) / 0.5)", color: "hsl(var(--warning-foreground, var(--foreground)))" };

  const Icon = isDead ? MicOff : isTooQuiet ? Volume1 : AlertTriangle;

  const title = isDead
    ? "Micro déconnecté"
    : isTooQuiet
      ? "Voix trop faible"
      : "Aucun son détecté";

  const description = isDead
    ? "La connexion à votre micro a été perdue. Cliquez sur Réactiver pour le rebrancher."
    : isTooQuiet
      ? "On vous entend faiblement. Rapprochez-vous du micro ou changez de périphérique."
      : "Nous ne captons plus votre voix. Parlez plus fort ou vérifiez votre micro.";

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border px-3 py-2.5 shadow-sm"
      style={{ background: palette.bg, borderColor: palette.border, color: palette.color }}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 leading-snug opacity-90">{description}</p>
        {typeof peak === "number" && !isDead && (
          <div className="mt-2 flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => {
              const active = Math.min(1, peak * 8) > i;
              return (
                <span
                  key={i}
                  className="h-2 w-3 rounded-sm transition-colors"
                  style={{ background: active ? "currentColor" : "currentColor", opacity: active ? 0.9 : 0.18 }}
                />
              );
            })}
          </div>
        )}
        {(isDead || isTooQuiet) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {isDead && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReacquire}
                disabled={reacquiring}
                className="h-8"
              >
                {reacquiring ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {reacquiring ? "Réactivation…" : "Réactiver le micro"}
              </Button>
            )}
            {onChangeDevice && (
              <Button size="sm" variant={isDead ? "ghost" : "outline"} onClick={onChangeDevice} className="h-8">
                Changer de micro
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
