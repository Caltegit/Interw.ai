import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trophy, X, ExternalLink, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SessionCard } from "@/components/project/SessionCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReportLite {
  overall_score: number | null;
  recommendation: string | null;
  executive_summary_short: string | null;
  executive_summary: string | null;
  strengths: string[] | null;
  areas_for_improvement: string[] | null;
  red_flags: any;
  criteria_scores: Record<string, { label?: string; score: number; max: number }> | null;
  soft_skills: any;
}

interface SessionFull {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  recruiter_decision: string | null;
  recruiter_decision_at: string | null;
  recruiter_decision_by: string | null;
  recruiter_note: string | null;
  decision_by_name?: string | null;
  report: ReportLite | null;
}

const recoLabel: Record<string, string> = {
  strong_yes: "Très favorable",
  yes: "Favorable",
  maybe: "Mitigé",
  no: "Défavorable",
};

export default function ProjectCompare() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ids = useMemo(
    () => (searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4),
    [searchParams],
  );

  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<SessionFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || ids.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      const [pRes, qRes, sRes, rRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("questions").select("id, order_index, content").eq("project_id", id).order("order_index"),
        supabase.from("sessions").select("id, candidate_name, candidate_email, status, recruiter_decision, recruiter_decision_at, recruiter_decision_by, recruiter_note").in("id", ids),
        supabase.from("reports").select("session_id, overall_score, recommendation, executive_summary_short, executive_summary, strengths, areas_for_improvement, red_flags, criteria_scores, soft_skills").in("session_id", ids),
      ]);

      setProject(pRes.data);
      setQuestions(qRes.data ?? []);
      const reportsBySid = new Map((rRes.data ?? []).map((r: any) => [r.session_id, r]));

      const decisionByIds = Array.from(
        new Set((sRes.data ?? []).map((s: any) => s.recruiter_decision_by).filter(Boolean)),
      );
      let nameByUserId = new Map<string, string>();
      if (decisionByIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", decisionByIds as string[]);
        nameByUserId = new Map(
          (profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email || ""]),
        );
      }

      const ordered: SessionFull[] = ids
        .map((sid) => {
          const s = (sRes.data ?? []).find((x: any) => x.id === sid);
          if (!s) return null;
          const r: any = reportsBySid.get(sid);
          return {
            ...s,
            decision_by_name: s.recruiter_decision_by ? nameByUserId.get(s.recruiter_decision_by) ?? null : null,
            report: r
              ? {
                  overall_score: r.overall_score != null ? Number(r.overall_score) : null,
                  recommendation: r.recommendation,
                  executive_summary_short: r.executive_summary_short,
                  executive_summary: r.executive_summary,
                  strengths: r.strengths,
                  areas_for_improvement: r.areas_for_improvement,
                  red_flags: r.red_flags,
                  criteria_scores: r.criteria_scores,
                  soft_skills: r.soft_skills,
                }
              : null,
          } as SessionFull;
        })
        .filter(Boolean) as SessionFull[];
      setSessions(ordered);
      setLoading(false);
    })();
  }, [id, ids]);

  const handleDecisionChange = async (sessionId: string, decision: string) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, recruiter_decision: decision } : s)));
    const { error } = await supabase
      .from("sessions")
      .update({ recruiter_decision: decision as any })
      .eq("id", sessionId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
  };

  const removeColumn = (sid: string) => {
    const remaining = ids.filter((x) => x !== sid);
    if (remaining.length < 2) {
      navigate(`/projects/${id}`);
      return;
    }
    navigate(`/projects/${id}/compare?ids=${remaining.join(",")}`);
  };

  // Best score per criterion (label-based)
  const bestByCriterion = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      Object.values(s.report?.criteria_scores ?? {}).forEach((c) => {
        const pct = c.max ? c.score / c.max : 0;
        const label = c.label || "Critère";
        if (!map.has(label) || pct > map.get(label)!) map.set(label, pct);
      });
    });
    return map;
  }, [sessions]);

  const allCriteriaLabels = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) =>
      Object.values(s.report?.criteria_scores ?? {}).forEach((c) => set.add(c.label || "Critère")),
    );
    return Array.from(set);
  }, [sessions]);

  const bestScore = useMemo(
    () =>
      sessions.reduce<number | null>((acc, s) => {
        const v = s.report?.overall_score ?? null;
        if (v == null) return acc;
        return acc == null ? v : Math.max(acc, v);
      }, null),
    [sessions],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!project) return <p>Projet introuvable</p>;
  if (sessions.length === 0)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/projects/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <p className="text-muted-foreground">Aucun candidat sélectionné.</p>
      </div>
    );

  // Grid columns based on count
  const gridCols =
    sessions.length === 2
      ? "md:grid-cols-2"
      : sessions.length === 3
      ? "md:grid-cols-2 xl:grid-cols-3"
      : "md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link to={`/projects/${id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Comparaison</h1>
          <p className="text-sm text-muted-foreground">
            {project.title} · {sessions.length} candidat{sessions.length > 1 ? "s" : ""}
            {bestScore != null && <> · Meilleur score : {Math.round(bestScore)}%</>}
          </p>
        </div>
      </div>

      <div className={cn("grid gap-4 grid-cols-1", gridCols)}>
        {sessions.map((s) => (
          <CompareColumn
            key={s.id}
            session={s}
            questions={questions}
            allCriteriaLabels={allCriteriaLabels}
            bestByCriterion={bestByCriterion}
            isBestScore={s.report?.overall_score != null && s.report.overall_score === bestScore}
            onDecisionChange={handleDecisionChange}
            onRemove={() => removeColumn(s.id)}
            canRemove={sessions.length > 2}
          />
        ))}
      </div>
    </div>
  );
}

function CompareColumn({
  session,
  questions,
  allCriteriaLabels,
  bestByCriterion,
  isBestScore,
  onDecisionChange,
  onRemove,
  canRemove,
}: {
  session: SessionFull;
  questions: any[];
  allCriteriaLabels: string[];
  bestByCriterion: Map<string, number>;
  isBestScore: boolean;
  onDecisionChange: (sid: string, dec: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const r = session.report;
  const reco = r?.recommendation ? recoLabel[r.recommendation] : null;

  // Note recruteur — debounced save
  const [note, setNote] = useState(session.recruiter_note ?? "");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<number | null>(null);
  const initialRef = useRef(session.recruiter_note ?? "");

  useEffect(() => {
    if (note === initialRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaving("saving");
    timerRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("sessions")
        .update({ recruiter_note: note })
        .eq("id", session.id);
      if (!error) {
        initialRef.current = note;
        setSaving("saved");
        window.setTimeout(() => setSaving("idle"), 1500);
      } else {
        setSaving("idle");
      }
    }, 800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [note, session.id]);

  // Build criteria rows aligned on allCriteriaLabels
  const criteriaByLabel = useMemo(() => {
    const m = new Map<string, { score: number; max: number }>();
    Object.values(r?.criteria_scores ?? {}).forEach((c) => {
      m.set(c.label || "Critère", { score: c.score, max: c.max });
    });
    return m;
  }, [r]);

  const softSkills: string[] = useMemo(() => {
    const ss = r?.soft_skills;
    if (!ss) return [];
    if (Array.isArray(ss)) return ss.map((x: any) => (typeof x === "string" ? x : x?.label)).filter(Boolean);
    if (typeof ss === "object") return Object.keys(ss);
    return [];
  }, [r]);

  return (
    <div className="relative flex flex-col gap-3">
      {canRemove && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full bg-background shadow-sm"
          onClick={onRemove}
          aria-label="Retirer ce candidat"
        >
          <X className="h-4 w-4" />
        </Button>
      )}


      {/* 1. Bloc SessionCard */}
      <SessionCard
        session={session}
        report={r ? { overall_score: r.overall_score, recommendation: r.recommendation } : null}
        questions={questions}
        onDecisionChange={onDecisionChange}
      />

      {/* 2. Note recruteur */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Note recruteur
            <span className="text-[10px] font-normal text-muted-foreground">
              {saving === "saving" && "Enregistrement…"}
              {saving === "saved" && "Enregistré"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Vos impressions, points à creuser…"
            rows={3}
            className="resize-none text-sm"
          />
        </CardContent>
      </Card>

      {/* 3. Synthèse rapport */}
      {r ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Synthèse IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {r.executive_summary_short && (
              <p className="text-foreground leading-relaxed">{r.executive_summary_short}</p>
            )}
            {reco && (
              <div className="text-xs text-muted-foreground">
                Recommandation : <span className="font-medium text-foreground">{reco}</span>
              </div>
            )}

            {r.strengths && r.strengths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-success">Points forts</p>
                <ul className="space-y-1">
                  {r.strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.areas_for_improvement && r.areas_for_improvement.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-warning">Points de vigilance</p>
                <ul className="space-y-1">
                  {r.areas_for_improvement.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground">
            Aucun rapport disponible.
          </CardContent>
        </Card>
      )}

      {/* 4. Scores par critère */}
      {allCriteriaLabels.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scores par critère</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allCriteriaLabels.map((label) => {
              const c = criteriaByLabel.get(label);
              const pct = c && c.max ? c.score / c.max : null;
              const isBest = pct != null && bestByCriterion.get(label) === pct && pct > 0;
              return (
                <div
                  key={label}
                  className={cn(
                    "rounded-md px-2 py-1.5 transition-colors",
                    isBest && "bg-success/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1 truncate">
                      {isBest && <Trophy className="h-3 w-3 shrink-0 text-success" />}
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {c ? `${c.score}/${c.max}` : "—"}
                    </span>
                  </div>
                  {pct != null && (
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn("h-1.5 rounded-full", isBest ? "bg-success" : "bg-primary")}
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 5. Soft skills */}
      {softSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Soft skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {softSkills.map((ss, i) => (
                <Badge key={i} variant="secondary" className="text-[11px]">
                  {ss}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Lien rapport */}
      <Button variant="outline" size="sm" asChild>
        <Link to={`/sessions/${session.id}`}>
          Voir le rapport complet <ExternalLink className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
