import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  Type,
  Mic,
  Video,
  Sparkles,
  BookmarkPlus,
  Pencil,
} from "lucide-react";
import { QuestionLibraryDialog } from "./QuestionLibraryDialog";
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
import {
  QuestionFormDialog,
  EMPTY_QUESTION_FORM,
  type QuestionFormValue,
} from "@/components/QuestionFormDialog";

export interface Question {
  title: string;
  content: string;
  category: string;
  type: string;
  mediaType: "written" | "audio" | "video";
  follow_up_enabled: boolean;
  max_follow_ups: number;
  relance_level: "light" | "medium" | "deep";
  audioBlob: Blob | null;
  audioPreviewUrl: string | null;
  videoBlob: Blob | null;
  videoPreviewUrl: string | null;
  /** true si la question vient d'un import depuis la bibliothèque */
  from_library?: boolean;
  /** true si l'utilisateur veut sauvegarder cette question dans la bibliothèque à la sauvegarde du projet */
  save_to_library?: boolean;
}

export const createEmptyQuestion = (): Question => ({
  title: "",
  content: "",
  category: "",
  type: "open",
  mediaType: "written",
  follow_up_enabled: false,
  max_follow_ups: 0,
  relance_level: "medium",
  audioBlob: null,
  audioPreviewUrl: null,
  videoBlob: null,
  videoPreviewUrl: null,
  from_library: false,
  save_to_library: false,
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
  onEdit: () => void;
  removeQuestion: (index: number) => void;
}

function SortableQuestion({
  id,
  index,
  q,
  questionsLength,
  onEdit,
  removeQuestion,
}: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const meta = TYPE_META[q.mediaType];
  const TypeIcon = meta.Icon;
  const previewText = q.title.trim() || q.content.trim();

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-background overflow-hidden">
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
          onClick={onEdit}
          className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-muted/40 rounded-md px-1 py-1 -mx-1 transition-colors"
        >
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
          {q.save_to_library && !q.from_library && (
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
          onClick={onEdit}
          aria-label="Modifier"
        >
          <Pencil className="h-4 w-4" />
        </Button>
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
    </div>
  );
}

export type RelanceLevel = "light" | "medium" | "deep";

interface StepQuestionsProps {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  relanceLevel?: RelanceLevel;
  setRelanceLevel?: (v: RelanceLevel) => void;
}

export function StepQuestions({ questions, setQuestions, relanceLevel, setRelanceLevel }: StepQuestionsProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState<QuestionFormValue>(EMPTY_QUESTION_FORM);
  const dndId = useId();

  // Stable IDs for sortable items
  const [itemIds] = useState(() => questions.map(() => crypto.randomUUID()));
  const getIds = () => {
    while (itemIds.length < questions.length) itemIds.push(crypto.randomUUID());
    return itemIds.slice(0, questions.length);
  };
  const ids = getIds();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = ids.findIndex((id) => id === activeId);
    const newIndex = ids.findIndex((id) => id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedIds = arrayMove([...ids], oldIndex, newIndex);
    itemIds.splice(0, itemIds.length, ...reorderedIds);
    setQuestions(arrayMove([...questions], oldIndex, newIndex));
  };

  const handleLibrarySelect = (selected: Question[]) => {
    const remaining = 15 - questions.length;
    const toAdd = selected.slice(0, remaining).map((q) => ({ ...q, from_library: true, save_to_library: false }));
    toAdd.forEach(() => itemIds.push(crypto.randomUUID()));
    setQuestions([...questions, ...toAdd]);
  };

  const openNew = () => {
    if (questions.length >= 15) return;
    setEditingIndex(null);
    setInitialForm({ ...EMPTY_QUESTION_FORM, followUp: false, saveToLibrary: false });
    setFormOpen(true);
  };

  const openEdit = (index: number) => {
    const q = questions[index];
    setEditingIndex(index);
    setInitialForm({
      title: q.title,
      content: q.content,
      category: q.category,
      mediaType: q.mediaType,
      followUp: q.follow_up_enabled,
      relanceLevel: q.relance_level ?? "medium",
      mediaBlob: q.mediaType === "audio" ? q.audioBlob : q.mediaType === "video" ? q.videoBlob : null,
      mediaPreviewUrl:
        q.mediaType === "audio" ? q.audioPreviewUrl : q.mediaType === "video" ? q.videoPreviewUrl : null,
      existingAudioUrl: q.audioPreviewUrl,
      existingVideoUrl: q.videoPreviewUrl,
      saveToLibrary: q.save_to_library,
    });
    setFormOpen(true);
  };

  const handleFormSubmit = (form: QuestionFormValue) => {
    const baseFromForm: Partial<Question> = {
      title: form.title,
      content: form.content,
      category: form.category,
      mediaType: form.mediaType,
      follow_up_enabled: form.relanceLevel !== "light",
      max_follow_ups: form.relanceLevel === "deep" ? 2 : form.relanceLevel === "medium" ? 1 : 0,
      relance_level: form.relanceLevel,
      audioBlob: form.mediaType === "audio" ? form.mediaBlob : null,
      audioPreviewUrl: form.mediaType === "audio" ? form.mediaPreviewUrl : null,
      videoBlob: form.mediaType === "video" ? form.mediaBlob : null,
      videoPreviewUrl: form.mediaType === "video" ? form.mediaPreviewUrl : null,
      save_to_library: !!form.saveToLibrary,
    };

    if (editingIndex === null) {
      const newQ: Question = { ...createEmptyQuestion(), ...baseFromForm } as Question;
      itemIds.push(crypto.randomUUID());
      setQuestions([...questions, newQ]);
    } else {
      const updated = [...questions];
      updated[editingIndex] = { ...updated[editingIndex], ...baseFromForm } as Question;
      setQuestions(updated);
    }
    setFormOpen(false);
  };

  const removeQuestion = (index: number) => {
    itemIds.splice(index, 1);
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {setRelanceLevel && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-sm font-semibold">Comportement de l'IA</Label>
              <p className="text-xs text-muted-foreground">
                Niveau de relance et de reformulation pendant l'entretien.
              </p>
            </div>
            <Select
              value={relanceLevel ?? "medium"}
              onValueChange={(v) => setRelanceLevel(v as RelanceLevel)}
            >
              <SelectTrigger className="w-[180px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Léger — pas de relance</SelectItem>
                <SelectItem value="medium">Moyen — 1 relance</SelectItem>
                <SelectItem value="deep">Approfondi — 2 relances</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Questions d'entretien</Label>
          <p className="text-sm text-muted-foreground">
            {questions.filter((q) => q.title.trim() || q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl).length} question(s) — glissez pour réordonner
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)} disabled={questions.length >= 15}>
            <BookOpen className="mr-1 h-4 w-4" /> Bibliothèque
          </Button>
          <Button variant="outline" size="sm" onClick={openNew} disabled={questions.length >= 15}>
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
                onEdit={() => openEdit(i)}
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

      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={initialForm}
        isEditing={editingIndex !== null}
        showSaveToLibrary={editingIndex === null || !questions[editingIndex]?.from_library}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
