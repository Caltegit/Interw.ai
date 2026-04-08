import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Question {
  content: string;
  type: string;
  follow_up_enabled: boolean;
  max_follow_ups: number;
}

interface StepQuestionsProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
}

export function StepQuestions({ questions, setQuestions }: StepQuestionsProps) {
  const addQuestion = () => {
    if (questions.length >= 15) return;
    setQuestions([...questions, { content: "", type: "open", follow_up_enabled: true, max_follow_ups: 2 }]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const estimatedDuration = questions.filter((q) => q.content.trim()).length * 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Questions d'entretien</Label>
          <p className="text-sm text-muted-foreground">Durée estimée : ~{estimatedDuration} min</p>
        </div>
        <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 15}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="flex gap-2 items-start rounded-lg border p-3">
            <GripVertical className="mt-2 h-5 w-5 text-muted-foreground shrink-0 cursor-grab" />
            <div className="flex-1 space-y-2">
              <Input
                placeholder={`Question ${i + 1}...`}
                value={q.content}
                onChange={(e) => updateQuestion(i, "content", e.target.value)}
              />
              <div className="flex flex-wrap gap-3 items-center">
                <Select value={q.type} onValueChange={(v) => updateQuestion(i, "type", v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouverte</SelectItem>
                    <SelectItem value="situational">Situationnelle</SelectItem>
                    <SelectItem value="motivation">Motivation</SelectItem>
                    <SelectItem value="technical">Technique</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={q.follow_up_enabled}
                    onCheckedChange={(v) => updateQuestion(i, "follow_up_enabled", v)}
                  />
                  <span className="text-xs text-muted-foreground">Relances</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)} disabled={questions.length <= 1}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
