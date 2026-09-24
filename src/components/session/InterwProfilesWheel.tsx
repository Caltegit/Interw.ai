import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { INTERW_PROFILES, rankProfiles, type InterwProfilesData } from "@/lib/interwProfiles";
import { EvidenceLink } from "./EvidenceLink";

interface Props {
  data?: InterwProfilesData | null;
  averages?: Partial<Record<string, number>>;
  sessionId?: string;
  readOnly?: boolean;
  size?: number;
  onInfo?: () => void;
  showEvidences?: boolean;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
  questionNumberByMessageId?: Record<string, number>;
}

const N = INTERW_PROFILES.length;
const STEP = (2 * Math.PI) / N;
const col = (v: string, a = 1) => `hsl(var(${v}) / ${a})`;

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)] as const;
}
function wedge(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
}

export function InterwProfilesWheel({
  data, averages, sessionId, readOnly, size = 340, onInfo, showEvidences, onGoToMessage, questionNumberByMessageId,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);
  const qc = useQueryClient();
  const rank = rankProfiles(data);

  const compute = async () => {
    if (!sessionId) return;
    setComputing(true);
    const { error } = await supabase.functions.invoke("compute-interw-profiles", { body: { session_id: sessionId } });
    setComputing(false);
    if (error) {
      toast({ title: "Calcul impossible", description: "Réessayez dans un instant.", variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
  };

  const pad = 90;
  const W = size + pad * 2;
  const cx = W / 2, cy = W / 2;
  const R = size / 2;
  const r0 = R * 0.24;
  const radiusFor = (score: number) => r0 + ((R - r0) * Math.max(0, Math.min(100, score))) / 100;

  const hovered = hover !== null ? INTERW_PROFILES[hover] : null;
  const hoveredTrait = hovered ? data?.[hovered.key] : null;

  const avgPoints = averages
    ? INTERW_PROFILES.map((p, i) => {
        const v = averages[p.key];
        return typeof v === "number" ? polar(cx, cy, radiusFor(v), i * STEP) : null;
      })
    : [];
  const avgPath = avgPoints.length && avgPoints.every(Boolean)
    ? avgPoints.map((p, i) => `${i ? "L" : "M"}${p![0]},${p![1]}`).join(" ") + " Z"
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Profil Interw</CardTitle>
            {rank && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full px-2 py-0.5 font-semibold text-background" style={{ background: col(rank.dominant.color) }}>
                  Dominant : {rank.dominant.label} {Math.round(rank.dominant.score)}
                </span>
                <span className="rounded-full border px-2 py-0.5 font-medium" style={{ borderColor: col(rank.secondary.color), color: col(rank.secondary.color) }}>
                  Secondaire : {rank.secondary.label} {Math.round(rank.secondary.score)}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {rank.isNet ? "Profil net" : "Profil hybride"}
                </span>
              </div>
            )}
          </div>
          {onInfo && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onInfo} aria-label="Voir le détail du profil">
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            <p>Profil non encore calculé.</p>
            {!readOnly && sessionId && (
              <Button size="sm" onClick={compute} disabled={computing}>
                {computing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Calculer le profil
              </Button>
            )}
          </div>
        ) : (
          <div className="relative mx-auto" style={{ maxWidth: W }}>
            <svg viewBox={`0 0 ${W} ${W}`} className="h-auto w-full" onMouseLeave={() => setHover(null)}>
              <defs>
                {INTERW_PROFILES.map((p) => (
                  <radialGradient key={p.key} id={`ip-${p.key}`} cx={cx} cy={cy} r={R} gradientUnits="userSpaceOnUse">
                    <stop offset="20%" stopColor={col(p.color, 0.35)} />
                    <stop offset="100%" stopColor={col(p.color, 0.95)} />
                  </radialGradient>
                ))}
              </defs>
              {INTERW_PROFILES.map((p, i) => {
                const a0 = i * STEP - STEP / 2;
                const a1 = a0 + STEP;
                const score = data[p.key]?.score;
                const evaluated = typeof score === "number";
                const isDom = rank?.dominant.key === p.key;
                const isSec = rank?.secondary.key === p.key;
                const [lx, ly] = polar(cx, cy, R + 34, i * STEP);
                return (
                  <g key={p.key} onMouseEnter={() => setHover(i)} className="cursor-pointer">
                    <path d={wedge(cx, cy, r0, R, a0, a1)} fill={evaluated ? col(p.color, hover === i ? 0.22 : 0.12) : "hsl(var(--muted))"} stroke="hsl(var(--background))" strokeWidth={2} />
                    {[0.25, 0.5, 0.75].map((f) => (
                      <path key={f} d={arc(cx, cy, r0 + (R - r0) * f, a0, a1)} fill="none" stroke="hsl(var(--background))" strokeWidth={1.5} />
                    ))}
                    {evaluated && <path
                      d={wedge(cx, cy, r0, radiusFor(score), a0 + 0.02, a1 - 0.02)}
                      fill={`url(#ip-${p.key})`}
                      opacity={0.55 + (score / 100) * 0.45}
                      className="transition-all duration-700"
                    />}
                    {(isDom || isSec) && (
                      <path d={arc(cx, cy, R + 6, a0 + 0.03, a1 - 0.03)} fill="none" stroke={col(p.color)} strokeWidth={isDom ? 7 : 3} strokeLinecap="round" />
                    )}
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={isDom ? 700 : 600} fill={evaluated ? col(p.color) : "hsl(var(--muted-foreground))"}>
                      {evaluated ? p.label : `${p.label} —`}
                    </text>
                  </g>
                );
              })}
              {avgPath && (
                <path d={avgPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 4" pointerEvents="none" />
              )}
              <circle cx={cx} cy={cy} r={r0 - 4} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={2} />
              <image href="/logo-interw.svg" x={cx - r0 * 0.5} y={cy - r0 * 0.5} width={r0} height={r0} pointerEvents="none" />
            </svg>

            {hovered && hoveredTrait && (
              <div className="pointer-events-none absolute left-1/2 top-2 w-64 -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs shadow-lg">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold" style={{ color: col(hovered.color) }}>{hovered.label}</span>
                  <span className="font-bold tabular-nums">{typeof hoveredTrait.score === "number" ? `${Math.round(hoveredTrait.score)}%` : "Non évalué"}</span>
                </div>
                <p><span className="font-medium">Forces :</span> {hovered.forces}</p>
                <p><span className="font-medium">Vigilance :</span> {hovered.vigilance}</p>
                <p><span className="font-medium">Postes cibles :</span> {hovered.targets}</p>
                {hoveredTrait.confidence === "low" && <p className="mt-1 text-muted-foreground">Confiance faible</p>}
              </div>
            )}

            {avgPath && (
              <p className="mt-1 text-center text-[11px] text-muted-foreground">Pointillés : moyenne du poste</p>
            )}

            {showEvidences && rank && (
              <div className="mt-4 space-y-3">
                {[rank.dominant, rank.secondary].map((p) => {
                  const ev = data[p.key]?.evidences ?? [];
                  if (!ev.length) return null;
                  return (
                    <div key={p.key}>
                      <p className="mb-1 text-xs font-semibold" style={{ color: col(p.color) }}>{p.label}</p>
                      <div className="space-y-1">
                        {ev.slice(0, 2).map((e, i) => (
                          <EvidenceLink
                            key={i}
                            quote={e.quote}
                            messageId={e.message_id}
                            startSeconds={e.start_seconds}
                            questionNumber={e.message_id ? questionNumberByMessageId?.[e.message_id] : undefined}
                            onGoToMessage={onGoToMessage}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InterwProfilesGuide() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Les 8 profils Interw</CardTitle>
        <p className="text-xs text-muted-foreground">
          Chaque profil est noté indépendamment de 0 à 100 % (pas un total de 100 %). Sans preuve suffisante, il reste non évalué. Dominant = score le plus haut, secondaire = 2e score. Profil net si l'écart dépasse 15 points, profil hybride sinon.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {INTERW_PROFILES.map((p) => (
          <div key={p.key} className="rounded-lg border-l-4 bg-muted/30 p-3 text-xs" style={{ borderLeftColor: col(p.color) }}>
            <p className="mb-1 text-sm font-semibold" style={{ color: col(p.color) }}>{p.label}</p>
            <p className="mb-1">{p.definition}</p>
            <p><span className="font-medium">À l'oral :</span> {p.oral}</p>
            <p><span className="font-medium">Forces :</span> {p.forces}</p>
            <p><span className="font-medium">Vigilance :</span> {p.vigilance}</p>
            <p><span className="font-medium">Postes cibles :</span> {p.targets}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
