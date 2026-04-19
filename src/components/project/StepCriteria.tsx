import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, BookOpen, Pencil, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CriterionFormDialog,
  EMPTY_CRITERION_FORM,
  type CriterionFormValue,
} from "@/components/CriterionFormDialog";
import { CriteriaLibraryDialog, type LibraryCriterion } from "./CriteriaLibraryDialog";

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

export function StepCriteria({ criteria, setCriteria, totalWeight }: StepCriteriaProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState<CriterionFormValue>(EMPTY_CRITERION_FORM);

  const weightColor =
    totalWeight === 100 ? "text-success" : totalWeight > 100 ? "text-destructive" : "text-warning";

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
    const base: Criterion = {
      label: form.label,
      description: form.description,
      weight: form.weight,
      scoring_scale: form.scoring_scale,
      applies_to: form.applies_to,
      anchors: form.anchors,
      category: form.category,
      save_to_library: !!form.saveToLibrary,
    };
    if (editingIndex === null) {
      setCriteria([...criteria, base]);
    } else {
      const updated = [...criteria];
      updated[editingIndex] = { ...updated[editingIndex], ...base };
      setCriteria(updated);
    }
    setFormOpen(false);
  };

  const handleLibrarySelect = (items: LibraryCriterion[]) => {
    const remaining = 10 - criteria.length;
    setCriteria([...criteria, ...items.slice(0, remaining)]);
  };

  const removeCriterion = (i: number) => {
    setCriteria(criteria.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Critères d'évaluation</Label>
          <p className={`text-sm font-medium ${weightColor}`}>
            Pondération totale : {totalWeight}%{" "}
            {totalWeight === 100 ? "✓" : totalWeight > 100 ? "(trop élevée)" : "(doit atteindre 100%)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)} disabled={criteria.length >= 10}>
            <BookOpen className="mr-1 h-4 w-4" /> Bibliothèque
          </Button>
          <Button variant="outline" size="sm" onClick={openNew} disabled={criteria.length >= 10}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {criteria.map((c, i) => (
          <div key={i} className="rounded-lg border bg-background overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-1.5 min-h-[44px]">
              <button
                type="button"
                onClick={() => openEdit(i)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-muted/40 rounded-md px-2 py-1 transition-colors"
              >
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                    c.weight > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {c.weight}%
                </span>
                <span className="truncate text-sm text-foreground">
                  {c.label.trim() || `Critère ${i + 1}`}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground hidden sm:inline">
                  {c.scoring_scale}
                </span>
                {c.save_to_library && !c.from_library && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-primary">
                    <BookmarkPlus className="h-3 w-3" />
                    <span className="hidden sm:inline">Bibliothèque</span>
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
          </div>
        ))}
      </div>

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
