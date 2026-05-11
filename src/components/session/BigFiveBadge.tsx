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

interface Props {
  profile?: Profile | null;
  size?: number;
}

export function BigFiveBadge({ profile, size = 24 }: Props) {
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
