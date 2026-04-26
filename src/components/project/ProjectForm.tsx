import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StepQuestions, Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";
import { StepIntro, type IntroMode } from "@/components/project/StepIntro";
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
export const DEFAULT_PRE_SESSION_MESSAGE =
  "Soyez naturel·le et souriez, vous êtes filmé·e !";

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
  introEnabled: boolean;
  introMode: IntroMode;
  introText: string;
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
  preSessionMessage: string;
  aiIntroEnabled: boolean;
  aiIntroMode: "auto" | "custom";
  aiIntroCustomText: string;
  aiQuestionTransitionsEnabled: boolean;
  aiQuestionTransitionsMode: "auto" | "custom";
  aiQuestionTransitionsCustomText: string;
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
  const [introEnabled, setIntroEnabled] = useState(initial.introEnabled);
  const [introMode, setIntroMode] = useState<IntroMode>(initial.introMode);
  const [introText, setIntroText] = useState(initial.introText);
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
  const [preSessionMessage, setPreSessionMessage] = useState(initial.preSessionMessage);
  const [aiIntroEnabled, setAiIntroEnabled] = useState(initial.aiIntroEnabled);
  const [aiIntroMode, setAiIntroMode] = useState<"auto" | "custom">(initial.aiIntroMode);
  const [aiIntroCustomText, setAiIntroCustomText] = useState(initial.aiIntroCustomText);
  const [aiQuestionTransitionsEnabled, setAiQuestionTransitionsEnabled] = useState(
    initial.aiQuestionTransitionsEnabled,
  );
  const [aiQuestionTransitionsMode, setAiQuestionTransitionsMode] = useState<"auto" | "custom">(
    initial.aiQuestionTransitionsMode,
  );
  const [aiQuestionTransitionsCustomText, setAiQuestionTransitionsCustomText] = useState(
    initial.aiQuestionTransitionsCustomText,
  );
  const [introCustomizerOpen, setIntroCustomizerOpen] = useState(false);
  const [transitionsCustomizerOpen, setTransitionsCustomizerOpen] = useState(false);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const canProceed = () => {
    if (step === 0) return !!title.trim();
    if (step === 2)
      return questions.some(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );
    if (step === 3) return criteria.some((c) => c.label.trim());
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
      introEnabled,
      introMode,
      introText,
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
      preSessionMessage,
      aiIntroEnabled,
      aiQuestionTransitionsEnabled,
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
        {!isEdit && step === 0 && (
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
                  <Label>Message de début</Label>
                  <Textarea
                    value={preSessionMessage}
                    onChange={(e) => setPreSessionMessage(e.target.value)}
                    placeholder={DEFAULT_PRE_SESSION_MESSAGE}
                    rows={2}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Court message d'encouragement affiché au candidat juste avant le démarrage de la session.
                  </p>
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
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Intro IA</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si désactivé, l'IA ne prononce pas de phrase d'accueil avant la première question.
                    </p>
                  </div>
                  <Switch checked={aiIntroEnabled} onCheckedChange={setAiIntroEnabled} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Transitions entre questions</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si désactivé, l'IA enchaîne directement les questions sans phrase de liaison (« Merci, passons à la suite »…).
                    </p>
                  </div>
                  <Switch
                    checked={aiQuestionTransitionsEnabled}
                    onCheckedChange={setAiQuestionTransitionsEnabled}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <StepIntro
              introEnabled={introEnabled}
              setIntroEnabled={setIntroEnabled}
              introMode={introMode}
              setIntroMode={setIntroMode}
              introText={introText}
              setIntroText={setIntroText}
              introAudioPreviewUrl={introAudioPreviewUrl}
              setIntroAudioBlob={setIntroAudioBlob}
              setIntroAudioPreviewUrl={setIntroAudioPreviewUrl}
              introVideoPreviewUrl={introVideoPreviewUrl}
              setIntroVideoFile={setIntroVideoFile}
              setIntroVideoPreviewUrl={setIntroVideoPreviewUrl}
              ttsVoiceId={ttsVoiceId}
              avatarPreview={avatarPreview}
              aiPersonaName={aiPersonaName}
            />
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
                    <strong>Intro :</strong>{" "}
                    {!introEnabled
                      ? "Désactivée"
                      : introMode === "text"
                        ? introText.trim()
                          ? "Texte ✓"
                          : "Texte — non défini"
                        : introMode === "tts"
                          ? introText.trim()
                            ? "Texte lu par l'IA ✓"
                            : "Texte lu par l'IA — non défini"
                          : introMode === "audio"
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
