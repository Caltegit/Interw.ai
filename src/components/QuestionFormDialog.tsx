import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { MediaRecorderField } from "@/components/media/MediaRecorderField";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Mic,
  Video,
  Type,
  BookmarkPlus,
  ChevronDown,
  Lightbulb,
  Timer,
  Sparkles,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Motivation", "Expérience", "Personnalité", "Compétences", "Culture", "Autres"];
const MAX_CONTENT = 500;
const MAX_HINT = 300;

type MediaType = "written" | "audio" | "video";
type RelanceLevel = "light" | "medium" | "deep";

const RELANCE_TO_MAX: Record<RelanceLevel, number> = { light: 0, medium: 1, deep: 2 };

const DURATION_PRESETS = [
  { label: "Pas de limite", value: null as number | null },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
];

export interface QuestionFormValue {
  title: string;
  content: string;
  category: string;
  mediaType: MediaType;
  followUp: boolean;
  relanceLevel: RelanceLevel;
  maxFollowUps: number;
  mediaBlob: Blob | null;
  mediaPreviewUrl: string | null;
  existingAudioUrl: string | null;
  existingVideoUrl: string | null;
  saveToLibrary?: boolean;
  hintText: string;
  maxResponseSeconds: number | null;
}

export const EMPTY_QUESTION_FORM: QuestionFormValue = {
  title: "",
  content: "",
  category: "",
  mediaType: "written",
  followUp: true,
  relanceLevel: "medium",
  maxFollowUps: 1,
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
  isEditing?: boolean;
  showSaveToLibrary?: boolean;
  saving?: boolean;
  onSubmit: (value: QuestionFormValue) => void | Promise<void>;
}

const FORMAT_OPTIONS: {
  value: MediaType;
  label: string;
  hint: string;
  icon: typeof Type;
  description: string;
}[] = [
  {
    value: "written",
    label: "Texte",
    hint: "Lu par l'IA",
    icon: Type,
    description: "La question sera lue à voix haute par l'IA du projet.",
  },
  {
    value: "audio",
    label: "Audio",
    hint: "Votre voix",
    icon: Mic,
    description: "Enregistrez votre voix. Aucun texte n'est affiché au candidat.",
  },
  {
    value: "video",
    label: "Vidéo",
    hint: "Vous à l'écran",
    icon: Video,
    description: "Filmez-vous en train de poser la question. Le texte n'est pas nécessaire.",
  },
];

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

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_QUESTION_FORM);
  }, [open, initial]);

  const setMediaType = (next: MediaType) => {
    setForm((f) => ({
      ...f,
      mediaType: next,
      mediaBlob: null,
      mediaPreviewUrl:
        next === "audio" ? f.existingAudioUrl : next === "video" ? f.existingVideoUrl : null,
    }));
  };

  const setRelance = (lvl: RelanceLevel) => {
    setForm((f) => ({
      ...f,
      relanceLevel: lvl,
      followUp: lvl !== "light",
      maxFollowUps: RELANCE_TO_MAX[lvl],
    }));
  };

  const setDurationPreset = (value: number | null) => {
    setForm((f) => ({ ...f, maxResponseSeconds: value }));
  };

  const isCustomDuration =
    form.maxResponseSeconds !== null &&
    !DURATION_PRESETS.some((p) => p.value === form.maxResponseSeconds);

  const handleSubmit = async () => {
    if (form.mediaType === "written" && !form.content.trim()) {
      toast({ title: "Énoncé requis", description: "Saisis le texte de la question.", variant: "destructive" });
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

  const currentFormat = FORMAT_OPTIONS.find((o) => o.value === form.mediaType)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditing ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
          <DialogDescription>
            Choisis d'abord le format, puis renseigne le contenu et les options.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Étape 1 — Format */}
          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Format
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = form.mediaType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMediaType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug px-0.5">
              {currentFormat.description}
            </p>
          </section>

          {/* Étape 2 — Contenu */}
          <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="qfd-title" className="text-xs">Titre interne</Label>
              <Input
                id="qfd-title"
                placeholder="Nom court visible uniquement par toi"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {form.mediaType === "written" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="qfd-content" className="text-xs">Énoncé lu par l'IA</Label>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      form.content.length > MAX_CONTENT ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {form.content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <Textarea
                  id="qfd-content"
                  placeholder="Parle-moi de ton parcours..."
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
            )}

            {(form.mediaType === "audio" || form.mediaType === "video") && (
              <div className="space-y-2">
                <MediaRecorderField
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
                <Collapsible defaultOpen={!!form.content}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left hover:bg-muted/40">
                    <span className="text-xs text-muted-foreground">
                      Ajouter un texte de secours
                      <span className="ml-1 text-[10px]">(optionnel)</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Textarea
                      placeholder="Affiché si le média ne peut pas être lu"
                      rows={2}
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

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

          {/* Étape 3 — Pendant la réponse */}
          <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pendant la réponse
            </Label>

            <div className="space-y-1.5">
              <Label htmlFor="qfd-hint" className="text-xs flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                Indication affichée au candidat
              </Label>
              <Textarea
                id="qfd-hint"
                placeholder="Pense à donner un exemple concret"
                rows={2}
                maxLength={MAX_HINT}
                value={form.hintText}
                onChange={(e) => setForm({ ...form, hintText: e.target.value })}
              />
              <span className="block text-right text-[10px] tabular-nums text-muted-foreground">
                {form.hintText.length}/{MAX_HINT}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-primary" />
                Temps limite de réponse
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => {
                  const active = form.maxResponseSeconds === p.value;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDurationPreset(p.value)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted/60",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, maxResponseSeconds: 90 })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    isCustomDuration
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  Personnalisé
                </button>
              </div>

              {isCustomDuration && (
                <div className="flex items-end gap-2 pt-1">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="qfd-timer-min" className="text-[10px] uppercase text-muted-foreground">
                      Minutes
                    </Label>
                    <Input
                      id="qfd-timer-min"
                      type="number"
                      min={0}
                      max={59}
                      value={Math.floor((form.maxResponseSeconds ?? 0) / 60)}
                      onChange={(e) => {
                        const min = Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10) || 0));
                        const sec = (form.maxResponseSeconds ?? 0) % 60;
                        setForm({ ...form, maxResponseSeconds: min * 60 + sec });
                      }}
                    />
                  </div>
                  <span className="pb-2 text-muted-foreground">:</span>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="qfd-timer-sec" className="text-[10px] uppercase text-muted-foreground">
                      Secondes
                    </Label>
                    <Input
                      id="qfd-timer-sec"
                      type="number"
                      min={0}
                      max={59}
                      value={(form.maxResponseSeconds ?? 0) % 60}
                      onChange={(e) => {
                        const sec = Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10) || 0));
                        const min = Math.floor((form.maxResponseSeconds ?? 0) / 60);
                        setForm({ ...form, maxResponseSeconds: min * 60 + sec });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Étape 4 — Relance IA */}
          <section className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Relance par l'IA
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "light", label: "Aucune", desc: "Passe à la suivante" },
                { v: "medium", label: "Légère", desc: "1 relance max" },
                { v: "deep", label: "Approfondie", desc: "2 relances max" },
              ] as const).map((opt) => {
                const selected = form.relanceLevel === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setRelance(opt.v)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Étape 5 — Sauvegarde bibliothèque */}
          {showSaveToLibrary && (
            <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
              <Checkbox
                id="qfd-save-lib"
                checked={!!form.saveToLibrary}
                onCheckedChange={(v) => setForm({ ...form, saveToLibrary: v === true })}
                className="mt-0.5"
              />
              <Label htmlFor="qfd-save-lib" className="cursor-pointer text-sm leading-snug font-normal">
                <span className="flex items-center gap-1.5 font-medium">
                  <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
                  Ajouter aussi à la bibliothèque
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Réutilisable dans tes prochains projets.
                </span>
              </Label>
            </div>
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
