interface Profile {
  openness?: { score?: number };
  conscientiousness?: { score?: number };
  extraversion?: { score?: number };
  agreeableness?: { score?: number };
  emotional_stability?: { score?: number };
}

export function computeBigFiveAverage(profile?: Profile | null): number | null {
  if (!profile) return null;
  const keys = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "emotional_stability",
  ] as const;
  const scores = keys
    .map((k) => profile[k]?.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(Math.max(0, Math.min(100, avg)));
}

import { MicOff } from "lucide-react";

interface Props {
  profile?: Profile | null;
  size?: number;
  audioFailed?: boolean;
}

export function BigFiveBadge({ profile, size = 24, audioFailed }: Props) {
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
  const value = computeBigFiveAverage(profile);
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
      title={value === null ? "Big Five non disponible" : `Score Big Five : ${value}/100`}
    >
      {value === null ? "—" : value}
    </span>
  );
}
