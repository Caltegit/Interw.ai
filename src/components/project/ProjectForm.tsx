import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Mic, Video, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StepQuestions, Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";
import { IntroAudioRecorder } from "@/components/project/IntroAudioRecorder";
import { IntroVideoRecorder } from "@/components/project/IntroVideoRecorder";
import { IntroLibraryDialog } from "@/components/project/IntroLibraryDialog";
import { AvatarPicker } from "@/components/project/AvatarPicker";
import {
  InterviewTemplatePickerDialog,
  type InterviewTemplatePayload,
} from "@/components/project/InterviewTemplatePickerDialog";
import {
  VoiceSelectorDialog,
  getDefaultVoiceForGender,
  type VoiceGender,
} from "@/components/project/VoiceSelectorDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const STEPS = ["Infos", "Intro", "Questions", "Critères", "Publication"];
export const DEFAULT_COMPLETION_MESSAGE =
  "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.";

export type ProjectStatus = "draft" | "active" | "archived";

export interface CriterionState {
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

export interface ProjectFormState {
  title: string;
  language: "fr" | "en";
  ttsProvider: "browser" | "elevenlabs";
  ttsVoiceGender: VoiceGender;
  ttsVoiceId: string;
  aiPersonaName: string;
  aiVoice: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  presetAvatarUrl: string | null;
  introType: "audio" | "video";
  introAudioBlob: Blob | null;
  introAudioPreviewUrl: string | null;
  introVideoFile: File | null;
  introVideoPreviewUrl: string | null;
  questions: Question[];
  criteria: CriterionState[];
  maxDuration: number;
  recordAudio: boolean;
  recordVideo: boolean;
  status: ProjectStatus;
  autoSkipSilence: boolean;
  allowPause: boolean;
  completionMessage: string;
}

export function mergeTemplateIntoState(
  state: ProjectFormState,
  tpl: InterviewTemplatePayload,
): ProjectFormState {
  return {
    ...state,
    title: tpl.name || state.title,
    language: tpl.default_language || state.language,
    maxDuration: tpl.default_duration_minutes || state.maxDuration,
    questions: tpl.questions.length
      ? tpl.questions.map((q) => ({
          ...createEmptyQuestion(),
          title: q.title,
          content: q.content,
          category: q.category || "",
          mediaType: (q.type === "audio" || q.type === "video" ? q.type : "written") as
            | "written"
            | "audio"
            | "video",
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: q.relance_level,
          audioPreviewUrl: q.audio_url,
          videoPreviewUrl: q.video_url,
          from_library: true,
          hint_text: (q as { hint_text?: string | null }).hint_text ?? "",
          max_response_seconds:
            (q as { max_response_seconds?: number | null }).max_response_seconds ?? null,
        }))
      : state.questions,
    criteria: tpl.criteria.length
      ? tpl.criteria.map((c) => ({
          label: c.label,
          description: c.description,
          weight: c.weight,
          scoring_scale: c.scoring_scale,
          applies_to: c.applies_to,
          anchors: c.anchors,
          from_library: true,
        }))
      : state.criteria,
  };
}

export interface ProjectFormProps {
  mode: "create" | "edit";
  initial: ProjectFormState;
  onSubmit: (state: ProjectFormState) => Promise<void>;
  saving: boolean;
  header: React.ReactNode;
  submitLabel: { idle: string; busy: string };
}

export function ProjectForm({ mode, initial, onSubmit, saving, header, submitLabel }: ProjectFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  // State (initialised from props.initial — copied so parent stays decoupled)
  const [title, setTitle] = useState(initial.title);
  const [language, setLanguage] = useState<"fr" | "en">(initial.language);
  const [ttsProvider, setTtsProvider] = useState<"browser" | "elevenlabs">(initial.ttsProvider);
  const [ttsVoiceGender, setTtsVoiceGender] = useState<VoiceGender>(initial.ttsVoiceGender);
  const [ttsVoiceId, setTtsVoiceId] = useState<string>(initial.ttsVoiceId);
  const [aiPersonaName, setAiPersonaName] = useState(initial.aiPersonaName);
  const [aiVoice, setAiVoice] = useState<string>(initial.aiVoice);
  const [avatarFile, setAvatarFile] = useState<File | null>(initial.avatarFile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarPreview);
  const [presetAvatarUrl, setPresetAvatarUrl] = useState<string | null>(initial.presetAvatarUrl);
  const [introType, setIntroType] = useState<"audio" | "video">(initial.introType);
  const [introAudioBlob, setIntroAudioBlob] = useState<Blob | null>(initial.introAudioBlob);
  const [introAudioPreviewUrl, setIntroAudioPreviewUrl] = useState<string | null>(initial.introAudioPreviewUrl);
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(initial.introVideoFile);
  const [introVideoPreviewUrl, setIntroVideoPreviewUrl] = useState<string | null>(initial.introVideoPreviewUrl);
  const [questions, setQuestions] = useState<Question[]>(initial.questions);
  const [criteria, setCriteria] = useState<CriterionState[]>(initial.criteria);
  const [maxDuration, setMaxDuration] = useState(initial.maxDuration);
  const [recordAudio] = useState(initial.recordAudio);
  const [recordVideo] = useState(initial.recordVideo);
  const [status, setStatus] = useState<ProjectStatus>(initial.status);
  const [autoSkipSilence] = useState(initial.autoSkipSilence);
  const [allowPause, setAllowPause] = useState(initial.allowPause);
  const [completionMessage, setCompletionMessage] = useState(initial.completionMessage);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const canProceed = () => {
    if (step === 0) return !!title.trim();
    if (step === 2)
      return questions.some(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );
    if (step === 3) return criteria.some((c) => c.label.trim()) && totalWeight === 100;
    return true;
  };

  const handleSubmit = () => {
    onSubmit({
      title,
      language,
      ttsProvider,
      ttsVoiceGender,
      ttsVoiceId,
      aiPersonaName,
      aiVoice,
      avatarFile,
      avatarPreview,
      presetAvatarUrl,
      introType,
      introAudioBlob,
      introAudioPreviewUrl,
      introVideoFile,
      introVideoPreviewUrl,
      questions,
      criteria,
      maxDuration,
      recordAudio,
      recordVideo,
      status,
      autoSkipSilence,
      allowPause,
      completionMessage,
    });
  };

  const applyTemplate = (tpl: InterviewTemplatePayload) => {
    if (tpl.name) setTitle(tpl.name);
    if (tpl.default_language) setLanguage(tpl.default_language);
    if (tpl.default_duration_minutes) setMaxDuration(tpl.default_duration_minutes);
    if (tpl.questions.length) {
      setQuestions(
        tpl.questions.map((q) => ({
          ...createEmptyQuestion(),
          title: q.title,
          content: q.content,
          category: q.category || "",
          mediaType: (q.type === "audio" || q.type === "video" ? q.type : "written") as
            | "written"
            | "audio"
            | "video",
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: q.relance_level,
          audioPreviewUrl: q.audio_url,
          videoPreviewUrl: q.video_url,
          from_library: true,
          hint_text: (q as { hint_text?: string | null }).hint_text ?? "",
          max_response_seconds: (q as { max_response_seconds?: number | null }).max_response_seconds ?? null,
        })),
      );
    }
    if (tpl.criteria.length) {
      setCriteria(
        tpl.criteria.map((c) => ({
          label: c.label,
          description: c.description,
          weight: c.weight,
          scoring_scale: c.scoring_scale,
          applies_to: c.applies_to,
          anchors: c.anchors,
          from_library: true,
        })),
      );
    }
    toast({ title: "Modèle appliqué", description: "Vous pouvez ajuster les champs avant de créer le projet." });
  };

  const isEdit = mode === "edit";
  const idSuffix = isEdit ? "edit" : "new";

  const navButtons = (
    <div className="flex justify-between">
      <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
      </Button>
      {step < STEPS.length - 1 ? (
        <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
          Suivant <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? submitLabel.busy : submitLabel.idle}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {header}
        {!isEdit && (
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Démarrer depuis un session type
          </Button>
        )}
      </div>

      {!isEdit && (
        <InterviewTemplatePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onApply={applyTemplate} />
      )}

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => (isEdit || i < step) && setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : isEdit || i < step
                    ? "cursor-pointer bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-muted text-muted-foreground"
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

      {navButtons}

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
                <Label>Langue de l'session</Label>
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
              <div>
                <Label>Nom de l'interviewer IA</Label>
                <Input placeholder="Marie" value={aiPersonaName} onChange={(e) => setAiPersonaName(e.target.value)} />
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Genre de la voix</Label>
                  <RadioGroup
                    value={ttsVoiceGender}
                    onValueChange={(v) => {
                      const g = v as VoiceGender;
                      setTtsVoiceGender(g);
                      setTtsVoiceId(getDefaultVoiceForGender(g));
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id={`voice-gender-female-${idSuffix}`} />
                      <Label htmlFor={`voice-gender-female-${idSuffix}`} className="cursor-pointer font-normal">
                        Femme
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id={`voice-gender-male-${idSuffix}`} />
                      <Label htmlFor={`voice-gender-male-${idSuffix}`} className="cursor-pointer font-normal">
                        Homme
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-start justify-between gap-4 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Voix premium ElevenLabs</Label>
                    <p className="text-xs text-muted-foreground">
                      Voix réaliste haute qualité (~0,40 € par session). Si désactivé, voix standard du navigateur
                      (gratuit).
                    </p>
                  </div>
                  <Switch
                    checked={ttsProvider === "elevenlabs"}
                    onCheckedChange={(v) => {
                      if (v) setVoiceDialogOpen(true);
                      else setTtsProvider("browser");
                    }}
                  />
                </div>

                {ttsProvider === "elevenlabs" && (
                  <button
                    type="button"
                    onClick={() => setVoiceDialogOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier la voix
                  </button>
                )}
              </div>

              <VoiceSelectorDialog
                open={voiceDialogOpen}
                onOpenChange={setVoiceDialogOpen}
                gender={ttsVoiceGender}
                initialVoiceId={ttsVoiceId}
                personaName={aiPersonaName}
                onConfirm={(id) => {
                  setTtsVoiceId(id);
                  setTtsProvider("elevenlabs");
                }}
                onCancel={() => {
                  if (ttsProvider !== "elevenlabs") setTtsProvider("browser");
                }}
              />

              <div>
                <Label>Photo du recruteur</Label>
                <div className="mt-2">
                  <AvatarPicker
                    value={isEdit ? avatarPreview : (presetAvatarUrl ?? avatarPreview)}
                    onSelectPreset={(url) => {
                      if (isEdit) {
                        setAvatarFile(null);
                        setAvatarPreview(url);
                        setPresetAvatarUrl(url);
                      } else {
                        setPresetAvatarUrl(url);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }
                    }}
                    onUpload={(file) => {
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                      if (!isEdit) setPresetAvatarUrl(null);
                    }}
                    onClear={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      setPresetAvatarUrl(null);
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Autoriser le candidat à mettre en pause</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Affiche un bouton « Pause » pendant l'session. Le candidat peut figer l'interview et reprendre
                      exactement où il s'était arrêté.
                    </p>
                  </div>
                  <Switch checked={allowPause} onCheckedChange={setAllowPause} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      {isEdit && <SelectItem value="archived">Archivé</SelectItem>}
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
                    Ce message s'affichera sur l'écran de remerciement après l'session.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Message d'introduction</h2>
                <p className="text-sm text-muted-foreground">
                  Cette intro sera diffusée au candidat avant le début des questions.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
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

                <p className="text-xs text-muted-foreground">
                  💡 Astuce : enregistrez une intro chaleureuse pour mettre le candidat à l'aise.
                </p>
              </div>
            </div>
          )}

          {step === 2 && <StepQuestions questions={questions} setQuestions={setQuestions} />}

          {step === 3 && <StepCriteria criteria={criteria} setCriteria={setCriteria} totalWeight={totalWeight} />}

          {step === 4 && (
            <div className="space-y-4">
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
                        (q) =>
                          q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl || q.audioBlob || q.videoBlob,
                      ).length
                    }
                  </p>
                  <p>
                    <strong>Critères :</strong> {criteria.filter((c) => c.label.trim()).length} (poids : {totalWeight}%)
                  </p>
                  <p>
                    <strong>Durée max :</strong> {maxDuration} min
                  </p>
                  <p>
                    <strong>Pause autorisée :</strong> {allowPause ? "Oui" : "Non"}
                  </p>
                  <p>
                    <strong>Statut :</strong>{" "}
                    {status === "draft" ? "Brouillon" : status === "active" ? "Actif" : "Archivé"}
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

      {navButtons}
    </div>
  );
}
