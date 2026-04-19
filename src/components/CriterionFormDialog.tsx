import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BookmarkPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Soft skills", "Hard skills", "Culture fit", "Leadership", "Motivation", "Communication"];

export interface CriterionFormValue {
  label: string;
  description: string;
  weight: number;
  scoring_scale: string;
  applies_to: string;
  category: string;
  anchors: Record<string, string>;
  saveToLibrary?: boolean;
}

export const EMPTY_CRITERION_FORM: CriterionFormValue = {
  label: "",
  description: "",
  weight: 0,
  scoring_scale: "0-5",
  applies_to: "all_questions",
  category: "",
  anchors: {},
  saveToLibrary: false,
};

interface CriterionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CriterionFormValue;
  isEditing?: boolean;
  showSaveToLibrary?: boolean;
  saving?: boolean;
  onSubmit: (value: CriterionFormValue) => void | Promise<void>;
}

export function CriterionFormDialog({
  open,
  onOpenChange,
  initial,
  isEditing = false,
  showSaveToLibrary = false,
  saving = false,
  onSubmit,
}: CriterionFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<CriterionFormValue>(initial ?? EMPTY_CRITERION_FORM);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_CRITERION_FORM);
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!form.label.trim()) {
      toast({ title: "Libellé requis", description: "Donne un nom au critère.", variant: "destructive" });
      return;
    }
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditing ? "Modifier le critère" : "Nouveau critère"}</DialogTitle>
          <DialogDescription>
            Définis ce que l'IA doit évaluer chez le candidat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Critère</h3>
            <div className="space-y-1.5">
              <Label htmlFor="cfd-label" className="text-xs">Libellé</Label>
              <Input
                id="cfd-label"
                placeholder="Ex: Clarté d'expression"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfd-desc" className="text-xs">Description (guide pour l'IA)</Label>
              <Textarea
                id="cfd-desc"
                placeholder="Évaluer si le candidat s'exprime de manière structurée..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie</Label>
              <Select
                value={form.category || "_none"}
                onValueChange={(v) => setForm({ ...form, category: v === "_none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notation</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Poids %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Échelle</Label>
                <Select value={form.scoring_scale} onValueChange={(v) => setForm({ ...form, scoring_scale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5">0 à 5</SelectItem>
                    <SelectItem value="0-10">0 à 10</SelectItem>
                    <SelectItem value="ABC">A / B / C / D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Application</Label>
                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_questions">Tous</SelectItem>
                    <SelectItem value="specific_questions">Spécifique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {showSaveToLibrary && (
            <section className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                <Checkbox
                  id="cfd-save-lib"
                  checked={!!form.saveToLibrary}
                  onCheckedChange={(v) => setForm({ ...form, saveToLibrary: v === true })}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="cfd-save-lib"
                  className="cursor-pointer text-sm leading-snug font-normal"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
                    Ajouter à ma bibliothèque
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Le critère sera réutilisable dans tes prochains projets.
                  </span>
                </Label>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement..." : isEditing ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
