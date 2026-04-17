import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, BookOpen, Type, Mic, Video, ChevronRight, Sparkles } from "lucide-react";
import { QuestionMediaRecorder } from "./QuestionMediaRecorder";
import { QuestionLibraryDialog } from "./QuestionLibraryDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState, useId } from "react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const TYPE_META: Record<Question["mediaType"], { label: string; Icon: typeof Type; className: string }> = {
  written: { label: "Écrite", Icon: Type, className: "bg-muted text-muted-foreground" },
  audio: { label: "Audio", Icon: Mic, className: "bg-primary/10 text-primary" },
  video: { label: "Vidéo", Icon: Video, className: "bg-accent text-accent-foreground" },
};

interface SortableQuestionProps {
  id: string;
  index: number;
  q: Question;
  questionsLength: number;
  isOpen: boolean;
  onToggle: () => void;
  updateQuestion: (index: number, field: keyof Question, value: any) => void;
  updateMediaType: (index: number, mediaType: "written" | "audio" | "video") => void;
  toggleFollowUp: (index: number) => void;
  updateAudio: (index: number, data: { blob: Blob | null; previewUrl: string | null }) => void;
  updateVideo: (index: number, data: { blob: Blob | null; previewUrl: string | null }) => void;
  removeQuestion: (index: number) => void;
}

function SortableQuestion({
  id,
  index,
  q,
  questionsLength,
  isOpen,
  onToggle,
  updateQuestion,
  updateMediaType,
  toggleFollowUp,
  updateAudio,
  updateVideo,
  removeQuestion,
}: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const meta = TYPE_META[q.mediaType];
  const TypeIcon = meta.Icon;
  const previewText = q.content.trim();

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-background overflow-hidden">
      {/* Compact header row */}
      <div className="flex items-center gap-2 px-2 py-1.5 min-h-[44px]">
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors p-1"
          {...attributes}
          {...listeners}
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-muted/40 rounded-md px-1 py-1 -mx-1 transition-colors"
          aria-expanded={isOpen}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
            )}
          />
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              meta.className,
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="truncate text-sm text-foreground">
            {previewText || `Question ${index + 1}`}
          </span>
          {q.follow_up_enabled && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Relance IA</span>
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => removeQuestion(index)}
          disabled={questionsLength <= 1}
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block text-muted-foreground">Type de question</Label>
            <ToggleGroup
              type="single"
              value={q.mediaType}
              onValueChange={(v) => { if (v) updateMediaType(index, v as "written" | "audio" | "video"); }}
            >
              <ToggleGroupItem value="written" className="text-xs gap-1">
                <Type className="h-3.5 w-3.5" /> Écrite
              </ToggleGroupItem>
              <ToggleGroupItem value="audio" className="text-xs gap-1">
                <Mic className="h-3.5 w-3.5" /> Audio
              </ToggleGroupItem>
              <ToggleGroupItem value="video" className="text-xs gap-1">
                <Video className="h-3.5 w-3.5" /> Vidéo
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Input
            placeholder={
              q.mediaType === "written"
                ? "Texte de la question..."
                : "Titre de la question (optionnel)..."
            }
            value={q.content}
            onChange={(e) => updateQuestion(index, "content", e.target.value)}
          />

          {(q.mediaType === "audio" || q.mediaType === "video") && (
            <div className="pt-1">
              <QuestionMediaRecorder
                mode={q.mediaType as "audio" | "video"}
                audioBlob={q.mediaType === "audio" ? q.audioBlob : null}
                audioPreviewUrl={q.mediaType === "audio" ? q.audioPreviewUrl : null}
                videoBlob={q.mediaType === "video" ? q.videoBlob : null}
                videoPreviewUrl={q.mediaType === "video" ? q.videoPreviewUrl : null}
                onAudioChange={(data) => updateAudio(index, data)}
                onVideoChange={(data) => updateVideo(index, data)}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={q.follow_up_enabled} onCheckedChange={() => toggleFollowUp(index)} id={`followup-${id}`} />
            <Label htmlFor={`followup-${id}`} className="text-xs text-muted-foreground cursor-pointer">
              Relance IA
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepQuestionsProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
}

export function StepQuestions({ questions, setQuestions }: StepQuestionsProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const dndId = useId();

  // Stable IDs for sortable items
  const [itemIds] = useState(() => questions.map(() => crypto.randomUUID()));
  const getIds = () => {
    while (itemIds.length < questions.length) itemIds.push(crypto.randomUUID());
    return itemIds.slice(0, questions.length);
  };
  const ids = getIds();

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = ids.findIndex(id => id === activeId);
    const newIndex = ids.findIndex(id => id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedIds = arrayMove([...ids], oldIndex, newIndex);
    itemIds.splice(0, itemIds.length, ...reorderedIds);
    setQuestions(arrayMove([...questions], oldIndex, newIndex));
  };

  const handleLibrarySelect = (selected: Question[]) => {
    const remaining = 15 - questions.length;
    const toAdd = selected.slice(0, remaining);
    toAdd.forEach(() => itemIds.push(crypto.randomUUID()));
    setQuestions([...questions, ...toAdd]);
    // Library imports stay collapsed by default
  };

  const addQuestion = () => {
    if (questions.length >= 15) return;
    const newId = crypto.randomUUID();
    itemIds.push(newId);
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "content") {
      updated[index].title = String(value).slice(0, 60);
    }
    setQuestions(updated);
  };

  const updateMediaType = (index: number, mediaType: "written" | "audio" | "video") => {
    const updated = [...questions];
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
    const removedId = ids[index];
    itemIds.splice(index, 1);
    setOpenIds((prev) => {
      if (!prev.has(removedId)) return prev;
      const next = new Set(prev);
      next.delete(removedId);
      return next;
    });
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Questions d'entretien</Label>
          <p className="text-sm text-muted-foreground">{questions.filter((q) => q.title.trim() || q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl).length} question(s) — glissez pour réordonner</p>
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

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <SortableQuestion
                key={ids[i]}
                id={ids[i]}
                index={i}
                q={q}
                questionsLength={questions.length}
                isOpen={openIds.has(ids[i])}
                onToggle={() => toggleOpen(ids[i])}
                updateQuestion={updateQuestion}
                updateMediaType={updateMediaType}
                toggleFollowUp={toggleFollowUp}
                updateAudio={updateAudio}
                updateVideo={updateVideo}
                removeQuestion={removeQuestion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <QuestionLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}
