import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";

export default function ProjectEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [aiPersonaName, setAiPersonaName] = useState("Marie");
  const [aiVoice, setAiVoice] = useState<string>("female_fr");
  const [maxDuration, setMaxDuration] = useState(30);
  const [recordAudio, setRecordAudio] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [introAudioUrl, setIntroAudioUrl] = useState<string | null>(null);
  const [autoSkipSilence, setAutoSkipSilence] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Projet introuvable", variant: "destructive" });
          navigate("/projects");
          return;
        }
        setTitle(data.title);
        setJobTitle(data.job_title);
        setDescription(data.description || "");
        setLanguage(data.language as "fr" | "en");
        setAiPersonaName(data.ai_persona_name);
        setAiVoice(data.ai_voice);
        setMaxDuration(data.max_duration_minutes);
        setRecordAudio(data.record_audio);
        setRecordVideo(data.record_video);
        setStatus(data.status as "draft" | "active" | "archived");
        setIntroAudioUrl((data as any).intro_audio_url || null);
        setAutoSkipSilence((data as any).auto_skip_silence ?? false);
        setLoading(false);
      });
  }, [id, navigate, toast]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title,
          job_title: jobTitle,
          description,
          language: language as any,
          ai_persona_name: aiPersonaName,
          ai_voice: aiVoice as any,
          max_duration_minutes: maxDuration,
          record_audio: recordAudio,
          record_video: recordVideo,
          status: status as any,
          auto_skip_silence: autoSkipSilence,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Projet mis à jour !" });
      navigate(`/projects/${id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Modifier le projet</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Titre du projet *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Intitulé du poste *</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
          </div>
          <div>
            <Label>Langue</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nom du persona IA</Label>
            <Input value={aiPersonaName} onChange={(e) => setAiPersonaName(e.target.value)} />
          </div>
          {/* Voix IA fixée à female_fr — pas de sélecteur */}

          {id && (
            <IntroAudioRecorder
              projectId={id}
              existingUrl={introAudioUrl}
              onUploaded={setIntroAudioUrl}
            />
          )}

          <div>
            <Label>Durée maximale : {maxDuration} min</Label>
            <input type="range" min={15} max={60} value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} className="w-full" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enregistrer l'audio</Label>
            <Switch checked={recordAudio} onCheckedChange={setRecordAudio} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Passage auto 5s</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Passe automatiquement à la question suivante si le candidat ne parle pas pendant 5s.
              </p>
            </div>
            <Switch checked={autoSkipSilence} onCheckedChange={setAutoSkipSilence} />
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "active" | "archived")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !title.trim() || !jobTitle.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
