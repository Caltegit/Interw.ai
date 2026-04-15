import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, BookOpen } from "lucide-react";
import { QuestionMediaRecorder } from "./QuestionMediaRecorder";
import { QuestionLibraryDialog } from "./QuestionLibraryDialog";
import { useState } from "react";

export interface Question {
  content: string;
  type: string;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  audioBlob: Blob | null;
  audioPreviewUrl: string | null;
  videoBlob: Blob | null;
  videoPreviewUrl: string | null;
}

export const createEmptyQuestion = (): Question => ({
  content: "",
  type: "open",
  follow_up_enabled: false,
  max_follow_ups: 0,
  audioBlob: null,
  audioPreviewUrl: null,
  videoBlob: null,
  videoPreviewUrl: null,
});

interface StepQuestionsProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
}

export function StepQuestions({ questions, setQuestions }: StepQuestionsProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleLibrarySelect = (selected: Question[]) => {
    const remaining = 15 - questions.length;
    const toAdd = selected.slice(0, remaining);
    setQuestions([...questions, ...toAdd]);
  };

  const addQuestion = () => {
    if (questions.length >= 15) return;
    setQuestions([...questions, createEmptyQuestion()]);
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

  const updateAudio = (index: number, data: { blob: Blob | null; previewUrl: string | null }) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], audioBlob: data.blob, audioPreviewUrl: data.previewUrl };
    setQuestions(updated);
  };

  const updateVideo = (index: number, data: { blob: Blob | null; previewUrl: string | null }) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], videoBlob: data.blob, videoPreviewUrl: data.previewUrl };
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)} disabled={questions.length >= 15}>
            <BookOpen className="mr-1 h-4 w-4" /> Bibliothèque
          </Button>
          <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 15}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
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
            <div className="pl-7">
              <QuestionMediaRecorder
                audioBlob={q.audioBlob}
                audioPreviewUrl={q.audioPreviewUrl}
                videoBlob={q.videoBlob}
                videoPreviewUrl={q.videoPreviewUrl}
                onAudioChange={(data) => updateAudio(i, data)}
                onVideoChange={(data) => updateVideo(i, data)}
              />
            </div>
          </div>
        ))}
      </div>

      <QuestionLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
