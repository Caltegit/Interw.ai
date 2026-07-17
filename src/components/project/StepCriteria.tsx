import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookOpen, BookmarkPlus, Lock, Unlock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { CriteriaLibraryDialog, type LibraryCriterion } from "./CriteriaLibraryDialog";
import {
  addCriterionWeight,
  equalize,
  normalizeToTotal,
  rebalance,
  removeCriterionWeight,
} from "@/lib/rebalanceWeights";

export interface Criterion {
  label: string;
  description: string;
  weight: number;
  scoring_scale: string;
  anchors: Record<string, string>;
  applies_to: string;
  category?: string;
  from_library?: boolean;
  save_to_library?: boolean;
}

interface StepCriteriaProps {
  criteria: Criterion[];
  setCriteria: (c: Criterion[]) => void;
  totalWeight: number;
}

export function StepCriteria({ criteria, setCriteria }: StepCriteriaProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const focusIndexRef = useRef<number | null>(null);
  const labelRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (criteria.length === 0) return;
    const sum = criteria.reduce((s, c) => s + (c.weight || 0), 0);
    if (sum === 100) return;
    const normalized = normalizeToTotal(criteria.map((c) => c.weight || 0));
    setCriteria(criteria.map((c, i) => ({ ...c, weight: normalized[i] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.length]);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      const el = labelRefs.current[focusIndexRef.current];
      el?.focus();
      focusIndexRef.current = null;
    }
  }, [criteria.length]);

  const weights = useMemo(() => criteria.map((c) => c.weight || 0), [criteria]);

  const applyWeights = (next: number[]) => {
    setCriteria(criteria.map((c, i) => ({ ...c, weight: next[i] ?? 0 })));
  };

  const updateField = (i: number, patch: Partial<Criterion>) => {
    const updated = [...criteria];
    updated[i] = { ...updated[i], ...patch };
    setCriteria(updated);
  };

  const handleSliderChange = (index: number, value: number) => {
    if (locked.has(index)) return;
    const next = rebalance(weights, locked, index, value);
    applyWeights(next);
  };

  const toggleLock = (index: number) => {
    setLocked((prev) => {
      const n = new Set(prev);
      if (n.has(index)) n.delete(index);
      else n.add(index);
      return n;
    });
  };

  const handleEqualize = () => {
    const next = equalize(weights, locked);
    applyWeights(next);
  };

  const addNew = () => {
    if (criteria.length >= 10) return;
    const nextWeights = addCriterionWeight(weights, locked);
    const newCriterion: Criterion = {
      label: "",
      description: "",
      weight: nextWeights[nextWeights.length - 1],
      scoring_scale: "0-5",
      applies_to: "all_questions",
      anchors: {},
      category: "",
      save_to_library: false,
    };
    const merged = [...criteria, newCriterion].map((c, i) => ({
      ...c,
      weight: nextWeights[i] ?? c.weight,
    }));
    focusIndexRef.current = merged.length - 1;
    setCriteria(merged);
  };

  const handleLibrarySelect = (items: LibraryCriterion[]) => {
    const remaining = 10 - criteria.length;
    const toAdd = items.slice(0, remaining);
    if (toAdd.length === 0) return;
    const merged = [...criteria, ...toAdd];
    const normalized = equalize(
      merged.map((c) => c.weight || 0),
      locked,
    );
    setCriteria(merged.map((c, i) => ({ ...c, weight: normalized[i] })));
  };

  const removeCriterion = (i: number) => {
    const nextWeights = removeCriterionWeight(weights, locked, i);
    const remaining = criteria.filter((_, idx) => idx !== i);
    setCriteria(remaining.map((c, idx) => ({ ...c, weight: nextWeights[idx] ?? c.weight })));
    setLocked((prev) => {
      const n = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) n.add(idx);
        else if (idx > i) n.add(idx - 1);
      });
      return n;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Label className="text-base font-semibold">Critères d'évaluation</Label>
          <p className="text-sm text-muted-foreground">
            Ajustez l'importance de chaque critère, la pondération s'équilibre automatiquement.
          </p>
        </div>
        <div className="flex gap-2">
          {criteria.length >= 2 && (
            <Button variant="outline" size="sm" onClick={handleEqualize}>
              <Scale className="mr-1 h-4 w-4" /> Répartir équitablement
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)} disabled={criteria.length >= 10}>
            <BookOpen className="mr-1 h-4 w-4" /> Ressources
          </Button>
          <Button variant="outline" size="sm" onClick={addNew} disabled={criteria.length >= 10}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((c, i) => {
          const isLocked = locked.has(i);
          const canSaveToLibrary = !c.from_library;
          return (
            <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => toggleLock(i)}
                  aria-label={isLocked ? "Déverrouiller" : "Verrouiller"}
                  title={isLocked ? "Déverrouiller" : "Verrouiller la valeur"}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4 text-primary" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                <Input
                  ref={(el) => (labelRefs.current[i] = el)}
                  value={c.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder={`Critère ${i + 1}`}
                  className="flex-[0.55] min-w-0 h-9"
                />

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Slider
                    value={[c.weight || 0]}
                    min={0}
                    max={100}
                    step={1}
                    disabled={isLocked}
                    onValueChange={(v) => handleSliderChange(i, v[0])}
                    className={cn("w-full", isLocked && "opacity-60")}
                  />
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[44px] rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                      (c.weight || 0) > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {c.weight || 0}%
                  </span>
                </div>

                {canSaveToLibrary && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 shrink-0",
                      c.save_to_library && "text-primary",
                    )}
                    onClick={() => updateField(i, { save_to_library: !c.save_to_library })}
                    aria-label="Ajouter aux ressources"
                    title="Ajouter aux ressources"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeCriterion(i)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <p className="ml-10 text-xs text-primary">
                Guide pour l'IA : ce qu'il faut évaluer, mots clefs ou indices à repérer, réponse attendue...
              </p>

              <Textarea
                value={c.description}
                onChange={(e) => updateField(i, { description: e.target.value })}
                placeholder="Guide pour l'IA : ce qu'il faut évaluer, indices ou mots clefs à repérer, exemple attendus, bonne réponse attendue..."
                rows={2}
                className="ml-10 w-[calc(100%-2.5rem)] resize-y text-sm placeholder:text-primary"
              />
            </div>
          );
        })}
      </div>

      {criteria.length > 0 && (
        <p className="text-sm font-medium text-success">Total : 100% ✓</p>
      )}

      <CriteriaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
