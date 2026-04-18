import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  Type,
  Mic,
  Video,
  ChevronRight,
  Sparkles,
  Info,
  BookmarkPlus,
} from "lucide-react";
import { QuestionLibraryDialog } from "./QuestionLibraryDialog";
import { QuestionMediaEditor } from "@/components/library/QuestionMediaEditor";
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

const CATEGORIES = ["Motivation", "Technique", "Soft skills", "Situationnel", "Culture fit", "Leadership"];
const MAX_CONTENT = 500;

export interface Question {
  title: string;
  content: string;
  category: string;
  type: string;
  mediaType: "written" | "audio" | "video";
  follow_up_enabled: boolean;
  max_follow_ups: number;
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
  const previewText = q.title.trim() || q.content.trim();
  const overLimit = q.content.length > MAX_CONTENT;

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
          onClick={() => removeQuestion(index)}
          disabled={questionsLength <= 1}
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Expanded content — same layout as library editor */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t space-y-5">
          {/* Section Question */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor={`q-title-${id}`} className="text-xs">
                Titre court
              </Label>
              <Input
                id={`q-title-${id}`}
                placeholder="Ex: Présentez-vous"
                value={q.title}
                onChange={(e) => updateQuestion(index, "title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`q-content-${id}`} className="text-xs">
                  Texte de la question
                </Label>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    overLimit ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {q.content.length}/{MAX_CONTENT}
                </span>
              </div>
              <Textarea
                id={`q-content-${id}`}
                placeholder="Parlez-moi de votre parcours..."
                rows={3}
                value={q.content}
                onChange={(e) => updateQuestion(index, "content", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie</Label>
              <Select
                value={q.category || "_none"}
                onValueChange={(v) => updateQuestion(index, "category", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Section Format */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Format de présentation
            </h3>
            <ToggleGroup
              type="single"
              value={q.mediaType}
              className="justify-start"
              onValueChange={(v) => {
                if (v) updateMediaType(index, v as "written" | "audio" | "video");
              }}
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

            {(q.mediaType === "audio" || q.mediaType === "video") && (
              <QuestionMediaEditor
                type={q.mediaType}
                existingUrl={
                  q.mediaType === "audio" ? q.audioPreviewUrl : q.videoPreviewUrl
                }
                onMediaReady={(blob, url) => {
                  if (q.mediaType === "audio") updateAudio(index, { blob, previewUrl: url });
                  else updateVideo(index, { blob, previewUrl: url });
                }}
                onClear={() => {
                  if (q.mediaType === "audio") updateAudio(index, { blob: null, previewUrl: null });
                  else updateVideo(index, { blob: null, previewUrl: null });
                }}
              />
            )}
          </section>

          {/* Section Comportement IA */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Comportement IA
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Quand activé, l'IA peut poser jusqu'à 2 questions de relance pour approfondir une
                    réponse trop courte ou ambiguë.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <Switch
                id={`followup-${id}`}
                checked={q.follow_up_enabled}
                onCheckedChange={() => toggleFollowUp(index)}
              />
              <Label htmlFor={`followup-${id}`} className="cursor-pointer text-sm">
                Activer la relance IA
              </Label>
            </div>
          </section>

          {/* Save to library checkbox (hidden if imported from library) */}
          {!q.from_library && (
            <section className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                <Checkbox
                  id={`save-lib-${id}`}
                  checked={!!q.save_to_library}
                  onCheckedChange={(v) => updateQuestion(index, "save_to_library", v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`save-lib-${id}`}
                  className="cursor-pointer text-sm leading-snug font-normal"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
                    Ajouter à ma bibliothèque
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    La question sera réutilisable dans tes prochains projets.
                  </span>
                </Label>
              </div>
            </section>
          )}
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
    const toAdd = selected.slice(0, remaining).map((q) => ({ ...q, from_library: true, save_to_library: false }));
    toAdd.forEach(() => itemIds.push(crypto.randomUUID()));
    setQuestions([...questions, ...toAdd]);
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
          <p className="text-sm text-muted-foreground">
            {questions.filter((q) => q.title.trim() || q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl).length} question(s) — glissez pour réordonner
          </p>
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
