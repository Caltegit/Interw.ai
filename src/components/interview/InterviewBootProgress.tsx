import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export type BootStepStatus = "pending" | "running" | "done";

export interface BootStep {
  key: string;
  label: string;
  status: BootStepStatus;
}

interface InterviewBootProgressProps {
  steps: BootStep[];
  percent: number;
}

/**
 * Écran de boot affiché juste après le clic « Lancer la session » et avant que
 * la première question ne soit prononcée. Garantit que :
 *   - la voix IA est chaude (warm-up TTS),
 *   - la connexion a été mesurée,
 *   - le média de la 1ère question est en cache.
 */
export default function InterviewBootProgress({ steps, percent }: InterviewBootProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center backdrop-blur-md px-6"
      style={{ background: "hsl(var(--l-bg) / 0.92)" }}
      data-testid="interview-boot-progress"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold candidate-gradient-text">
            Préparation de votre session
          </h2>
          <p
            className="text-xs"
            style={{ color: "hsl(var(--l-fg) / 0.6)" }}
          >
            Quelques secondes pour garantir une lecture fluide.
          </p>
        </div>

        <Progress value={clamped} className="h-2" />
        <p
          className="text-xs tabular-nums"
          style={{ color: "hsl(var(--l-fg) / 0.7)" }}
        >
          {clamped}%
        </p>

        <ul className="space-y-2 text-left text-sm">
          {steps.map((step) => {
            const Icon =
              step.status === "done"
                ? CheckCircle2
                : step.status === "running"
                  ? Loader2
                  : Circle;
            const color =
              step.status === "done"
                ? "hsl(var(--l-accent))"
                : step.status === "running"
                  ? "hsl(var(--l-accent-2))"
                  : "hsl(var(--l-fg) / 0.4)";
            return (
              <li
                key={step.key}
                className="flex items-center gap-2"
                style={{ color: "hsl(var(--l-fg) / 0.85)" }}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${step.status === "running" ? "animate-spin" : ""}`}
                  style={{ color }}
                />
                <span>{step.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
