import type { NonverbalAnalysis, NonverbalProfile } from "./NonverbalProfileCard";

const KEYS = ["eye_contact", "posture", "gestures"] as const;

// Table de mapping score brut /10 → affiché /100 (interpolation linéaire par morceaux).
// Aligne la perception RH : un candidat "moyen normal" (≈6/10 chez Gemini) → 70/100.
const SCORE_MAP: Array<[number, number]> = [
  [0, 0],
  [2, 18],
  [3, 30],
  [4, 42],
  [5, 58],
  [6, 70],
  [7, 80],
  [8, 88],
  [9, 94],
  [10, 100],
];

export function mapNonverbalScore(raw: number): number {
  if (raw <= SCORE_MAP[0][0]) return SCORE_MAP[0][1];
  if (raw >= SCORE_MAP[SCORE_MAP.length - 1][0]) return SCORE_MAP[SCORE_MAP.length - 1][1];
  for (let i = 0; i < SCORE_MAP.length - 1; i++) {
    const [x1, y1] = SCORE_MAP[i];
    const [x2, y2] = SCORE_MAP[i + 1];
    if (raw >= x1 && raw <= x2) {
      const t = (raw - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return raw * 10;
}
const mapScore = mapNonverbalScore;

export function computeNonverbalAverage(analysis?: NonverbalAnalysis | null): number | null {
  const profile = analysis?.profile as NonverbalProfile | undefined | null;
  if (!profile) return null;
  const scores = KEYS
    .map((k) => profile[k]?.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  const rawAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const mapped = mapScore(rawAvg);
  return Math.round(Math.max(0, Math.min(100, mapped)));
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
      : value >= 70
      ? "bg-success/15 text-success border-success/30"
      : value >= 45
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-semibold leading-none ${colorClass}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      title={value === null ? "Analyse corporelle non disponible" : `Score d'attitude : ${value}/100`}
    >
      {value === null ? "—" : value}
    </span>
  );
}
