import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Search, BookOpen, Mic, Video, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPlayerInline } from "@/components/library/MediaPlayerInline";
import {
  QuestionFormDialog,
  EMPTY_QUESTION_FORM,
  type QuestionFormValue,
} from "@/components/QuestionFormDialog";

interface QuestionTemplate {
  id: string;
  title: string;
  content: string;
  category: string | null;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  relance_level: string | null;
  organization_id: string;
  created_by: string;
  type: string;
  audio_url: string | null;
  video_url: string | null;
  hint_text: string | null;
  max_response_seconds: number | null;
}

interface QuestionLibraryManagerProps {
  orgId: string;
}

export function QuestionLibraryManager({ orgId }: QuestionLibraryManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<QuestionFormValue>(EMPTY_QUESTION_FORM);
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
    setInitialForm(EMPTY_QUESTION_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: QuestionTemplate) => {
    setEditingId(t.id);
    setInitialForm({
      title: t.title || "",
      content: t.content,
      category: t.category || "",
      mediaType: (t.type as "written" | "audio" | "video") || "written",
      followUp: t.follow_up_enabled,
      relanceLevel: ((t.relance_level as "light" | "medium" | "deep") ?? "medium"),
      maxFollowUps: typeof t.max_follow_ups === "number" ? t.max_follow_ups : 1,
      mediaBlob: null,
      mediaPreviewUrl: t.audio_url || t.video_url || null,
      existingAudioUrl: t.audio_url,
      existingVideoUrl: t.video_url,
      hintText: t.hint_text ?? "",
      maxResponseSeconds: t.max_response_seconds ?? null,
    });
    setDialogOpen(true);
  };

  const uploadMedia = async (blob: Blob, type: "audio" | "video"): Promise<string | null> => {
    const ext = "webm";
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

  const handleSave = async (form: QuestionFormValue) => {
    if (!user) return;
    setSaving(true);

    let audioUrl: string | null = form.existingAudioUrl;
    let videoUrl: string | null = form.existingVideoUrl;
    if (form.mediaType !== "audio") audioUrl = null;
    if (form.mediaType !== "video") videoUrl = null;

    if (form.mediaBlob && (form.mediaType === "audio" || form.mediaType === "video")) {
      const url = await uploadMedia(form.mediaBlob, form.mediaType);
      if (!url) {
        setSaving(false);
        return;
      }
      if (form.mediaType === "audio") audioUrl = url;
      else videoUrl = url;
    }

    const payload = {
      title: form.title.trim(),
      content:
        form.content.trim() ||
        (form.mediaType === "audio" ? "Question audio" : form.mediaType === "video" ? "Question vidéo" : ""),
      category: form.category || null,
      follow_up_enabled: form.followUp,
      max_follow_ups: form.followUp ? Math.max(0, Math.min(2, form.maxFollowUps ?? 1)) : 0,
      type: form.mediaType,
      audio_url: audioUrl,
      video_url: videoUrl,
      hint_text: form.hintText?.trim() || null,
      max_response_seconds: form.maxResponseSeconds,
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
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchCat && matchType;
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="written">Texte</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Vidéo</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>

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
                        <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                      )}
                      {t.follow_up_enabled && (
                        <Badge variant="outline" className="text-xs">Relance IA</Badge>
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

      <QuestionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialForm}
        isEditing={!!editingId}
        saving={saving}
        onSubmit={handleSave}
      />
    </Card>
  );
}
