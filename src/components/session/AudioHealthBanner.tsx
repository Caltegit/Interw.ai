import { MicOff } from "lucide-react";

export interface AudioHealth {
  verdict?: "ok" | "degraded" | "failed" | null;
  silent_ratio?: number | null;
  affected_questions?: Array<{ message_id?: string; question_number?: number }> | null;
  reason?: string | null;
}

export function isAudioFailed(h?: AudioHealth | null): boolean {
  return !!h && h.verdict === "failed";
}

export function isAudioDegraded(h?: AudioHealth | null): boolean {
  return !!h && h.verdict === "degraded";
}

interface Props {
  health?: AudioHealth | null;
}

export function AudioHealthBanner({ health }: Props) {
  if (!health || !health.verdict || health.verdict === "ok") return null;

  const failed = health.verdict === "failed";
  const pct =
    typeof health.silent_ratio === "number"
      ? Math.round(health.silent_ratio * 100)
      : null;
  const affected = health.affected_questions ?? [];
  const nums = affected
    .map((a) => a.question_number)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);

  const toneClass = failed
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-warning/40 bg-warning/10 text-warning-foreground";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${toneClass}`}
      role="alert"
    >
      <MicOff className={`mt-0.5 h-5 w-5 shrink-0 ${failed ? "text-destructive" : "text-warning"}`} />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          {failed ? "Problème audio détecté" : "Qualité audio partielle"}
        </p>
        <p className="mt-0.5 leading-snug text-foreground/80">
          {failed
            ? `${pct ?? "—"} % de l'entretien est silencieux ou inaudible. Le micro du candidat était probablement coupé ou défectueux. Les notes ci-dessous ne sont pas fiables.`
            : `Certaines réponses sont inaudibles${pct !== null ? ` (${pct} % de silence)` : ""}. Les notes restent affichées mais peuvent être incomplètes.`}
        </p>
        {nums.length > 0 && (
          <p className="mt-1 text-xs text-foreground/70">
            Question{nums.length > 1 ? "s" : ""} concernée{nums.length > 1 ? "s" : ""} : {nums.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
