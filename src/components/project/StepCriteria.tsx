import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Criterion {
  label: string;
  description: string;
  weight: number;
  scoring_scale: string;
  anchors: Record<string, string>;
  applies_to: string;
}

interface StepCriteriaProps {
  criteria: Criterion[];
  setCriteria: (c: Criterion[]) => void;
  totalWeight: number;
}

export function StepCriteria({ criteria, setCriteria, totalWeight }: StepCriteriaProps) {
  const addCriterion = () => {
    if (criteria.length >= 10) return;
    setCriteria([...criteria, { label: "", description: "", weight: 0, scoring_scale: "0-5", anchors: {}, applies_to: "all_questions" }]);
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const weightColor = totalWeight === 100 ? "text-success" : totalWeight > 100 ? "text-destructive" : "text-warning";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Critères d'évaluation</Label>
          <p className={`text-sm font-medium ${weightColor}`}>
            Pondération totale : {totalWeight}% {totalWeight === 100 ? "✓" : totalWeight > 100 ? "(trop élevée)" : "(doit atteindre 100%)"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addCriterion} disabled={criteria.length >= 10}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {criteria.map((c, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Libellé</Label>
                <Input placeholder="Clarté d'expression" value={c.label} onChange={(e) => updateCriterion(i, "label", e.target.value)} />
              </div>
              <div className="w-24">
                <Label className="text-xs">Poids %</Label>
                <Input type="number" min={0} max={100} value={c.weight} onChange={(e) => updateCriterion(i, "weight", Number(e.target.value))} />
              </div>
              <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeCriterion(i)} disabled={criteria.length <= 1}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div>
              <Label className="text-xs">Description (guide pour l'IA)</Label>
              <Textarea placeholder="Évaluer si le candidat s'exprime de manière structurée..." value={c.description} onChange={(e) => updateCriterion(i, "description", e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3">
              <div>
                <Label className="text-xs">Échelle</Label>
                <Select value={c.scoring_scale} onValueChange={(v) => updateCriterion(i, "scoring_scale", v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5">0 à 5</SelectItem>
                    <SelectItem value="0-10">0 à 10</SelectItem>
                    <SelectItem value="ABC">A / B / C / D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Application</Label>
                <Select value={c.applies_to} onValueChange={(v) => updateCriterion(i, "applies_to", v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_questions">Tous les échanges</SelectItem>
                    <SelectItem value="specific_questions">Questions spécifiques</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
