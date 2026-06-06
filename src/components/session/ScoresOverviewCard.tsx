import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { FitScoreBadge } from "./FitScoreBadge";
import { BigFiveBadge, computeBigFiveAverage } from "./BigFiveBadge";
import { ParaverbalBadge, computeParaverbalAverage } from "./ParaverbalBadge";
import { NonverbalBadge, computeNonverbalAverage } from "./NonverbalBadge";

interface Props {
  fitScore: number | null;
  personalityProfile?: any;
  paraverbalAnalysis?: any;
  nonverbalAnalysis?: any;
  audioFailed?: boolean;
}

export function ScoresOverviewCard({
  fitScore,
  personalityProfile,
  paraverbalAnalysis,
  nonverbalAnalysis,
  audioFailed,
}: Props) {
  const bigFive = computeBigFiveAverage(personalityProfile);
  const paraverbal = audioFailed ? null : computeParaverbalAverage(paraverbalAnalysis);
  const nonverbal = audioFailed ? null : computeNonverbalAverage(nonverbalAnalysis);

  const data = [
    { axis: "Fit Poste", value: fitScore ?? 0, raw: fitScore },
    { axis: "Big Five", value: bigFive ?? 0, raw: bigFive },
    { axis: "Orale", value: paraverbal ?? 0, raw: paraverbal },
    { axis: "Attitude", value: nonverbal ?? 0, raw: nonverbal },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Vue d'ensemble des notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="75%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                stroke="hsl(var(--border))"
              />
              <Radar
                name="Scores"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreCell label="Fit Poste">
            <FitScoreBadge score={fitScore} size={42} audioFailed={audioFailed} />
          </ScoreCell>
          <ScoreCell label="Big Five">
            <BigFiveBadge profile={personalityProfile} size={42} audioFailed={audioFailed} />
          </ScoreCell>
          <ScoreCell label="Orale">
            <ParaverbalBadge analysis={paraverbalAnalysis} size={42} audioFailed={audioFailed} />
          </ScoreCell>
          <ScoreCell label="Attitude">
            <NonverbalBadge analysis={nonverbalAnalysis} size={42} audioFailed={audioFailed} />
          </ScoreCell>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border bg-card p-3">
      {children}
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
