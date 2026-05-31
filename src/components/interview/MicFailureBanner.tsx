import { useEffect, useState } from "react";
import { MicOff, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MicHealthStatus } from "@/hooks/useMicHealthWatcher";

interface MicFailureBannerProps {
  status: MicHealthStatus;
  reacquiring?: boolean;
  onReacquire: () => void;
  onChangeDevice?: () => void;
}

/**
 * Bannière affichée pendant l'entretien lorsque le micro tombe :
 * - "silent" → avertissement (le candidat parle peut-être dans le vide)
 * - "track-dead" → blocant, action requise pour réactiver le micro
 *
 * Debounce : on attend 1.5 s de stabilité avant de masquer une bannière
 * déjà visible, pour éviter les clignotements.
 */
export default function MicFailureBanner({
  status,
  reacquiring,
  onReacquire,
  onChangeDevice,
}: MicFailureBannerProps) {
  const [visible, setVisible] = useState<MicHealthStatus>(status === "ok" ? "ok" : status);

  useEffect(() => {
    if (status !== "ok") {
      setVisible(status);
      return;
    }
    // Debounce de la fermeture.
    const t = setTimeout(() => setVisible("ok"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  if (visible === "ok") return null;

  const isDead = visible === "track-dead";

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border px-3 py-2.5 shadow-sm"
      style={{
        background: isDead ? "hsl(var(--destructive) / 0.12)" : "hsl(var(--warning) / 0.15)",
        borderColor: isDead ? "hsl(var(--destructive) / 0.5)" : "hsl(var(--warning) / 0.5)",
        color: isDead ? "hsl(var(--destructive))" : "hsl(var(--warning-foreground, var(--foreground)))",
      }}
    >
      {isDead ? (
        <MicOff className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">
          {isDead ? "Micro déconnecté" : "Aucun son détecté"}
        </p>
        <p className="mt-0.5 leading-snug opacity-90">
          {isDead
            ? "La connexion à votre micro a été perdue. Cliquez sur Réactiver pour le rebrancher."
            : "Nous ne captons plus votre voix. Parlez plus fort ou vérifiez votre micro."}
        </p>
        {isDead && (
          <div className="mt-2 flex flex-wrap gap-2">
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
            {onChangeDevice && (
              <Button size="sm" variant="ghost" onClick={onChangeDevice} className="h-8">
                Changer de micro
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
