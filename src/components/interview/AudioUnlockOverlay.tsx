import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioUnlockOverlayProps {
  onUnlock: () => void;
}

/**
 * Filet de sécurité affiché lorsque la lecture audio est bloquée par le
 * navigateur (typiquement iOS Safari après mise en veille ou changement
 * d'application). Le tap utilisateur fournit un nouveau geste qui réautorise
 * la lecture.
 */
export default function AudioUnlockOverlay({ onUnlock }: AudioUnlockOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md px-6"
      style={{ background: "hsl(var(--l-bg) / 0.94)" }}
      role="dialog"
      aria-modal="true"
      data-testid="audio-unlock-overlay"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "hsl(var(--l-accent) / 0.15)" }}
        >
          <Volume2 className="h-8 w-8" style={{ color: "hsl(var(--l-accent))" }} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold candidate-gradient-text">
            Activer le son
          </h2>
          <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
            Touchez le bouton ci-dessous pour activer la lecture audio.
          </p>
        </div>
        <Button
          onClick={onUnlock}
          size="lg"
          className="w-full"
          style={{ minHeight: 56 }}
        >
          <Volume2 className="mr-2 h-5 w-5" />
          Activer le son
        </Button>
      </div>
    </div>
  );
}
