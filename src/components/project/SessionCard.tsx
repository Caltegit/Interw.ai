import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDecisionAuthor } from "@/lib/decisionAuthor";

interface Question {
  id: string;
  order_index: number;
  content: string;
}

interface SessionLite {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  recruiter_decision: string | null;
  recruiter_decision_at?: string | null;
  recruiter_decision_by?: string | null;
}

interface ReportLite {
  overall_score?: number | null;
  recommendation?: string | null;
}

interface Props {
  session: SessionLite;
  report?: ReportLite | null;
  questions: Question[];
  onDecisionChange: (sessionId: string, decision: string) => void;
  decisionByName?: string | null;
  selected?: boolean;
  onToggleSelect?: (sessionId: string) => void;
  noteValue?: string;
  noteSaving?: boolean;
  onNoteChange?: (sessionId: string, value: string) => void;
  hasReport?: boolean;
}

const recoConfig: Record<string, { label: string; className: string }> = {
  strong_yes: { label: "Très favorable", className: "bg-success text-success-foreground" },
  yes: { label: "Favorable", className: "bg-success/80 text-success-foreground" },
  maybe: { label: "Mitigé", className: "bg-warning text-warning-foreground" },
  no: { label: "Défavorable", className: "bg-destructive text-destructive-foreground" },
};

function scoreColor(score: number | null | undefined) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 75) return "bg-success text-success-foreground";
  if (score >= 55) return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
}

export function SessionCard({ session, report, questions, onDecisionChange, decisionByName, selected, onToggleSelect, noteValue, noteSaving, onNoteChange, hasReport }: Props) {
  const [clips, setClips] = useState<
    { url: string; questionId: string | null; isFollowUp: boolean }[]
  >([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const autoPlayRef = useRef(false);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const stopCurrent = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      v.pause();
      try { v.currentTime = 0; } catch { /* noop */ }
    } catch { /* noop */ }
  };

  const safePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const p = v.play();
      if (p && typeof p.then === "function") {
        playPromiseRef.current = p;
        p.catch(() => {}).finally(() => { playPromiseRef.current = null; });
      }
    } catch { /* noop */ }
  };

  const goTo = async (newIndex: number, autoplay: boolean) => {
    if (newIndex === index) return;
    await stopCurrent();
    autoPlayRef.current = autoplay;
    setIndex(newIndex);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("session_messages")
        .select("video_segment_url, question_id, is_follow_up, timestamp, role")
        .eq("session_id", session.id)
        .eq("role", "candidate")
        .not("video_segment_url", "is", null)
        .order("timestamp");
      if (cancelled) return;
      const list = (data ?? [])
        .filter((m: any) => m.video_segment_url)
        .map((m: any) => ({
          url: m.video_segment_url as string,
          questionId: m.question_id as string | null,
          isFollowUp: !!m.is_follow_up,
        }));
      setClips(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  const fixDuration = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration === Infinity) {
      const onTime = () => {
        v.removeEventListener("timeupdate", onTime);
        const real = v.duration;
        try { v.currentTime = 0; } catch { /* noop */ }
        try { v.playbackRate = rateRef.current; } catch { /* noop */ }
        if (Number.isFinite(real)) setDurationSec(real);
        if (autoPlayRef.current) safePlay();
      };
      v.addEventListener("timeupdate", onTime);
      try { v.currentTime = 1e9; } catch { /* noop */ }
    } else if (Number.isFinite(v.duration)) {
      setDurationSec(v.duration);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setDurationSec(null);
    const apply = () => {
      try { v.playbackRate = rateRef.current; } catch { /* noop */ }
      if (v.duration === Infinity) {
        fixDuration();
      } else {
        try { v.currentTime = 0; } catch { /* noop */ }
        if (Number.isFinite(v.duration)) setDurationSec(v.duration);
        if (autoPlayRef.current) safePlay();
      }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => {
      v.removeEventListener("loadedmetadata", apply);
      try { v.pause(); } catch { /* noop */ }
    };
  }, [index, clips.length]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  }, [rate]);

  const current = clips[index];
  const questionByid = new Map(questions.map((q) => [q.id, q]));
  const currentQ = current?.questionId ? questionByid.get(current.questionId) : null;
  const qOrder = currentQ ? currentQ.order_index + 1 : null;

  const decision = (session.recruiter_decision ?? "none") as string;
  const authorTooltip = formatDecisionAuthor(decisionByName, session.recruiter_decision_at);

  const decisionConfig: Record<string, { label: string; className: string }> = {
    none: { label: "Aucune décision", className: "" },
    rejected: { label: "Non", className: "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90" },
    second_opinion: { label: "À discuter", className: "bg-warning text-warning-foreground border-warning hover:bg-warning/90" },
    shortlisted: { label: "Retenu", className: "bg-success text-success-foreground border-success hover:bg-success/90" },
    in_progress: { label: "RDV", className: "bg-info text-info-foreground border-info hover:bg-info/90" },
    accepted: { label: "Oui", className: "bg-success-strong text-success-strong-foreground border-success-strong hover:bg-success-strong/90" },
  };

  const reco = report?.recommendation ? recoConfig[report.recommendation] : null;
  const scoreVal = report?.overall_score != null ? Math.round(Number(report.overall_score)) : null;

  return (
    <Card className={cn("relative flex flex-col overflow-hidden transition-colors hover:bg-muted/50", selected && "ring-2 ring-primary")}>
      {onToggleSelect && (
        <div
          className="absolute left-2 top-2 z-10 rounded-md bg-background/80 p-1 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={!!selected}
            onCheckedChange={() => onToggleSelect(session.id)}
            aria-label="Sélectionner ce candidat"
          />
        </div>
      )}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* En-tête : nom puis note + recommandation + décision */}
        <div className="flex flex-col items-center gap-2">
          <Link
            to={`/sessions/${session.id}`}
            className="block max-w-full truncate text-base font-semibold hover:underline"
          >
            {session.candidate_name}
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2.5 leading-none",
                scoreColor(scoreVal),
              )}
            >
              <span className="text-sm font-bold tabular-nums">
                {scoreVal != null ? scoreVal : "—"}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide opacity-90">
                Note IA
              </span>
            </span>
            {reco && (
              <Badge className={cn("h-6 rounded-full px-2.5 leading-none", reco.className)}>
                {reco.label}
              </Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={decision} onValueChange={(v) => onDecisionChange(session.id, v)}>
                  <SelectTrigger className={cn("h-9 min-w-[12rem] justify-center gap-2", decisionConfig[decision]?.className)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune décision</SelectItem>
                    <SelectItem value="rejected">Non</SelectItem>
                    <SelectItem value="second_opinion">À discuter</SelectItem>
                    <SelectItem value="shortlisted">Retenu</SelectItem>
                    <SelectItem value="in_progress">RDV</SelectItem>
                    <SelectItem value="accepted">Oui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            {decision !== "none" && authorTooltip && <TooltipContent>{authorTooltip}</TooltipContent>}
          </Tooltip>
        </div>

        {/* Vidéo */}
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md bg-black aspect-video">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Chargement…
              </div>
            ) : current ? (
              <>
                <video
                  key={current.url}
                  ref={videoRef}
                  src={current.url}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d)) setDurationSec(d);
                    else if (d === Infinity) fixDuration();
                  }}
                  onEnded={() => {
                    if (index < clips.length - 1) goTo(index + 1, true);
                  }}
                  className="h-full w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center gap-2">
                  <button
                    type="button"
                    aria-label="Reculer de 10 secondes"
                    disabled={durationSec === null}
                    onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      v.currentTime = Math.max(0, v.currentTime - 10);
                    }}
                    className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
                  >
                    <RotateCcw className="h-3 w-3" />
                    10s
                  </button>
                  <button
                    type="button"
                    aria-label="Avancer de 10 secondes"
                    disabled={durationSec === null}
                    onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      const d = Number.isFinite(v.duration) ? v.duration : (durationSec ?? 0);
                      v.currentTime = Math.min(Math.max(0, d - 0.1), v.currentTime + 10);
                    }}
                    className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
                  >
                    10s
                    <RotateCw className="h-3 w-3" />
                  </button>
                </div>
                <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-[2px]">
                  {[2, 1.5, 1].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRate(r)}
                      className={`pointer-events-auto inline-flex h-[25px] w-[32px] items-center justify-center rounded-full text-[11px] font-medium transition-opacity ${
                        rate === r
                          ? "bg-white text-black opacity-100"
                          : "bg-black/50 text-white opacity-80 hover:opacity-100"
                      }`}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/70">
                Aucune vidéo disponible
              </div>
            )}
          </div>

          {clips.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => goTo(Math.max(0, index - 1), true)}
                disabled={index === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(index)}
                  onValueChange={(v) => goTo(Number(v), true)}
                >
                  <SelectTrigger className="h-7 w-auto shrink-0 gap-1 whitespace-nowrap border-none px-1 text-xs font-semibold shadow-none focus:ring-0 [&>span]:truncate-none">
                    <SelectValue>
                      Question {index + 1}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[20rem]">
                    {clips.map((c, i) => {
                      const q = c.questionId ? questionByid.get(c.questionId) : null;
                      return (
                        <SelectItem key={i} value={String(i)}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">Q{i + 1}</span>
                            {q && (
                              <span className="truncate text-muted-foreground">— {q.content}</span>
                            )}
                            {c.isFollowUp && (
                              <Badge variant="outline" className="ml-1 text-[10px]">Relance</Badge>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {current?.isFollowUp && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    Relance
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => goTo(Math.min(clips.length - 1, index + 1), true)}
                disabled={index >= clips.length - 1}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Décision + note */}
        <div className="-mt-2 flex flex-col gap-2">
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={decision} onValueChange={(v) => onDecisionChange(session.id, v)}>
                    <SelectTrigger className={cn("h-9 min-w-[12rem] justify-center gap-2", decisionConfig[decision]?.className)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune décision</SelectItem>
                      <SelectItem value="rejected">Non</SelectItem>
                      <SelectItem value="second_opinion">À discuter</SelectItem>
                      <SelectItem value="shortlisted">Retenu</SelectItem>
                      <SelectItem value="in_progress">RDV</SelectItem>
                      <SelectItem value="accepted">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {decision !== "none" && authorTooltip && <TooltipContent>{authorTooltip}</TooltipContent>}
            </Tooltip>
          </div>
          {onNoteChange && (
            hasReport ? (
              <div className="flex items-center gap-1">
                <Input
                  value={noteValue ?? ""}
                  onChange={(e) => onNoteChange(session.id, e.target.value)}
                  placeholder="Ajouter une note…"
                  className="h-8 text-xs"
                />
                {noteSaving && <span className="text-xs text-muted-foreground">…</span>}
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input disabled placeholder="Pas de rapport" className="h-8 text-xs" />
                </TooltipTrigger>
                <TooltipContent>Note disponible une fois le rapport généré</TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
