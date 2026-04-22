import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Play, Pause, Loader2, Settings2 } from "lucide-react";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";
import { IntroVideoRecorder } from "@/components/project/IntroVideoRecorder";
import {
  IntroFormatPicker,
  INTRO_FORMAT_META,
  type IntroFormat,
} from "@/components/library/IntroFormatPicker";
import {
  VoiceSelectorDialog,
  FEMALE_VOICE_DEFAULT_ID,
  FEMALE_VOICES,
  MALE_VOICES,
  type VoiceGender,
} from "@/components/project/VoiceSelectorDialog";

interface IntroTemplate {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  type: IntroFormat;
  audio_url: string | null;
  video_url: string | null;
  description: string | null;
  intro_text: string | null;
  tts_voice_id: string | null;
  created_at: string;
}

const FILTERS: ({ key: "all" | IntroFormat; label: string })[] = [
  { key: "all", label: "Tous" },
  { key: "text", label: INTRO_FORMAT_META.text.label },
  { key: "tts", label: INTRO_FORMAT_META.tts.label },
  { key: "audio", label: INTRO_FORMAT_META.audio.label },
  { key: "video", label: INTRO_FORMAT_META.video.label },
];

function findVoiceName(voiceId: string | null): string {
  if (!voiceId) return "Voix par défaut";
  const all = [...FEMALE_VOICES, ...MALE_VOICES];
  return all.find((v) => v.id === voiceId)?.name || "Voix personnalisée";
}

function getVoiceGender(voiceId: string | null): VoiceGender {
  if (voiceId && MALE_VOICES.some((v) => v.id === voiceId)) return "male";
  return "female";
}

export default function IntroLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<IntroTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | IntroFormat>("all");

  // Dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<IntroFormat>("text");
  const [introText, setIntroText] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState<string>(FEMALE_VOICE_DEFAULT_ID);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // TTS preview
  const [previewing, setPreviewing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const cardPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [cardPreviewId, setCardPreviewId] = useState<string | null>(null);

  const fetchItems = useCallback(
    async (organizationId: string) => {
      setLoading(true);
      const { data, error } = await supabase
        .from("intro_templates" as never)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        setItems((data as unknown as IntroTemplate[]) || []);
      }
      setLoading(false);
    },
    [toast],
  );

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data }) => {
      if (data) {
        setOrgId(data);
        fetchItems(data);
      }
    });
  }, [user, fetchItems]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, text: 0, tts: 0, audio: 0, video: 0 };
    for (const it of items) c[it.type] = (c[it.type] || 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter],
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setFormat("text");
    setIntroText("");
    setTtsVoiceId(FEMALE_VOICE_DEFAULT_ID);
    setAudioBlob(null);
    setVideoFile(null);
    previewAudioRef.current?.pause();
    setPlaying(false);
  };

  const handlePreviewTts = async () => {
    const text = introText.trim();
    if (!text) {
      toast({ title: "Saisissez d'abord un texte à prévisualiser.", variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voiceId: ttsVoiceId, preview: true }),
      });
      const ct = res.headers.get("Content-Type") || "";
      if (!ct.includes("audio")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.reason || "Lecture impossible");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      previewAudioRef.current?.pause();
      const audio = new Audio(objectUrl);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onpause = () => setPlaying(false);
      audio.onplay = () => setPlaying(true);
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Prévisualisation impossible", description: msg, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    setPlaying(false);
  };

  const handleCardListen = async (item: IntroTemplate) => {
    if (cardPreviewId === item.id) {
      cardPreviewRef.current?.pause();
      setCardPreviewId(null);
      return;
    }
    cardPreviewRef.current?.pause();
    if (!item.intro_text?.trim()) {
      toast({ title: "Texte vide", variant: "destructive" });
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: item.intro_text,
          voiceId: item.tts_voice_id || FEMALE_VOICE_DEFAULT_ID,
          preview: true,
        }),
      });
      if (!(res.headers.get("Content-Type") || "").includes("audio")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.reason || "Lecture impossible");
      }
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      cardPreviewRef.current = audio;
      audio.onended = () => setCardPreviewId(null);
      audio.onpause = () => setCardPreviewId((prev) => (prev === item.id ? null : prev));
      setCardPreviewId(item.id);
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Lecture impossible", description: msg, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!orgId || !user) return;
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    if ((format === "text" || format === "tts") && !introText.trim()) {
      toast({ title: "Texte requis", variant: "destructive" });
      return;
    }
    if (format === "audio" && !audioBlob) {
      toast({ title: "Veuillez enregistrer un audio", variant: "destructive" });
      return;
    }
    if (format === "video" && !videoFile) {
      toast({ title: "Veuillez enregistrer ou téléverser une vidéo", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const id = crypto.randomUUID();
      let audioUrl: string | null = null;
      let videoUrl: string | null = null;

      if (format === "audio" && audioBlob) {
        const path = `intro-library/${id}.webm`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, audioBlob, { contentType: "audio/webm", upsert: true });
        if (error) throw error;
        audioUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      } else if (format === "video" && videoFile) {
        const path = `intro-library/${id}.webm`;
        const { error } = await supabase.storage
          .from("media")
          .upload(path, videoFile, { contentType: videoFile.type || "video/webm", upsert: true });
        if (error) throw error;
        videoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }

      const { error: insertErr } = await supabase.from("intro_templates" as never).insert({
        id,
        organization_id: orgId,
        created_by: user.id,
        name: name.trim(),
        type: format,
        audio_url: audioUrl,
        video_url: videoUrl,
        intro_text: format === "text" || format === "tts" ? introText.trim() : null,
        tts_voice_id: format === "tts" ? ttsVoiceId : null,
        description: description.trim() || null,
      } as never);

      if (insertErr) throw insertErr;

      toast({ title: "Intro ajoutée à la bibliothèque" });
      resetForm();
      setOpen(false);
      fetchItems(orgId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: IntroTemplate) => {
    if (!confirm(`Supprimer « ${item.name} » ?`)) return;
    try {
      const url = item.audio_url || item.video_url;
      if (url) {
        const match = url.match(/intro-library\/[^/?]+/);
        if (match) await supabase.storage.from("media").remove([match[0]]);
      }
      const { error } = await supabase.from("intro_templates" as never).delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "Intro supprimée" });
      if (orgId) fetchItems(orgId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bibliothèque d'intros</h1>
          <p className="text-muted-foreground">
            Vos messages d'introduction réutilisables — texte, voix IA, audio ou vidéo.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nouvelle intro
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
            <DialogHeader>
              <DialogTitle>Nouvelle intro</DialogTitle>
              <DialogDescription>
                Créez une intro réutilisable que vous pourrez sélectionner lors de la création d'un projet.
              </DialogDescription>
            </DialogHeader>

            <div className="-mx-6 flex-1 space-y-5 overflow-y-auto px-6">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  placeholder="Ex : Intro chaleureuse — Marie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optionnelle)</Label>
                <Input
                  placeholder="Ex : Pour les postes commerciaux"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Format de l'intro</Label>
                <IntroFormatPicker value={format} onChange={setFormat} />
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                {format === "text" && (
                  <div className="space-y-2">
                    <Label>Message à afficher</Label>
                    <Textarea
                      rows={6}
                      placeholder="Bonjour et bienvenue. Voici quelques mots avant de commencer…"
                      value={introText}
                      onChange={(e) => setIntroText(e.target.value)}
                    />
                  </div>
                )}

                {format === "tts" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Voix : <span className="font-medium text-foreground">{findVoiceName(ttsVoiceId)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setVoicePickerOpen(true)}
                      >
                        <Settings2 className="mr-1 h-4 w-4" /> Changer la voix
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Texte à lire</Label>
                      <Textarea
                        rows={6}
                        placeholder="Bonjour, je suis ravi de vous recevoir aujourd'hui…"
                        value={introText}
                        onChange={(e) => setIntroText(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={playing ? stopPreview : handlePreviewTts}
                      disabled={previewing}
                    >
                      {previewing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération…
                        </>
                      ) : playing ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" /> Prévisualiser la lecture
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {format === "audio" && (
                  <IntroAudioRecorder onAudioReady={({ blob }) => setAudioBlob(blob)} />
                )}

                {format === "video" && (
                  <IntroVideoRecorder onVideoReady={({ file }) => setVideoFile(file)} />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <VoiceSelectorDialog
        open={voicePickerOpen}
        onOpenChange={setVoicePickerOpen}
        gender={getVoiceGender(ttsVoiceId)}
        initialVoiceId={ttsVoiceId}
        personaName="votre IA"
        onConfirm={(id) => {
          setTtsVoiceId(id);
          setVoicePickerOpen(false);
        }}
        onCancel={() => setVoicePickerOpen(false)}
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {items.length === 0
              ? "Aucune intro pour l'instant. Créez votre première intro réutilisable."
              : "Aucune intro pour ce filtre."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => {
            const meta = INTRO_FORMAT_META[item.type];
            const Icon = meta.icon;
            const isPlayingCard = cardPreviewId === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{item.name}</h3>
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      <Icon className="mr-1 h-3 w-3" /> {meta.label}
                    </Badge>
                  </div>

                  {(item.type === "text" || item.type === "tts") && item.intro_text && (
                    <p className="text-sm whitespace-pre-wrap line-clamp-3 rounded-md bg-muted/40 p-2">
                      {item.intro_text}
                    </p>
                  )}
                  {item.type === "tts" && (
                    <div className="text-xs text-muted-foreground">
                      Voix : {findVoiceName(item.tts_voice_id)}
                    </div>
                  )}
                  {item.type === "audio" && item.audio_url && (
                    <audio controls src={item.audio_url} className="w-full" />
                  )}
                  {item.type === "video" && item.video_url && (
                    <video controls src={item.video_url} className="w-full rounded border border-border" />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    {item.type === "tts" ? (
                      <Button variant="outline" size="sm" onClick={() => handleCardListen(item)}>
                        {isPlayingCard ? (
                          <>
                            <Pause className="mr-1 h-4 w-4" /> Stop
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-4 w-4" /> Écouter
                          </>
                        )}
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
