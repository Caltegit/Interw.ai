import type { NonverbalAnalysis, NonverbalProfile } from "./NonverbalProfileCard";

const KEYS = ["eye_contact", "posture", "gestures", "facial_expressivity"] as const;

export function computeNonverbalAverage(analysis?: NonverbalAnalysis | null): number | null {
  const profile = analysis?.profile as NonverbalProfile | undefined | null;
  if (!profile) return null;
  const scores = KEYS
    .map((k) => profile[k]?.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length) * 10;
  return Math.round(Math.max(0, Math.min(100, avg)));
}

interface Props {
  analysis?: NonverbalAnalysis | null;
  size?: number;
}

export function NonverbalBadge({ analysis, size = 24 }: Props) {
  const value = computeNonverbalAverage(analysis);
  const colorClass =
    value === null
      ? "bg-muted text-muted-foreground border-border"
      : value >= 65
      ? "bg-success/15 text-success border-success/30"
      : value >= 45
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border text-[10px] font-semibold leading-none ${colorClass}`}
      style={{ width: size, height: size }}
      title={value === null ? "Analyse corporelle non disponible" : `Score d'attitude : ${value}/100`}
    >
      {value === null ? "—" : value}
    </span>
  );
}
