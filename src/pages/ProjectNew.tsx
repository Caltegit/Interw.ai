import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Upload, X, Mic, Video } from "lucide-react";
import { StepQuestions, Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";
import { IntroVideoRecorder } from "@/components/project/IntroVideoRecorder";

const STEPS = ["Informations", "Médias", "Questions", "Critères", "Publication"];

export default function ProjectNew() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  // Step 2
  const [aiPersonaName, setAiPersonaName] = useState("Marie");
  const [aiVoice, setAiVoice] = useState<string>("female_fr");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [introType, setIntroType] = useState<"audio" | "video">("audio");
  const [introAudioBlob, setIntroAudioBlob] = useState<Blob | null>(null);
  const [introAudioPreviewUrl, setIntroAudioPreviewUrl] = useState<string | null>(null);
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);
  const [introVideoPreviewUrl, setIntroVideoPreviewUrl] = useState<string | null>(null);

  // Step 3
  const [questions, setQuestions] = useState<Question[]>([
    { ...createEmptyQuestion(), title: "Bien-être", content: "Comment ça va aujourd'hui ?" },
    { ...createEmptyQuestion(), title: "Culture", content: "Tu penses quoi de Morning ?" },
  ]);

  // Step 4
  const [criteria, setCriteria] = useState<{ label: string; description: string; weight: number; scoring_scale: string; anchors: Record<string, string>; applies_to: string }[]>([
    { label: "Entrepreneur de son périmètre", description: "Capacité à s'approprier son rôle, prendre des décisions de façon autonome et en assumer la responsabilité. Situations concrètes où le candidat a pris des initiatives sans y être explicitement invité.", weight: 35, scoring_scale: "0-5", anchors: {}, applies_to: "all_questions" },
    { label: "Résilience au changement", description: "Capacité à s'adapter, faire évoluer son rôle et rester efficace dans un environnement qui bouge vite, sans avoir besoin de cases fixes ni de process très définis.", weight: 35, scoring_scale: "0-5", anchors: {}, applies_to: "all_questions" },
    { label: "Fit culturel & envie sincère", description: "Alignement réel avec les valeurs et l'ambiance Morning. Capacité à dire ce qu'on a vraiment envie de faire, au-delà du discours poli d'entretien.", weight: 30, scoring_scale: "0-5", anchors: {}, applies_to: "all_questions" },
  ]);

  // Step 5
  const [maxDuration, setMaxDuration] = useState(30);
  const [recordAudio, setRecordAudio] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [autoSkipSilence, setAutoSkipSilence] = useState(true);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const canProceed = () => {
    if (step === 0) return title.trim() && jobTitle.trim();
    if (step === 2) return questions.some((q) => q.content.trim());
    if (step === 3) return criteria.some((c) => c.label.trim()) && totalWeight === 100;
    return true;
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const path = `avatars/${slug}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          organization_id: "a0000000-0000-0000-0000-000000000001",
          created_by: user.id,
          title,
          job_title: jobTitle,
          description,
          language,
          ai_persona_name: aiPersonaName,
          ai_voice: aiVoice as never,
          max_duration_minutes: maxDuration,
          record_audio: recordAudio,
          record_video: recordVideo,
          status,
          auto_skip_silence: autoSkipSilence,
          slug,
          avatar_image_url: avatarUrl,
          intro_audio_url: null,
          presentation_video_url: null,
        })
        .select()
        .single();

      if (error) throw error;

      if (introType === "audio" && introAudioBlob) {
        const introPath = `intro/${project.id}.webm`;
        const { error: introUploadError } = await supabase.storage
          .from("media")
          .upload(introPath, introAudioBlob, { contentType: "audio/webm", upsert: true });

        if (introUploadError) throw introUploadError;

        const { data: introUrlData } = supabase.storage.from("media").getPublicUrl(introPath);
        const introAudioUrl = introUrlData.publicUrl;

        const { error: introUpdateError } = await supabase
          .from("projects")
          .update({ intro_audio_url: introAudioUrl } as never)
          .eq("id", project.id);

        if (introUpdateError) throw introUpdateError;
      }

      if (introType === "video" && introVideoFile) {
        const videoPath = `presentation/${project.id}.webm`;
        const { error: videoUploadError } = await supabase.storage
          .from("media")
          .upload(videoPath, introVideoFile, { contentType: introVideoFile.type, upsert: true });

        if (videoUploadError) throw videoUploadError;

        const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);

        const { error: videoUpdateError } = await supabase
          .from("projects")
          .update({ presentation_video_url: videoUrlData.publicUrl } as never)
          .eq("id", project.id);

        if (videoUpdateError) throw videoUpdateError;
      }

      const validQuestions = questions.filter((q) => q.content.trim());
      if (validQuestions.length > 0) {
        const insertedQuestions = await supabase.from("questions").insert(
          validQuestions.map((q, i) => ({
            project_id: project.id,
            order_index: i,
            title: q.title || q.content.slice(0, 60),
            content: q.content,
            type: q.type as never,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
          }))
        ).select();

        if (insertedQuestions.data) {
          for (let i = 0; i < insertedQuestions.data.length; i++) {
            const q = validQuestions[i];
            const qId = insertedQuestions.data[i].id;
            const updates: Record<string, string> = {};

            if (q.audioBlob) {
              const audioPath = `questions/${qId}_audio.webm`;
              const { error: aErr } = await supabase.storage
                .from("media")
                .upload(audioPath, q.audioBlob, { contentType: "audio/webm", upsert: true });
              if (!aErr) {
                const { data: aUrl } = supabase.storage.from("media").getPublicUrl(audioPath);
                updates.audio_url = aUrl.publicUrl;
              }
            } else if (q.audioPreviewUrl && !q.audioPreviewUrl.startsWith("blob:")) {
              // URL from library import — reuse directly
              updates.audio_url = q.audioPreviewUrl;
            }

            if (q.videoBlob) {
              const videoPath = `questions/${qId}_video.webm`;
              const { error: vErr } = await supabase.storage
                .from("media")
                .upload(videoPath, q.videoBlob, { contentType: "video/webm", upsert: true });
              if (!vErr) {
                const { data: vUrl } = supabase.storage.from("media").getPublicUrl(videoPath);
                updates.video_url = vUrl.publicUrl;
              }
            } else if (q.videoPreviewUrl && !q.videoPreviewUrl.startsWith("blob:")) {
              // URL from library import — reuse directly
              updates.video_url = q.videoPreviewUrl;
            }

            if (Object.keys(updates).length > 0) {
              await supabase.from("questions").update(updates as never).eq("id", qId);
            }
          }
        }
      }

      const validCriteria = criteria.filter((c) => c.label.trim());
      if (validCriteria.length > 0) {
        await supabase.from("evaluation_criteria").insert(
          validCriteria.map((c, i) => ({
            project_id: project.id,
            order_index: i,
            label: c.label,
            description: c.description,
            weight: c.weight,
            scoring_scale: c.scoring_scale as never,
            anchors: c.anchors,
            applies_to: c.applies_to as never,
          }))
        );
      }

      const { data: check } = await supabase
        .from("projects")
        .select("id, status, slug")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!check) {
        toast({
          title: "Projet créé mais lien candidat non fonctionnel",
          description: "Le projet a été créé mais le lien public ne semble pas accessible. Vérifiez le statut du projet.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Projet créé !", description: "Le lien candidat est fonctionnel ✓" });
      }

      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Nouveau projet</h1>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "cursor-pointer bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Titre du projet *</Label>
                <Input placeholder="CDI Développeur Full-Stack Paris" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Intitulé du poste *</Label>
                <Input placeholder="Développeur Full-Stack" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <Label>Description du poste</Label>
                <Textarea placeholder="Décrivez le poste..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
                <p className="mt-1 text-xs text-muted-foreground">{description.length}/500</p>
              </div>
              <div>
                <Label>Langue de l'entretien</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Nom du persona IA</Label>
                <Input placeholder="Marie" value={aiPersonaName} onChange={(e) => setAiPersonaName(e.target.value)} />
              </div>

              <div>
                <Label>Photo de l'avatar</Label>
                <div className="mt-2 flex items-center gap-4">
                  {avatarPreview ? (
                    <div className="relative">
                      <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full border-2 border-border object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border transition-colors hover:border-primary">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAvatarFile(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                  <p className="text-sm text-muted-foreground">JPG, PNG — affiché pendant l'entretien candidat</p>
                </div>
              </div>

              {/* Voix IA fixée à female_fr — pas de sélecteur */}

              <div>
                <Label>Message de présentation</Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={introType === "audio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setIntroType("audio"); setIntroVideoFile(null); setIntroVideoPreviewUrl(null); }}
                  >
                    <Mic className="mr-1 h-4 w-4" /> Audio
                  </Button>
                  <Button
                    type="button"
                    variant={introType === "video" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setIntroType("video"); setIntroAudioBlob(null); setIntroAudioPreviewUrl(null); }}
                  >
                    <Video className="mr-1 h-4 w-4" /> Vidéo
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                {introType === "audio" ? (
                  <IntroAudioRecorder
                    existingUrl={introAudioPreviewUrl}
                    onAudioReady={({ blob, previewUrl }) => {
                      setIntroAudioBlob(blob);
                      setIntroAudioPreviewUrl(previewUrl);
                    }}
                  />
                ) : (
                  <IntroVideoRecorder
                    existingUrl={introVideoPreviewUrl}
                    onVideoReady={({ file, previewUrl }) => {
                      setIntroVideoFile(file);
                      setIntroVideoPreviewUrl(previewUrl);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {step === 2 && <StepQuestions questions={questions} setQuestions={setQuestions} />}

          {step === 3 && <StepCriteria criteria={criteria} setCriteria={setCriteria} totalWeight={totalWeight} />}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Durée maximale (minutes) : {maxDuration}</Label>
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
                    Si le candidat ne parle pas pendant 5 secondes, un décompte s'affiche et la question suivante est envoyée automatiquement.
                  </p>
                </div>
                <Switch checked={autoSkipSilence} onCheckedChange={setAutoSkipSilence} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-muted/50">
                <CardHeader><CardTitle className="text-sm">Récapitulatif</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Titre :</strong> {title}</p>
                  <p><strong>Poste :</strong> {jobTitle}</p>
                  <p><strong>Langue :</strong> {language === "fr" ? "Français" : "English"}</p>
                  <p><strong>Persona :</strong> {aiPersonaName}</p>
                  <p><strong>Questions :</strong> {questions.filter((q) => q.content.trim()).length}</p>
                  <p><strong>Critères :</strong> {criteria.filter((c) => c.label.trim()).length}</p>
                  <p><strong>Durée max :</strong> {maxDuration} min</p>
                  <p><strong>Présentation :</strong> {introType === "audio" ? (introAudioPreviewUrl ? "Audio ✓" : "Audio — non défini") : (introVideoPreviewUrl ? "Vidéo ✓" : "Vidéo — non définie")}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Suivant <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Création..." : "Créer le projet"}
          </Button>
        )}
      </div>
    </div>
  );
}
