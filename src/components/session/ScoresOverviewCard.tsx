import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBigFiveAverage } from "./BigFiveBadge";
import { computeParaverbalAverage } from "./ParaverbalBadge";
import { computeNonverbalAverage } from "./NonverbalBadge";
import type { ProjectAverages } from "@/hooks/queries/useProjectAverages";

interface Props {
  fitScore: number | null;
  personalityProfile?: any;
  paraverbalAnalysis?: any;
  nonverbalAnalysis?: any;
  audioFailed?: boolean;
  projectAverages?: ProjectAverages | null;
}

type Tone = "success" | "warning" | "danger" | "muted";

function toneFromScore(score: number | null): Tone {
  if (score === null || !Number.isFinite(score)) return "muted";
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

const TONE_STYLES: Record<Tone, { ring: string; dot: string; text: string }> = {
  success: { ring: "text-emerald-500", dot: "bg-emerald-500", text: "text-emerald-600" },
  warning: { ring: "text-amber-500", dot: "bg-amber-500", text: "text-amber-600" },
  danger: { ring: "text-rose-500", dot: "bg-rose-500", text: "text-rose-600" },
  muted: { ring: "text-muted-foreground/30", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function ScoresOverviewCard({
  fitScore,
  personalityProfile,
  paraverbalAnalysis,
  nonverbalAnalysis,
  audioFailed,
  projectAverages,
}: Props) {
  const bigFive = computeBigFiveAverage(personalityProfile);
  const paraverbal = audioFailed ? null : computeParaverbalAverage(paraverbalAnalysis);
  const nonverbal = audioFailed ? null : computeNonverbalAverage(nonverbalAnalysis);

  const hasBenchmark = !!projectAverages && projectAverages.count >= 3;

  // Big Five project avg = mean of available trait averages
  let bigFiveProjectAvg: number | null = null;
  if (hasBenchmark && projectAverages?.bigFive) {
    const vals = Object.values(projectAverages.bigFive).filter(
      (v): v is number => typeof v === "number",
    );
    if (vals.length > 0) {
      bigFiveProjectAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }

  const items = [
    {
      label: "Fit Poste",
      score: fitScore,
      avg: hasBenchmark ? projectAverages!.overallScore : null,
      unavailable: false,
    },
    {
      label: "Orale",
      score: paraverbal,
      avg: hasBenchmark ? projectAverages!.paraverbalScore : null,
      unavailable: !!audioFailed,
    },
    {
      label: "Attitude",
      score: nonverbal,
      avg: hasBenchmark ? projectAverages!.nonverbalScore : null,
      unavailable: !!audioFailed,
    },
    {
      label: "Big Five",
      score: bigFive,
      avg: bigFiveProjectAvg,
      unavailable: false,
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((it) => (
            <ScoreGauge
              key={it.label}
              label={it.label}
              score={it.score}
              avg={it.avg}
              unavailable={it.unavailable}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreGauge({
  label,
  score,
  avg,
  unavailable,
}: {
  label: string;
  score: number | null;
  avg: number | null;
  unavailable: boolean;
}) {
  const R = 42;
  const C = 2 * Math.PI * R; // 263.89
  const tone = unavailable ? "muted" : toneFromScore(score);
  const styles = TONE_STYLES[tone];
  const pct = score !== null && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const offset = C - (C * pct) / 100;

  const delta =
    !unavailable && score !== null && avg !== null && Number.isFinite(avg)
      ? Math.round(score - avg)
      : null;

  if (unavailable) {
    return (
      <div className="relative flex flex-col items-center p-5 bg-muted/30 border border-dashed border-border rounded-xl">
        <div className="relative w-24 h-24 flex items-center justify-center mb-3 opacity-50">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={R}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray="4 4"
              className="text-muted-foreground/40"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold text-muted-foreground">N/A</span>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
        <p className="mt-1 text-[10px] text-muted-foreground/80 uppercase tracking-tight">
          Audio non détecté
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center p-5 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="relative w-24 h-24 flex items-center justify-center mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={R}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-muted/40"
          />
          <circle
            cx="48"
            cy="48"
            r={R}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${styles.ring} transition-all duration-500`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground leading-none">
            {score !== null ? Math.round(score) : "--"}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">/100</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <div className="h-6 mt-1.5 flex items-center">
        {delta !== null ? (
          <span
            className={`text-sm font-bold tabular-nums ${
              delta > 0
                ? "text-emerald-600"
                : delta < 0
                  ? "text-rose-600"
                  : "text-muted-foreground"
            }`}
            title="Écart vs moyenne projet"
          >
            {delta > 0 ? "+" : ""}
            {delta}{" "}
            <span className="text-[11px] font-medium text-muted-foreground">moy.</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}
