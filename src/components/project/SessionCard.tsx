import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, HelpCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

export function SessionCard({ session, report, questions, onDecisionChange }: Props) {
  const [clips, setClips] = useState<
    { url: string; questionId: string | null; isFollowUp: boolean }[]
  >([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPlayRef = useRef(false);

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

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const play = () => {
      try {
        v.currentTime = 0;
      } catch {
        /* noop */
      }
      if (autoPlayRef.current) v.play().catch(() => {});
    };
    if (v.readyState >= 1) play();
    else v.addEventListener("loadedmetadata", play, { once: true });
    return () => v.removeEventListener("loadedmetadata", play);
  }, [index, clips.length]);

  const current = clips[index];
  const questionByid = new Map(questions.map((q) => [q.id, q]));
  const currentQ = current?.questionId ? questionByid.get(current.questionId) : null;
  const qOrder = currentQ ? currentQ.order_index + 1 : null;

  const decision = (session.recruiter_decision ?? "none") as string;

  const decisionBtn = (
    value: string,
    label: string,
    Icon: typeof Check,
    tone: "success" | "warning" | "destructive",
  ) => {
    const active = decision === value;
    const toneClass = active
      ? tone === "success"
        ? "bg-success text-success-foreground hover:bg-success/90 border-success"
        : tone === "warning"
        ? "bg-warning text-warning-foreground hover:bg-warning/90 border-warning"
        : "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive"
      : "";
    return (
      <Button
        type="button"
        size="sm"
        variant={active ? "default" : "outline"}
        className={cn("h-9 flex-1", toneClass)}
        onClick={() => onDecisionChange(session.id, active ? "none" : value)}
      >
        <Icon className="h-4 w-4" />
        <span className="ml-1">{label}</span>
      </Button>
    );
  };

  const reco = report?.recommendation ? recoConfig[report.recommendation] : null;
  const scoreVal = report?.overall_score != null ? Math.round(Number(report.overall_score)) : null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* En-tête : identité + score */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/sessions/${session.id}`}
              className="block truncate text-base font-semibold hover:underline"
            >
              {session.candidate_name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{session.candidate_email}</p>
            {reco && <Badge className={cn("mt-1.5", reco.className)}>{reco.label}</Badge>}
          </div>
          <div
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 min-w-[64px]",
              scoreColor(scoreVal),
            )}
          >
            <span className="text-xl font-bold leading-none tabular-nums">
              {scoreVal != null ? scoreVal : "—"}
            </span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide opacity-90">
              Note IA
            </span>
          </div>
        </div>

        {/* Vidéo */}
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md bg-black aspect-video">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Chargement…
              </div>
            ) : current ? (
              <video
                key={current.url}
                ref={videoRef}
                src={current.url}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/70">
                Aucune vidéo disponible
              </div>
            )}
          </div>

          {clips.length > 0 && (
            <>
              <div className="min-h-[2.25rem]">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold">
                    {qOrder ? `Q${qOrder}` : "Question"}
                  </span>
                  {current?.isFollowUp && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      Relance
                    </Badge>
                  )}
                </div>
                {currentQ && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{currentQ.content}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    autoPlayRef.current = true;
                    setIndex((i) => Math.max(0, i - 1));
                  }}
                  disabled={index === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {index + 1} / {clips.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    autoPlayRef.current = true;
                    setIndex((i) => Math.min(clips.length - 1, i + 1));
                  }}
                  disabled={index >= clips.length - 1}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Décision */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {decisionBtn("shortlisted", "Retenu", Check, "success")}
          {decisionBtn("second_opinion", "À discuter", HelpCircle, "warning")}
          {decisionBtn("rejected", "Non", X, "destructive")}
        </div>
      </CardContent>
    </Card>
  );
}
