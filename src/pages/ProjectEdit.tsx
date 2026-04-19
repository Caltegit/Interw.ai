import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronLeft, ChevronRight, Upload, X, Mic, Video } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { StepQuestions, Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";
import { IntroVideoRecorder } from "@/components/project/IntroVideoRecorder";
import { IntroLibraryDialog } from "@/components/project/IntroLibraryDialog";

const STEPS = ["Informations", "Intro", "Questions", "Critères", "Publication"];
const DEFAULT_COMPLETION_MESSAGE = "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.";

interface CriteriaState {
  id?: string;
  label: string;
  description: string;
  weight: number;
  scoring_scale: string;
  anchors: Record<string, string>;
  applies_to: string;
  category?: string;
  from_library?: boolean;
  save_to_library?: boolean;
}

export default function ProjectEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  // Step 2
  const [aiPersonaName, setAiPersonaName] = useState("Marie");
  const [aiVoice, setAiVoice] = useState<string>("female_fr");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [introType, setIntroType] = useState<"audio" | "video">("audio");
  const [introAudioBlob, setIntroAudioBlob] = useState<Blob | null>(null);
  const [introAudioPreviewUrl, setIntroAudioPreviewUrl] = useState<string | null>(null);
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);
  const [introVideoPreviewUrl, setIntroVideoPreviewUrl] = useState<string | null>(null);

  // Step 3
  const [questions, setQuestions] = useState<Question[]>([]);

  // Step 4
  const [criteria, setCriteria] = useState<CriteriaState[]>([]);

  // Step 5
  const [maxDuration, setMaxDuration] = useState(30);
  const [recordAudio, setRecordAudio] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [autoSkipSilence, setAutoSkipSilence] = useState(true);
  const [allowPause, setAllowPause] = useState(false);
  const [completionMessage, setCompletionMessage] = useState(DEFAULT_COMPLETION_MESSAGE);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  // Load existing project data
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError || !project) {
        toast({ title: "Projet introuvable", variant: "destructive" });
        navigate("/projects");
        return;
      }

      setTitle(project.title);
      setLanguage(project.language as "fr" | "en");
      setAiPersonaName(project.ai_persona_name);
      setAiVoice(project.ai_voice);
      setMaxDuration(project.max_duration_minutes);
      setRecordAudio(project.record_audio);
      setRecordVideo(project.record_video);
      setStatus(project.status as "draft" | "active" | "archived");
      setAutoSkipSilence(project.auto_skip_silence ?? false);
      setAllowPause((project as { allow_pause?: boolean }).allow_pause ?? false);
      setCompletionMessage((project as { completion_message?: string | null }).completion_message ?? DEFAULT_COMPLETION_MESSAGE);
      setExistingAvatarUrl(project.avatar_image_url);
      setAvatarPreview(project.avatar_image_url);

      if (project.presentation_video_url) {
        setIntroType("video");
        setIntroVideoPreviewUrl(project.presentation_video_url);
      } else if (project.intro_audio_url) {
        setIntroType("audio");
        setIntroAudioPreviewUrl(project.intro_audio_url);
      }

      // Load questions
      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .eq("project_id", id)
        .order("order_index", { ascending: true });

      if (questionsData && questionsData.length > 0) {
        setQuestions(
          questionsData.map((q) => {
            const mediaType: "written" | "audio" | "video" = q.video_url
              ? "video"
              : q.audio_url
                ? "audio"
                : "written";
            return {
              ...createEmptyQuestion(),
              title: q.title || "",
              content: q.content || "",
              type: q.type,
              mediaType,
              follow_up_enabled: q.follow_up_enabled,
              max_follow_ups: q.max_follow_ups,
              audioPreviewUrl: q.audio_url,
              videoPreviewUrl: q.video_url,
              from_library: true,
              save_to_library: false,
            };
          }),
        );
      } else {
        setQuestions([createEmptyQuestion()]);
      }

      // Load criteria
      const { data: criteriaData } = await supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("project_id", id)
        .order("order_index", { ascending: true });

      if (criteriaData && criteriaData.length > 0) {
        setCriteria(
          criteriaData.map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description || "",
            weight: c.weight,
            scoring_scale: c.scoring_scale,
            anchors: (c.anchors as Record<string, string>) || {},
            applies_to: c.applies_to,
          })),
        );
      } else {
        setCriteria([
          {
            label: "",
            description: "",
            weight: 100,
            scoring_scale: "0-5",
            anchors: {},
            applies_to: "all_questions",
          },
        ]);
      }

      setLoading(false);
    };

    load();
  }, [id, navigate, toast]);

  const canProceed = () => {
    if (step === 0) return title.trim();
    if (step === 2)
      return questions.some(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );
    if (step === 3) return criteria.some((c) => c.label.trim()) && totalWeight === 100;
    return true;
  };

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      // Avatar upload (if new)
      let avatarUrl: string | null = existingAvatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "png";
        const path = `avatars/${id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Intro audio upload (if new blob)
      let introAudioUrl: string | null = introType === "audio" ? introAudioPreviewUrl : null;
      if (introType === "audio" && introAudioBlob) {
        const introPath = `intro/${id}.webm`;
        const { error: introUploadError } = await supabase.storage
          .from("media")
          .upload(introPath, introAudioBlob, { contentType: "audio/webm", upsert: true });
        if (introUploadError) throw introUploadError;
        const { data: introUrlData } = supabase.storage.from("media").getPublicUrl(introPath);
        introAudioUrl = `${introUrlData.publicUrl}?t=${Date.now()}`;
      }

      // Intro video upload (if new file)
      let presentationVideoUrl: string | null = introType === "video" ? introVideoPreviewUrl : null;
      if (introType === "video" && introVideoFile) {
        const videoPath = `presentation/${id}.webm`;
        const { error: videoUploadError } = await supabase.storage
          .from("media")
          .upload(videoPath, introVideoFile, { contentType: introVideoFile.type, upsert: true });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
        presentationVideoUrl = `${videoUrlData.publicUrl}?t=${Date.now()}`;
      }

      // Update project
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          title,
          job_title: title,
          language: language as never,
          ai_persona_name: aiPersonaName,
          ai_voice: aiVoice as never,
          max_duration_minutes: maxDuration,
          record_audio: recordAudio,
          record_video: recordVideo,
          status: status as never,
          auto_skip_silence: autoSkipSilence,
          allow_pause: allowPause,
          avatar_image_url: avatarUrl,
          intro_audio_url: introAudioUrl,
          presentation_video_url: presentationVideoUrl,
          completion_message: completionMessage.trim() || null,
        } as never)
        .eq("id", id);

      if (updateError) throw updateError;

      // Replace questions: delete all then insert
      await supabase.from("questions").delete().eq("project_id", id);

      const validQuestions = questions.filter(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );

      if (validQuestions.length > 0) {
        const { data: insertedQuestions } = await supabase
          .from("questions")
          .insert(
            validQuestions.map((q, i) => ({
              project_id: id,
              order_index: i,
              title: q.title || q.content.slice(0, 60) || `Question ${i + 1}`,
              content: q.content.trim() || q.title || `Question ${i + 1}`,
              type: q.type as never,
              follow_up_enabled: q.follow_up_enabled,
              max_follow_ups: q.max_follow_ups,
            })),
          )
          .select();

        if (insertedQuestions) {
          // Fetch org id once for save_to_library inserts
          let orgIdForLib: string | null = null;
          const needsLib = validQuestions.some((q) => q.save_to_library && !q.from_library);
          if (needsLib) {
            const { data: orgData } = await supabase.rpc("get_user_organization_id", {
              _user_id: user.id,
            });
            orgIdForLib = orgData || null;
          }

          for (let i = 0; i < insertedQuestions.length; i++) {
            const q = validQuestions[i];
            const qId = insertedQuestions[i].id;
            const updates: Record<string, string | null> = {};

            if (q.audioBlob) {
              const audioPath = `questions/${qId}_audio.webm`;
              const { error: aErr } = await supabase.storage
                .from("media")
                .upload(audioPath, q.audioBlob, { contentType: "audio/webm", upsert: true });
              if (!aErr) {
                const { data: aUrl } = supabase.storage.from("media").getPublicUrl(audioPath);
                updates.audio_url = `${aUrl.publicUrl}?t=${Date.now()}`;
              }
            } else if (q.audioPreviewUrl && !q.audioPreviewUrl.startsWith("blob:")) {
              updates.audio_url = q.audioPreviewUrl;
            }

            if (q.videoBlob) {
              const videoPath = `questions/${qId}_video.webm`;
              const { error: vErr } = await supabase.storage
                .from("media")
                .upload(videoPath, q.videoBlob, { contentType: "video/webm", upsert: true });
              if (!vErr) {
                const { data: vUrl } = supabase.storage.from("media").getPublicUrl(videoPath);
                updates.video_url = `${vUrl.publicUrl}?t=${Date.now()}`;
              }
            } else if (q.videoPreviewUrl && !q.videoPreviewUrl.startsWith("blob:")) {
              updates.video_url = q.videoPreviewUrl;
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from("questions")
                .update(updates as never)
                .eq("id", qId);
            }

            // Save to library if requested
            if (q.save_to_library && !q.from_library && orgIdForLib) {
              const contentText = q.content.trim() || q.title || "";
              if (contentText) {
                const { data: existing } = await supabase
                  .from("question_templates")
                  .select("id")
                  .eq("organization_id", orgIdForLib)
                  .eq("content", contentText)
                  .maybeSingle();
                if (!existing) {
                  await supabase.from("question_templates").insert({
                    organization_id: orgIdForLib,
                    created_by: user.id,
                    title: q.title || contentText.slice(0, 60),
                    content: contentText,
                    category: q.category || null,
                    type: q.mediaType,
                    follow_up_enabled: q.follow_up_enabled,
                    max_follow_ups: q.max_follow_ups,
                    audio_url: (updates.audio_url as string | null) || null,
                    video_url: (updates.video_url as string | null) || null,
                  } as never);
                }
              }
            }
          }
        }
      }

      // Replace criteria: delete all then insert
      await supabase.from("evaluation_criteria").delete().eq("project_id", id);

      const validCriteria = criteria.filter((c) => c.label.trim());
      if (validCriteria.length > 0) {
        await supabase.from("evaluation_criteria").insert(
          validCriteria.map((c, i) => ({
            project_id: id,
            order_index: i,
            label: c.label,
            description: c.description,
            weight: c.weight,
            scoring_scale: c.scoring_scale as never,
            anchors: c.anchors,
            applies_to: c.applies_to as never,
          })),
        );

        // Save criteria flagged for library
        const toLibrary = validCriteria.filter((c) => c.save_to_library && !c.from_library);
        if (toLibrary.length > 0) {
          const { data: orgData } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
          if (orgData) {
            await supabase.from("criteria_templates").insert(
              toLibrary.map((c) => ({
                organization_id: orgData,
                created_by: user.id,
                label: c.label,
                description: c.description,
                weight: c.weight,
                scoring_scale: c.scoring_scale as never,
                applies_to: c.applies_to as never,
                anchors: c.anchors,
                category: c.category || null,
              })),
            );
          }
        }
      }

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Modifier le projet</h1>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : "cursor-pointer bg-primary/20 text-primary hover:bg-primary/30"
              }`}
            >
              {i + 1}
            </button>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  placeholder="CDI Développeur Full-Stack Paris"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Langue de l'entretien</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>Photo du recruteur</Label>
                <div className="mt-2 flex items-center gap-4">
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-20 w-20 rounded-full border-2 border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                          setExistingAvatarUrl(null);
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

              <div>
                <Label>Message d'intro</Label>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant={introType === "audio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIntroType("audio");
                      setIntroVideoFile(null);
                      setIntroVideoPreviewUrl(null);
                    }}
                  >
                    <Mic className="mr-1 h-4 w-4" /> Audio
                  </Button>
                  <Button
                    type="button"
                    variant={introType === "video" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIntroType("video");
                      setIntroAudioBlob(null);
                      setIntroAudioPreviewUrl(null);
                    }}
                  >
                    <Video className="mr-1 h-4 w-4" /> Vidéo
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex justify-end">
                  <IntroLibraryDialog
                    type={introType}
                    onSelect={(item) => {
                      if (introType === "audio") {
                        setIntroAudioBlob(null);
                        setIntroAudioPreviewUrl(item.audio_url);
                      } else {
                        setIntroVideoFile(null);
                        setIntroVideoPreviewUrl(item.video_url);
                      }
                    }}
                  />
                </div>
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
                <input
                  type="range"
                  min={15}
                  max={60}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Passage auto 3s</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Si le candidat ne parle pas pendant 3 secondes, la question suivante est envoyée automatiquement.
                  </p>
                </div>
                <Switch checked={autoSkipSilence} onCheckedChange={setAutoSkipSilence} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Autoriser le candidat à mettre en pause</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Affiche un bouton "Pause" pendant l'entretien. Le candidat peut figer l'interview et reprendre exactement où il s'était arrêté.
                  </p>
                </div>
                <Switch checked={allowPause} onCheckedChange={setAllowPause} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as "draft" | "active" | "archived")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Message de fin</Label>
                <Textarea
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  placeholder={DEFAULT_COMPLETION_MESSAGE}
                  rows={3}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ce message s'affichera sur l'écran de remerciement après l'entretien.
                </p>
              </div>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <strong>Titre :</strong> {title}
                  </p>
                  <p>
                    <strong>Langue :</strong> {language === "fr" ? "Français" : "English"}
                  </p>
                  <p>
                    <strong>Persona :</strong> {aiPersonaName}
                  </p>
                  <p>
                    <strong>Questions :</strong>{" "}
                    {
                      questions.filter(
                        (q) => q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl || q.audioBlob || q.videoBlob,
                      ).length
                    }
                  </p>
                  <p>
                    <strong>Critères :</strong> {criteria.filter((c) => c.label.trim()).length} (poids: {totalWeight}%)
                  </p>
                  <p>
                    <strong>Durée max :</strong> {maxDuration} min
                  </p>
                  <p>
                    <strong>Présentation :</strong>{" "}
                    {introType === "audio"
                      ? introAudioPreviewUrl
                        ? "Audio ✓"
                        : "Audio — non défini"
                      : introVideoPreviewUrl
                        ? "Vidéo ✓"
                        : "Vidéo — non définie"}
                  </p>
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
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        )}
      </div>
    </div>
  );
}
