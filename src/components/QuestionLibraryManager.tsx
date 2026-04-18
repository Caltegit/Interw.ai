import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Search, BookOpen, Mic, Video, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { MediaPlayerInline } from "@/components/library/MediaPlayerInline";
import { Info } from "lucide-react";

interface QuestionTemplate {
  id: string;
  title: string;
  content: string;
  category: string | null;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  organization_id: string;
  created_by: string;
  type: string;
  audio_url: string | null;
  video_url: string | null;
}

const CATEGORIES = ["Motivation", "Technique", "Soft skills", "Situationnel", "Culture fit", "Leadership"];
const MAX_CONTENT = 500;

interface QuestionLibraryManagerProps {
  orgId: string;
}

interface FormState {
  title: string;
  content: string;
  category: string;
  followUp: boolean;
  type: "written" | "audio" | "video";
  mediaBlob: Blob | null;
  mediaPreviewUrl: string | null;
  existingAudioUrl: string | null;
  existingVideoUrl: string | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  category: "",
  followUp: true,
  type: "written",
  mediaBlob: null,
  mediaPreviewUrl: null,
  existingAudioUrl: null,
  existingVideoUrl: null,
};

export function QuestionLibraryManager({ orgId }: QuestionLibraryManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("question_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: QuestionTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title || "",
      content: t.content,
      category: t.category || "",
      followUp: t.follow_up_enabled,
      type: (t.type as "written" | "audio" | "video") || "written",
      mediaBlob: null,
      mediaPreviewUrl: t.audio_url || t.video_url || null,
      existingAudioUrl: t.audio_url,
      existingVideoUrl: t.video_url,
    });
    setDialogOpen(true);
  };

  const uploadMedia = async (blob: Blob, type: "audio" | "video"): Promise<string | null> => {
    const ext = type === "audio" ? "webm" : "webm";
    const path = `question-templates/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, blob, {
      contentType: blob.type || (type === "audio" ? "audio/webm" : "video/webm"),
    });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.content.trim() && form.type === "written") {
      toast({ title: "Question requise", description: "Saisis le texte de la question.", variant: "destructive" });
      return;
    }
    if ((form.type === "audio" || form.type === "video") && !form.mediaBlob && !form.mediaPreviewUrl) {
      toast({
        title: "Média requis",
        description: `Enregistre ou importe un ${form.type === "audio" ? "audio" : "vidéo"}.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    let audioUrl: string | null = form.existingAudioUrl;
    let videoUrl: string | null = form.existingVideoUrl;

    // Si on change de type, on nettoie les anciennes URLs des autres types
    if (form.type !== "audio") audioUrl = null;
    if (form.type !== "video") videoUrl = null;

    if (form.mediaBlob && (form.type === "audio" || form.type === "video")) {
      const url = await uploadMedia(form.mediaBlob, form.type);
      if (!url) {
        setSaving(false);
        return;
      }
      if (form.type === "audio") audioUrl = url;
      else videoUrl = url;
    }

    const payload = {
      title: form.title.trim(),
      content:
        form.content.trim() ||
        (form.type === "audio" ? "Question audio" : form.type === "video" ? "Question vidéo" : ""),
      category: form.category || null,
      follow_up_enabled: form.followUp,
      max_follow_ups: form.followUp ? 2 : 0,
      type: form.type,
      audio_url: audioUrl,
      video_url: videoUrl,
    };

    const { error } = editingId
      ? await supabase.from("question_templates").update(payload).eq("id", editingId)
      : await supabase
          .from("question_templates")
          .insert({ ...payload, organization_id: orgId, created_by: user.id });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Question mise à jour" : "Question ajoutée" });
      setDialogOpen(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("question_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates((t) => t.filter((q) => q.id !== id));
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      (t.title || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  const typeLabel = (type: string) => {
    if (type === "audio") return { icon: <Mic className="h-3 w-3" />, label: "Audio" };
    if (type === "video") return { icon: <Video className="h-3 w-3" />, label: "Vidéo" };
    return { icon: <Type className="h-3 w-3" />, label: "Écrite" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" /> Bibliothèque de questions
        </CardTitle>
        <CardDescription>Créez vos questions types ({templates.length})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {templates.length === 0 ? "Aucune question dans la bibliothèque." : "Aucun résultat."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const { icon, label } = typeLabel(t.type);
              return (
                <div key={t.id} className="rounded-lg border p-3 flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                    <p className="text-sm text-muted-foreground">{t.content}</p>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Badge variant="outline" className="text-xs gap-1">
                        {icon} {label}
                      </Badge>
                      {t.category && (
                        <Badge variant="secondary" className="text-xs">
                          {t.category}
                        </Badge>
                      )}
                      {t.follow_up_enabled && (
                        <Badge variant="outline" className="text-xs">
                          Relance IA
                        </Badge>
                      )}
                      {(t.audio_url || t.video_url) && (
                        <MediaPlayerInline audioUrl={t.audio_url} videoUrl={t.video_url} />
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{editingId ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
            <DialogDescription>
              Définis le contenu, le format et le comportement de la question.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Section Question */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Question
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="q-title" className="text-xs">
                  Titre court
                </Label>
                <Input
                  id="q-title"
                  placeholder="Ex: Présentez-vous"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="q-content" className="text-xs">
                    Texte de la question
                  </Label>
                  <span
                    className={`text-[10px] tabular-nums ${
                      form.content.length > MAX_CONTENT ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {form.content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <Textarea
                  id="q-content"
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
                value={form.type}
                className="justify-start"
                onValueChange={(v) => {
                  if (!v) return;
                  const next = v as "written" | "audio" | "video";
                  // Si un média existait, on prévient en conservant l'URL existante du même type uniquement
                  setForm((f) => ({
                    ...f,
                    type: next,
                    mediaBlob: null,
                    mediaPreviewUrl:
                      next === "audio"
                        ? f.existingAudioUrl
                        : next === "video"
                          ? f.existingVideoUrl
                          : null,
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

              {(form.type === "audio" || form.type === "video") && (
                <QuestionMediaEditor
                  type={form.type}
                  existingUrl={form.mediaPreviewUrl}
                  onMediaReady={(blob, url) =>
                    setForm((f) => ({ ...f, mediaBlob: blob, mediaPreviewUrl: url }))
                  }
                  onClear={() =>
                    setForm((f) => ({
                      ...f,
                      mediaBlob: null,
                      mediaPreviewUrl: null,
                      existingAudioUrl: f.type === "audio" ? null : f.existingAudioUrl,
                      existingVideoUrl: f.type === "video" ? null : f.existingVideoUrl,
                    }))
                  }
                />
              )}
            </section>

            {/* Section Relance IA */}
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
                  id="followup"
                  checked={form.followUp}
                  onCheckedChange={(v) => setForm({ ...form, followUp: v })}
                />
                <Label htmlFor="followup" className="cursor-pointer text-sm">
                  Activer la relance IA
                </Label>
              </div>
            </section>
          </div>

          {/* Footer sticky */}
          <DialogFooter className="border-t bg-background px-6 py-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
