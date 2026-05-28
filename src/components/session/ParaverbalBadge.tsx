import type { ParaverbalAnalysis, ParaverbalProfile } from "./ParaverbalProfileCard";

const KEYS = [
  "fluency",
  "hesitation",
  "intonation",
  "energy",
  "vocal_confidence",
  "vocal_stress",
] as const;

export function computeParaverbalAverage(analysis?: ParaverbalAnalysis | null): number | null {
  const profile = analysis?.profile as ParaverbalProfile | undefined | null;
  if (!profile) return null;
  const scores = KEYS
    .map((k) => profile[k]?.score)
    .filter((s): s is number => typeof s === "number");
  if (scores.length === 0) return null;
  // Scores 0–10 -> moyenne convertie sur 100
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length) * 10;
  return Math.round(Math.max(0, Math.min(100, avg)));
}

import { MicOff } from "lucide-react";

interface Props {
  analysis?: ParaverbalAnalysis | null;
  size?: number;
  audioFailed?: boolean;
}

export function ParaverbalBadge({ analysis, size = 24, audioFailed }: Props) {
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
  const value = computeParaverbalAverage(analysis);
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
      title={value === null ? "Analyse orale non disponible" : `Score à l'oral : ${value}/100`}
    >
      {value === null ? "—" : value}
    </span>
  );
}
