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

import { MicOff } from "lucide-react";

interface Props {
  analysis?: NonverbalAnalysis | null;
  size?: number;
  audioFailed?: boolean;
}

export function NonverbalBadge({ analysis, size = 24, audioFailed }: Props) {
  if (audioFailed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full border border-destructive/40 bg-destructive/15 text-destructive"
        style={{ width: size, height: size }}
        title="Audio défaillant — note non calculée"
      >
        <MicOff style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }
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
