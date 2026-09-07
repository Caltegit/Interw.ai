import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Lock, LockOpen, RotateCcw, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { rebalance } from "@/lib/rebalanceWeights";

export interface WeightableCriterion {
  label: string;
  weight: number;
}

interface Props {
  /** Critères du poste (étape précédente), dans l'ordre */
  criteria: WeightableCriterion[];
  /** Poids propres à la question, alignés sur l'ordre des critères. null = pondération du poste. */
  value: number[] | null;
  onChange: (weights: number[] | null) => void;
}

/**
 * Bloc dépliant « Pondération des critères par question ».
 * Tant que l'utilisateur ne touche à rien (value = null), la notation
 * globale du poste s'applique telle quelle.
 */
export function QuestionCriteriaWeights({ criteria, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState<Set<number>>(new Set());

  const usable = useMemo(
    () =>
      criteria
        .map((c, index) => ({ ...c, index }))
        .filter((c) => c.label.trim()),
    [criteria],
  );

  const defaults = useMemo(() => usable.map((c) => Math.max(0, c.weight || 0)), [usable]);

  // Poids affichés : réglage de la question, sinon pondération du poste.
  const displayed = useMemo(() => {
    if (value && value.length === usable.length) return value;
    return defaults;
  }, [value, usable.length, defaults]);

  const isCustom = value !== null && value.length === usable.length;

  if (usable.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Définis d'abord les critères à l'étape précédente pour pondérer cette question.
      </div>
    );
  }

  const toggleLock = (idx: number) => {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSlide = (usableIdx: number, next: number) => {
    if (locked.has(usableIdx)) return;
    const base = isCustom ? [...displayed] : [...defaults];
    const rebalanced = rebalance(base, locked, usableIdx, next);
    onChange(rebalanced);
  };

  const handleReset = () => {
    setLocked(new Set());
    onChange(null);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
            <Scale className="h-3.5 w-3.5 shrink-0 text-primary" />
            Pondération des critères par question
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 rounded-md border border-t-0 bg-muted/10 px-3 pb-3 pt-3">
        <div className="space-y-3">
          {usable.map((c, i) => {
            const w = displayed[i] ?? 0;
            const isLocked = locked.has(i);
            return (
              <div key={c.index} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", w === 0 && "text-muted-foreground")}>
                    {c.label.trim()}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        w === 0 ? "text-muted-foreground" : "text-primary",
                      )}
                    >
                      {w}%
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLock(i)}
                      aria-label={isLocked ? `Déverrouiller ${c.label.trim()}` : `Verrouiller ${c.label.trim()}`}
                      aria-pressed={isLocked}
                      className={cn(
                        "rounded p-1 transition-colors",
                        isLocked ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </button>
                  </span>
                </div>
                <Slider
                  value={[w]}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isLocked}
                  onValueChange={([v]) => handleSlide(i, v)}
                  aria-label={`Poids de ${c.label.trim()} pour cette question`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Le cadenas fige un critère. 0% = critère non évalué par cette question. Le total reste à 100.
          </p>
          {isCustom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleReset}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
