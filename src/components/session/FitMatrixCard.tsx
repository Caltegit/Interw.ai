import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, LayoutGrid, Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export interface FitMatrixCriterion {
  id: string;
  label: string;
  weight: number;
}

export interface FitMatrixCell {
  score: number | null;
  justification?: string;
  quote?: string;
  message_id?: string;
}

export interface FitMatrixRow {
  question_id: string;
  question_index: number;
  question_title?: string | null;
  question_content: string;
  cells: Record<string, FitMatrixCell>;
}

export interface FitMatrixData {
  version: number;
  generated_at: string;
  criteria: FitMatrixCriterion[];
  rows: FitMatrixRow[];
}

interface QuestionRef {
  id: string;
  title?: string | null;
  content?: string | null;
}

interface Props {
  matrix?: FitMatrixData | null;
  sessionId?: string;
  questions?: QuestionRef[];
  readOnly?: boolean;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  if (score >= 40) return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function truncate(str: string, n: number) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

// Une case est considérée "informative" si l'IA a fourni une preuve
// (citation ou message vidéo associé). Sinon on la traite comme non évaluée :
// affichée blanche, non cliquable, exclue des moyennes.
function isInformative(cell: FitMatrixCell | undefined): boolean {
  if (!cell) return false;
  if (typeof cell.score !== "number") return false;
  return Boolean(cell.message_id) || Boolean(cell.quote);
}

export function FitMatrixCard({ matrix, sessionId, questions, readOnly, onGoToMessage }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const questionTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of questions ?? []) {
      if (q.id) map[q.id] = q.title?.trim() || "";
    }
    return map;
  }, [questions]);

  const hasMatrix = !!(matrix && matrix.rows && matrix.rows.length > 0);

  const columnAverages = useMemo(() => {
    if (!hasMatrix || !matrix) return {} as Record<string, number | null>;
    const out: Record<string, number | null> = {};
    for (const c of matrix.criteria) {
      const scores = matrix.rows
        .map((r) => r.cells[c.id])
        .filter(isInformative)
        .map((cell) => cell!.score as number);
      out[c.id] = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
    }
    return out;
  }, [matrix, hasMatrix]);

  const rowAverages = useMemo(() => {
    if (!hasMatrix || !matrix) return {} as Record<string, number | null>;
    const out: Record<string, number | null> = {};
    for (const r of matrix.rows) {
      let sum = 0;
      let weight = 0;
      for (const c of matrix.criteria) {
        const cell = r.cells[c.id];
        if (!isInformative(cell)) continue;
        const s = cell!.score as number;
        sum += s * (c.weight || 0);
        weight += c.weight || 0;
      }
      out[r.question_id] = weight > 0 ? Math.round(sum / weight) : null;
    }
    return out;
  }, [matrix, hasMatrix]);

  const handleGenerate = async () => {
    if (!sessionId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-fit-matrix", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Matrice générée", description: "Les détails sont maintenant disponibles." });
      await queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      await queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    } catch (e: any) {
      toast({
        title: "Génération impossible",
        description: e?.message ?? "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!hasMatrix) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-left">
            <LayoutGrid className="h-4 w-4 text-primary" /> Détail question par question
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Visualisez la note de chaque critère pour chaque question posée, avec la justification associée.
          </p>
          {!readOnly && sessionId && (
            <Button onClick={handleGenerate} disabled={generating} size="sm">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Voir les détails
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const m = matrix!;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-left">
          <LayoutGrid className="h-4 w-4 text-primary" /> Détail question par question
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <table className="w-full table-fixed border-separate border-spacing-1 text-sm">
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "10%" }} />
              {m.criteria.map((c) => (
                <col key={c.id} style={{ width: `${62 / m.criteria.length}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="bg-background text-left text-xs font-medium text-muted-foreground px-2 py-1">
                  Question
                </th>
                <th className="px-2 py-2 text-xs font-semibold text-primary text-center bg-primary/10 rounded-md">
                  Moyenne
                </th>
                {m.criteria.map((c) => (
                  <th
                    key={c.id}
                    className="px-2 py-1 text-xs font-medium text-muted-foreground text-center align-bottom leading-tight break-words"
                    title={`${c.label} · poids ${c.weight}%`}
                  >
                    <div className="break-words">{c.label}</div>
                    <div className="text-[10px] text-muted-foreground/70">{c.weight}%</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.rows.map((r) => {
                const title = r.question_title?.trim() || questionTitles[r.question_id] || "";
                return (
                <tr key={r.question_id}>
                  <td className="bg-background align-top px-2 py-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Q{(r.question_index ?? 0) + 1}
                    </div>
                    <div className="text-sm break-words" title={title || undefined}>
                      {title ? truncate(title, 90) : "Question sans titre"}
                    </div>
                  </td>
                  <td className="p-0.5 align-top bg-primary/5">
                    <div
                      className={cn(
                        "flex h-12 items-center justify-center rounded-md border text-sm font-semibold tabular-nums ring-1 ring-primary/20",
                        scoreTone(rowAverages[r.question_id] ?? null),
                      )}
                    >
                      {rowAverages[r.question_id] ?? "—"}
                    </div>
                  </td>
                  {m.criteria.map((c) => {
                    const cell = r.cells[c.id];
                    const score = cell?.score;
                    const informative = isInformative(cell);
                    if (!informative) {
                      return (
                        <td key={c.id} className="p-0.5 align-top">
                          <div
                            className="w-full h-12 rounded-md border border-dashed border-border/60 bg-background"
                            aria-label="Non évalué"
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={c.id} className="p-0.5 align-top">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "w-full h-12 rounded-md border text-sm font-semibold tabular-nums transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary",
                                scoreTone(score ?? null),
                              )}
                            >
                              {typeof score === "number" ? score : "—"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 space-y-2" side="top">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-muted-foreground">
                                Q{(r.question_index ?? 0) + 1} · {c.label}
                              </div>
                              <div
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                                  scoreTone(score ?? null),
                                )}
                              >
                                {typeof score === "number" ? `${score}/100` : "N/A"}
                              </div>
                            </div>
                            {cell?.justification && (
                              <p className="text-sm leading-relaxed">{cell.justification}</p>
                            )}
                            {cell?.quote && (
                              <blockquote className="border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                                « {cell.quote} »
                              </blockquote>
                            )}
                            {cell?.message_id && onGoToMessage && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => onGoToMessage(cell.message_id!)}
                              >
                                <Play className="mr-2 h-3.5 w-3.5" />
                                Voir la vidéo
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
              <tr>
                <td className="bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Moyenne
                </td>
                <td className="p-0.5 bg-primary/5" />
                {m.criteria.map((c) => (
                  <td key={c.id} className="p-0.5">
                    <div
                      className={cn(
                        "flex h-12 items-center justify-center rounded-md border text-sm font-semibold tabular-nums",
                        scoreTone(columnAverages[c.id] ?? null),
                      )}
                    >
                      {columnAverages[c.id] ?? "—"}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Cliquez sur une note pour voir la justification et sauter à l'extrait vidéo.
        </p>
      </CardContent>
    </Card>
  );
}
