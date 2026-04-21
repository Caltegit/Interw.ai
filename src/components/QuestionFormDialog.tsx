import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuestionMediaEditor } from "@/components/library/QuestionMediaEditor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Info, Mic, Video, Type, BookmarkPlus, ChevronDown, Lightbulb, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Motivation", "Expérience", "Personnalité", "Compétences", "Culture", "Autres"];
const MAX_CONTENT = 500;
const MAX_HINT = 300;
const DEFAULT_TIMER_SECONDS = 600; // 10 min

export interface QuestionFormValue {
  title: string;
  content: string;
  category: string;
  mediaType: "written" | "audio" | "video";
  followUp: boolean;
  /** Niveau de relance IA pour cette question */
  relanceLevel: "light" | "medium" | "deep";
  /** Blob if a new recording was made/imported during this edit */
  mediaBlob: Blob | null;
  /** Preview URL (existing or freshly created) for audio/video */
  mediaPreviewUrl: string | null;
  /** Existing remote URL for audio (if any) */
  existingAudioUrl: string | null;
  /** Existing remote URL for video (if any) */
  existingVideoUrl: string | null;
  /** Optional: save to library checkbox value */
  saveToLibrary?: boolean;
  /** Indication courte affichée au candidat (optionnelle) */
  hintText: string;
  /** Durée maximale de réponse en secondes (null = pas de limite) */
  maxResponseSeconds: number | null;
}

export const EMPTY_QUESTION_FORM: QuestionFormValue = {
  title: "",
  content: "",
  category: "",
  mediaType: "written",
  followUp: true,
  relanceLevel: "medium",
  mediaBlob: null,
  mediaPreviewUrl: null,
  existingAudioUrl: null,
  existingVideoUrl: null,
  saveToLibrary: false,
  hintText: "",
  maxResponseSeconds: null,
};

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: QuestionFormValue;
  /** Mode édition (change le titre + label du bouton) */
  isEditing?: boolean;
  /** Affiche la case "Ajouter à ma bibliothèque" (création projet) */
  showSaveToLibrary?: boolean;
  /** Loader externe (upload en cours) */
  saving?: boolean;
  onSubmit: (value: QuestionFormValue) => void | Promise<void>;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  initial,
  isEditing = false,
  showSaveToLibrary = false,
  saving = false,
  onSubmit,
}: QuestionFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<QuestionFormValue>(initial ?? EMPTY_QUESTION_FORM);

  // Reset form whenever dialog opens with a new initial value
  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_QUESTION_FORM);
  }, [open, initial]);

  const handleSubmit = async () => {
    if (form.mediaType === "written" && !form.content.trim()) {
      toast({ title: "Question requise", description: "Saisis le texte de la question.", variant: "destructive" });
      return;
    }
    if ((form.mediaType === "audio" || form.mediaType === "video") && !form.mediaBlob && !form.mediaPreviewUrl) {
      toast({
        title: "Média requis",
        description: `Enregistre ou importe un ${form.mediaType === "audio" ? "audio" : "vidéo"}.`,
        variant: "destructive",
      });
      return;
    }
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditing ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
          <DialogDescription>
            Définis le contenu, le format et le comportement de la question.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Section Question */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question</h3>
            <div className="space-y-1.5">
              <Label htmlFor="qfd-title" className="text-xs">Titre court</Label>
              <Input
                id="qfd-title"
                placeholder="Ex: Présentez-vous"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="qfd-content" className="text-xs">Texte de la question</Label>
                <span
                  className={`text-[10px] tabular-nums ${
                    form.content.length > MAX_CONTENT ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {form.content.length}/{MAX_CONTENT}
                </span>
              </div>
              <Textarea
                id="qfd-content"
                placeholder="Parlez-moi de votre parcours..."
                rows={3}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
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

          {/* Section Format */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Format de présentation
            </h3>
            <ToggleGroup
              type="single"
              value={form.mediaType}
              className="justify-start"
              onValueChange={(v) => {
                if (!v) return;
                const next = v as "written" | "audio" | "video";
                setForm((f) => ({
                  ...f,
                  mediaType: next,
                  mediaBlob: null,
                  mediaPreviewUrl:
                    next === "audio" ? f.existingAudioUrl : next === "video" ? f.existingVideoUrl : null,
                }));
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

            {(form.mediaType === "audio" || form.mediaType === "video") && (
              <QuestionMediaEditor
                type={form.mediaType}
                existingUrl={form.mediaPreviewUrl}
                onMediaReady={(blob, url) =>
                  setForm((f) => ({ ...f, mediaBlob: blob, mediaPreviewUrl: url }))
                }
                onClear={() =>
                  setForm((f) => ({
                    ...f,
                    mediaBlob: null,
                    mediaPreviewUrl: null,
                    existingAudioUrl: f.mediaType === "audio" ? null : f.existingAudioUrl,
                    existingVideoUrl: f.mediaType === "video" ? null : f.existingVideoUrl,
                  }))
                }
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
                    Niveau de relance et de reformulation de l'IA pour cette question.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Niveau de relance IA</Label>
              <Select
                value={form.relanceLevel}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    relanceLevel: v as "light" | "medium" | "deep",
                    followUp: v !== "light",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Léger — pas de relance</SelectItem>
                  <SelectItem value="medium">Moyen — 1 relance si réponse vague</SelectItem>
                  <SelectItem value="deep">Approfondi — jusqu'à 2 relances</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Save to library */}
          {showSaveToLibrary && (
            <section className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                <Checkbox
                  id="qfd-save-lib"
                  checked={!!form.saveToLibrary}
                  onCheckedChange={(v) => setForm({ ...form, saveToLibrary: v === true })}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="qfd-save-lib"
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
