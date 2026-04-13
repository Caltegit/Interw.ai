import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    setQuestions([...questions, { content: "", type: "open", follow_up_enabled: false, max_follow_ups: 0 }]);
  };

  const updateQuestion = (index: number, content: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], content };
    setQuestions(updated);
  };

  const toggleFollowUp = (index: number) => {
    const updated = [...questions];
    const enabled = !updated[index].follow_up_enabled;
    updated[index] = { ...updated[index], follow_up_enabled: enabled, max_follow_ups: enabled ? 2 : 0 };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Questions d'entretien</Label>
          <p className="text-sm text-muted-foreground">{questions.filter((q) => q.content.trim()).length} question(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 15}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab" />
              <Input
                className="flex-1"
                placeholder={`Question ${i + 1}...`}
                value={q.content}
                onChange={(e) => updateQuestion(i, e.target.value)}
              />
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)} disabled={questions.length <= 1}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2 pl-7">
              <Switch checked={q.follow_up_enabled} onCheckedChange={() => toggleFollowUp(i)} id={`followup-${i}`} />
              <Label htmlFor={`followup-${i}`} className="text-sm text-muted-foreground cursor-pointer">
                Relance IA
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
  const addQuestion = () => {
    if (questions.length >= 15) return;
    setQuestions([...questions, { content: "", type: "open", follow_up_enabled: false, max_follow_ups: 0 }]);
  };

  const updateQuestion = (index: number, content: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], content };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Questions d'entretien</Label>
          <p className="text-sm text-muted-foreground">{questions.filter((q) => q.content.trim()).length} question(s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 15}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="flex gap-2 items-center rounded-lg border p-3">
            <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab" />
            <Input
              className="flex-1"
              placeholder={`Question ${i + 1}...`}
              value={q.content}
              onChange={(e) => updateQuestion(i, e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)} disabled={questions.length <= 1}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
