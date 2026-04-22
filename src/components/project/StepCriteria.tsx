import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, BookOpen, Pencil, BookmarkPlus, Lock, Unlock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CriterionFormDialog,
  EMPTY_CRITERION_FORM,
  type CriterionFormValue,
} from "@/components/CriterionFormDialog";
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState<CriterionFormValue>(EMPTY_CRITERION_FORM);
  const [locked, setLocked] = useState<Set<number>>(new Set());

  // Normalise stored weights to total 100 on first mount or when count changes from 0.
  useEffect(() => {
    if (criteria.length === 0) return;
    const sum = criteria.reduce((s, c) => s + (c.weight || 0), 0);
    if (sum === 100) return;
    const normalized = normalizeToTotal(criteria.map((c) => c.weight || 0));
    setCriteria(criteria.map((c, i) => ({ ...c, weight: normalized[i] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.length]);

  const weights = useMemo(() => criteria.map((c) => c.weight || 0), [criteria]);

  const applyWeights = (next: number[]) => {
    setCriteria(criteria.map((c, i) => ({ ...c, weight: next[i] ?? 0 })));
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

  const openNew = () => {
    if (criteria.length >= 10) return;
    setEditingIndex(null);
    setInitialForm({ ...EMPTY_CRITERION_FORM, saveToLibrary: false });
    setFormOpen(true);
  };

  const openEdit = (i: number) => {
    const c = criteria[i];
    setEditingIndex(i);
    setInitialForm({
      label: c.label,
      description: c.description,
      weight: c.weight,
      scoring_scale: c.scoring_scale,
      applies_to: c.applies_to,
      anchors: c.anchors || {},
      category: c.category || "",
      saveToLibrary: !!c.save_to_library,
    });
    setFormOpen(true);
  };

  const handleFormSubmit = (form: CriterionFormValue) => {
    if (editingIndex === null) {
      // Add: compute new weights array with auto-balanced new entry.
      const nextWeights = addCriterionWeight(weights, locked);
      const newCriterion: Criterion = {
        label: form.label,
        description: form.description,
        weight: nextWeights[nextWeights.length - 1],
        scoring_scale: form.scoring_scale,
        applies_to: form.applies_to,
        anchors: form.anchors,
        category: form.category,
        save_to_library: !!form.saveToLibrary,
      };
      const merged = [...criteria, newCriterion].map((c, i) => ({
        ...c,
        weight: nextWeights[i] ?? c.weight,
      }));
      setCriteria(merged);
    } else {
      const updated = [...criteria];
      updated[editingIndex] = {
        ...updated[editingIndex],
        label: form.label,
        description: form.description,
        scoring_scale: form.scoring_scale,
        applies_to: form.applies_to,
        anchors: form.anchors,
        category: form.category,
        save_to_library: !!form.saveToLibrary,
      };
      setCriteria(updated);
    }
    setFormOpen(false);
  };

  const handleLibrarySelect = (items: LibraryCriterion[]) => {
    const remaining = 10 - criteria.length;
    const toAdd = items.slice(0, remaining);
    if (toAdd.length === 0) return;
    const merged = [...criteria, ...toAdd];
    // Distribute equally across all unlocked criteria after import.
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
            <BookOpen className="mr-1 h-4 w-4" /> Bibliothèque
          </Button>
          <Button variant="outline" size="sm" onClick={openNew} disabled={criteria.length >= 10}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {criteria.map((c, i) => {
          const isLocked = locked.has(i);
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

                <button
                  type="button"
                  onClick={() => openEdit(i)}
                  className="flex-1 min-w-0 text-left hover:bg-muted/40 rounded-md px-2 py-1 transition-colors"
                >
                  <span className="truncate block text-sm text-foreground">
                    {c.label.trim() || `Critère ${i + 1}`}
                  </span>
                  {c.save_to_library && !c.from_library && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary mt-0.5">
                      <BookmarkPlus className="h-3 w-3" />
                      Bibliothèque
                    </span>
                  )}
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => openEdit(i)}
                  aria-label="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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

              <div className="flex items-center gap-3 pl-10 pr-1">
                <Slider
                  value={[c.weight || 0]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={isLocked}
                  onValueChange={(v) => handleSliderChange(i, v[0])}
                  className={cn("flex-1", isLocked && "opacity-60")}
                />
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center min-w-[44px] rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                    (c.weight || 0) > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {c.weight || 0}%
                </span>
              </div>
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

      <CriterionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={initialForm}
        isEditing={editingIndex !== null}
        showSaveToLibrary={editingIndex === null || !criteria[editingIndex]?.from_library}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
