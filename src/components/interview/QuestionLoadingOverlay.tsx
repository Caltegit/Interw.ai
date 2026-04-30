import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface QuestionLoadingOverlayProps {
  percent: number;
  label: string;
}

/**
 * Overlay plein écran affiché entre deux questions.
 *
 * La barre est animée en interne pour avancer en continu (de 0 à 100 %)
 * plutôt que par paliers : on interpole en douceur vers la valeur cible
 * fournie par le caller, et on grappille lentement tant que la cible n'a
 * pas changé, pour donner l'impression d'une progression fluide même
 * quand la logique métier n'a pas encore franchi le palier suivant.
 */
export default function QuestionLoadingOverlay({ percent, label }: QuestionLoadingOverlayProps) {
  const target = Math.max(0, Math.min(100, Math.round(percent)));
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      const current = displayRef.current;
      const distance = target - current;
      let next = current;

      if (distance > 0.1) {
        // Rattrapage de la cible (ease-out, ~25 %/s max).
        const speed = Math.max(8, distance * 1.2);
        next = Math.min(target, current + (speed * dt) / 1000);
      } else if (target < 100) {
        // Cible stable : on grappille très lentement, plafonné à target + 8
        // (et 99 % max) pour ne jamais bloquer visuellement.
        const ceiling = Math.min(target + 8, 99);
        if (current < ceiling) {
          next = Math.min(ceiling, current + (0.4 * dt) / 1000);
        }
      }

      if (Math.abs(next - current) > 0.01) {
        setDisplay(next);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  useEffect(() => {
    if (target >= 100) setDisplay(100);
  }, [target]);

  const shown = Math.max(0, Math.min(100, Math.round(display)));

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center backdrop-blur-md px-6"
      style={{ background: "hsl(var(--l-bg) / 0.88)" }}
      data-testid="question-loading-overlay"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-widest candidate-gradient-text">
          Préparation
        </p>
        <p className="text-base font-medium" style={{ color: "hsl(var(--l-fg))" }}>
          {label}
        </p>
        <Progress value={shown} className="h-2" />
        <p className="text-xs tabular-nums" style={{ color: "hsl(var(--l-fg) / 0.6)" }}>
          {shown}%
        </p>
      </div>
    </div>
  );
}
