import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, BookOpen, Type, Mic, Video } from "lucide-react";
import { QuestionMediaRecorder } from "./QuestionMediaRecorder";
import { QuestionLibraryDialog } from "./QuestionLibraryDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

export interface Question {
  title: string;
  content: string;
  type: string;
  mediaType: "written" | "audio" | "video";
  follow_up_enabled: boolean;
  max_follow_ups: number;
  audioBlob: Blob | null;
  audioPreviewUrl: string | null;
  videoBlob: Blob | null;
  videoPreviewUrl: string | null;
}

export const createEmptyQuestion = (): Question => ({
  title: "",
  content: "",
  type: "open",
  mediaType: "written",
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

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateMediaType = (index: number, mediaType: "written" | "audio" | "video") => {
    const updated = [...questions];
    // Clear media when switching type
    updated[index] = {
      ...updated[index],
      mediaType,
      audioBlob: mediaType === "audio" ? updated[index].audioBlob : null,
      audioPreviewUrl: mediaType === "audio" ? updated[index].audioPreviewUrl : null,
      videoBlob: mediaType === "video" ? updated[index].videoBlob : null,
      videoPreviewUrl: mediaType === "video" ? updated[index].videoPreviewUrl : null,
    };
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
          <p className="text-sm text-muted-foreground">{questions.filter((q) => q.title.trim() || q.content.trim()).length} question(s)</p>
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
          <div key={i} className="rounded-lg border p-3 space-y-3">
            <div className="flex gap-2 items-start">
              <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab mt-1" />
              <div className="flex-1 space-y-2">
                {/* Type selector */}
                <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">Type de question</Label>
                  <ToggleGroup
                    type="single"
                    value={q.mediaType}
                    onValueChange={(v) => { if (v) updateMediaType(i, v as "written" | "audio" | "video"); }}
                  >
                    <ToggleGroupItem value="written" className="text-xs gap-1">
                      <Type className="h-3.5 w-3.5" /> Texte
                    </ToggleGroupItem>
                    <ToggleGroupItem value="audio" className="text-xs gap-1">
                      <Mic className="h-3.5 w-3.5" /> Audio
                    </ToggleGroupItem>
                    <ToggleGroupItem value="video" className="text-xs gap-1">
                      <Video className="h-3.5 w-3.5" /> Vidéo
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Title (required) */}
                <div>
                  <Input
                    placeholder={`Titre de la question ${i + 1} *`}
                    value={q.title}
                    onChange={(e) => updateQuestion(i, "title", e.target.value)}
                    className="font-medium"
                  />
                  {!q.title.trim() && (q.content.trim() || q.audioBlob || q.videoBlob) && (
                    <p className="text-[10px] text-destructive mt-0.5">Le titre est obligatoire</p>
                  )}
                </div>

                {/* Content */}
                <Input
                  placeholder={q.mediaType === "written" ? `Contenu de la question ${i + 1}...` : "Description / contexte (optionnel)..."}
                  value={q.content}
                  onChange={(e) => updateQuestion(i, "content", e.target.value)}
                />

                {/* Media recorder for audio/video */}
                {(q.mediaType === "audio" || q.mediaType === "video") && (
                  <div className="pt-1">
                    <QuestionMediaRecorder
                      audioBlob={q.mediaType === "audio" ? q.audioBlob : null}
                      audioPreviewUrl={q.mediaType === "audio" ? q.audioPreviewUrl : null}
                      videoBlob={q.mediaType === "video" ? q.videoBlob : null}
                      videoPreviewUrl={q.mediaType === "video" ? q.videoPreviewUrl : null}
                      onAudioChange={(data) => updateAudio(i, data)}
                      onVideoChange={(data) => updateVideo(i, data)}
                    />
                  </div>
                )}
              </div>
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

      <QuestionLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
