import { Progress } from "@/components/ui/progress";

interface QuestionLoadingOverlayProps {
  percent: number;
  label: string;
}

/**
 * Overlay plein écran affiché entre deux questions le temps que :
 *   - le segment précédent soit uploadé,
 *   - la décision IA soit prise,
 *   - le média / blob TTS de la prochaine question soit prêt à jouer.
 *
 * Reste affiché jusqu'à ce que le caller le retire (percent atteint 100 + petit
 * buffer côté logique InterviewStart).
 */
export default function QuestionLoadingOverlay({ percent, label }: QuestionLoadingOverlayProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center backdrop-blur-md px-6"
      style={{ background: "hsl(var(--l-bg) / 0.88)" }}
      data-testid="question-loading-overlay"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm space-y-4 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest candidate-gradient-text"
        >
          Préparation
        </p>
        <p
          className="text-base font-medium"
          style={{ color: "hsl(var(--l-fg))" }}
        >
          {label}
        </p>
        <Progress value={clamped} className="h-2" />
        <p
          className="text-xs tabular-nums"
          style={{ color: "hsl(var(--l-fg) / 0.6)" }}
        >
          {clamped}%
        </p>
      </div>
    </div>
  );
}
