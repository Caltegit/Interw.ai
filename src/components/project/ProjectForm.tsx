import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Sparkles, Link2, Volume2, Loader2, Settings2, Mic, User, UserRound, ChevronDown, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StepQuestions, Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";
import { StepIntro, type IntroMode } from "@/components/project/StepIntro";
import { AvatarPicker } from "@/components/project/AvatarPicker";
import {
  InterviewTemplatePickerDialog,
  type InterviewTemplatePayload,
} from "@/components/project/InterviewTemplatePickerDialog";
import { ImportFromJobDialog, type JobImportPayload } from "@/components/project/ImportFromJobDialog";
import {
  VoiceSelectorDialog,
  getDefaultVoiceForGender,
  FEMALE_VOICES,
  MALE_VOICES,
  type VoiceGender,
} from "@/components/project/VoiceSelectorDialog";
import { VoiceCloneDialog } from "@/components/settings/VoiceCloneDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AiTextCustomizerDialog,
  DEFAULT_AI_INTRO_TEXT,
  DEFAULT_AI_TRANSITION_TEXT,
} from "@/components/project/AiTextCustomizerDialog";

const STEPS = ["Infos", "Intro", "Questions", "Critères", "Publier"];
export const DEFAULT_COMPLETION_MESSAGE = "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.";
export const DEFAULT_PRE_SESSION_MESSAGE = "Soyez naturel.le et souriez, vous êtes filmé.e !";

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
  allowSkipQuestion: boolean;
  introFirstScreen: boolean;
  completionMessage: string;
  preSessionMessage: string;
  aiIntroEnabled: boolean;
  aiIntroMode: "auto" | "custom";
  aiIntroCustomText: string;
  aiQuestionTransitionsEnabled: boolean;
  aiQuestionTransitionsMode: "auto" | "custom";
  aiQuestionTransitionsCustomText: string;
  audioAnalysisEnabled: boolean;
  showQuestionTimer: boolean;
  saveIntroToLibrary?: boolean;
  reportRecipientUserIds: string[];
}

export function mergeTemplateIntoState(state: ProjectFormState, tpl: InterviewTemplatePayload): ProjectFormState {
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
          mediaType: (q.type === "audio" || q.type === "video" ? q.type : "written") as "written" | "audio" | "video",
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: q.relance_level,
          audioPreviewUrl: q.audio_url,
          videoPreviewUrl: q.video_url,
          from_library: true,
          hint_text: (q as { hint_text?: string | null }).hint_text ?? "",
          max_response_seconds: (q as { max_response_seconds?: number | null }).max_response_seconds ?? null,
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
  const [importOpen, setImportOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const { user } = useAuth();
  const [existingClonedVoice, setExistingClonedVoice] = useState<{ id: string; name: string } | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [deletingVoice, setDeletingVoice] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
      previewAudioRef.current = null;
    }
    setPreviewingVoiceId(null);
  };

  useEffect(() => () => stopPreview(), []);

  const playVoicePreview = async (voiceId: string) => {
    if (previewingVoiceId === voiceId) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewingVoiceId(voiceId);
    try {
      const cleanName = (aiPersonaName || "votre interviewer").trim();
      const text = `Bonjour, je suis ${cleanName}, ravi de faire votre connaissance.`;
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
      const url = `https://${projectId}.functions.supabase.co/tts-elevenlabs`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ text, voiceId, preview: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("audio")) throw new Error("Réponse non audio");
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewingVoiceId(null); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setPreviewingVoiceId(null); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch (err) {
      console.error("[ProjectForm] preview failed", err);
      toast({ title: "Aperçu impossible", description: "Impossible de jouer un aperçu de la voix.", variant: "destructive" });
      setPreviewingVoiceId(null);
    }
  };

  const getVoiceName = (voiceId: string): string => {
    if (existingClonedVoice && existingClonedVoice.id === voiceId) {
      return `${existingClonedVoice.name} (ma voix)`;
    }
    const all = [...FEMALE_VOICES, ...MALE_VOICES];
    return all.find((v) => v.id === voiceId)?.name || "Voix par défaut";
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("cloned_voice_id, cloned_voice_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.cloned_voice_id) {
          setExistingClonedVoice({ id: data.cloned_voice_id, name: data.cloned_voice_name || "Ma voix" });
        } else {
          setExistingClonedVoice(null);
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  // Charge les membres de l'organisation pour le sélecteur de destinataires
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const orgId = prof?.organization_id;
      if (!orgId) return;
      const { data: members } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("organization_id", orgId)
        .order("full_name");
      if (!cancelled && members) setOrgMembers(members);
    })();
    return () => { cancelled = true; };

  const handleCloneClick = () => {
    if (existingClonedVoice) {
      setConfirmReplaceOpen(true);
    } else {
      setCloneDialogOpen(true);
    }
  };

  const handleDeleteAndReclone = async () => {
    setDeletingVoice(true);
    try {
      const { error } = await supabase.functions.invoke("delete-cloned-voice");
      if (error) throw error;
      setExistingClonedVoice(null);
      setConfirmReplaceOpen(false);
      setCloneDialogOpen(true);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setDeletingVoice(false);
    }
  };

  // State (initialised from props.initial — copied so parent stays decoupled)
  const [title, setTitle] = useState(initial.title);
  const [language, setLanguage] = useState<"fr" | "en">(initial.language);
  const [ttsProvider, setTtsProvider] = useState<"browser" | "elevenlabs">("elevenlabs");
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
  const [allowSkipQuestion, setAllowSkipQuestion] = useState(initial.allowSkipQuestion);
  const [introFirstScreen, setIntroFirstScreen] = useState(initial.introFirstScreen);
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
  const [audioAnalysisEnabled, setAudioAnalysisEnabled] = useState(initial.audioAnalysisEnabled);
  const [showQuestionTimer, setShowQuestionTimer] = useState(initial.showQuestionTimer);
  const [saveIntroToLibrary, setSaveIntroToLibrary] = useState<boolean>(initial.saveIntroToLibrary ?? false);
  const [reportRecipientUserIds, setReportRecipientUserIds] = useState<string[]>(initial.reportRecipientUserIds ?? []);
  const [orgMembers, setOrgMembers] = useState<Array<{ user_id: string; full_name: string; email: string }>>([]);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
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
      allowSkipQuestion,
      introFirstScreen,
      completionMessage,
      preSessionMessage,
      aiIntroEnabled,
      aiIntroMode,
      aiIntroCustomText,
      aiQuestionTransitionsEnabled,
      aiQuestionTransitionsMode,
      aiQuestionTransitionsCustomText,
      audioAnalysisEnabled,
      showQuestionTimer,
      saveIntroToLibrary,
      reportRecipientUserIds,
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
          mediaType: (q.type === "audio" || q.type === "video" ? q.type : "written") as "written" | "audio" | "video",
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: q.relance_level,
          audioPreviewUrl: q.audio_url,
          videoPreviewUrl: q.video_url,
          from_library: true,
          hint_text: (q as { hint_text?: string | null }).hint_text ?? "",
          max_response_seconds: (q as { max_response_seconds?: number | null }).max_response_seconds ?? null,
          avatar_image_url: (q as { avatar_image_url?: string | null }).avatar_image_url ?? null,
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

  const applyJobImport = (payload: JobImportPayload) => {
    if (payload.title) setTitle(payload.title);

    // Questions personnalisées générées par l'IA
    if (payload.questions.length) {
      setQuestions(
        payload.questions.map((q) => ({
          ...createEmptyQuestion(),
          title: q.title,
          content: q.content,
          mediaType: "written",
        })),
      );
    }

    // Critères pondérés
    if (payload.criteria.length) {
      setCriteria(
        payload.criteria.map((c) => ({
          label: c.label,
          description: c.description,
          weight: c.weight,
          scoring_scale: "0-5",
          applies_to: "all_questions",
          anchors: {},
          from_library: false,
        })),
      );
    }

    // L'intro est volontairement laissée à choisir manuellement par l'utilisateur ensuite.

    // Dernière voix utilisée
    if (payload.voice) {
      setTtsProvider("elevenlabs");
      setTtsVoiceGender(payload.voice.tts_voice_gender);
      setTtsVoiceId(payload.voice.tts_voice_id);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Démarrer depuis une offre existante
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Démarrer depuis un session type
            </Button>
          </div>
        )}
      </div>

      {!isEdit && (
        <>
          <InterviewTemplatePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onApply={applyTemplate} />
          <ImportFromJobDialog open={importOpen} onOpenChange={setImportOpen} onApply={applyJobImport} />
        </>
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
                <Label>Nom du recruteur IA</Label>
                <Input placeholder="Léa" value={aiPersonaName} onChange={(e) => setAiPersonaName(e.target.value)} />
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Durée maximale : 30 min</Label>
                  <p className="text-xs text-muted-foreground">
                    Choisissez la voix qui sera utilisée pendant l'entretien.
                  </p>
                </div>

                <RadioGroup
                  value={ttsVoiceGender}
                  onValueChange={(v) => {
                    const g = v as VoiceGender;
                    stopPreview();
                    setTtsVoiceGender(g);
                    setTtsVoiceId(getDefaultVoiceForGender(g));
                  }}
                  className="grid grid-cols-2 gap-3"
                >
                  {([
                    { value: "female" as VoiceGender, label: "Femme", Icon: UserRound },
                    { value: "male" as VoiceGender, label: "Homme", Icon: User },
                  ]).map(({ value, label, Icon }) => {
                    const selected = ttsVoiceGender === value;
                    const defaultId = getDefaultVoiceForGender(value);
                    const inputId = `voice-gender-${value}-${idSuffix}`;
                    return (
                      <div
                        key={value}
                        className={`relative rounded-lg border p-3 transition-colors ${
                          selected ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <Label htmlFor={inputId} className="flex items-center gap-3 cursor-pointer font-normal">
                          <RadioGroupItem value={value} id={inputId} />
                          <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium">{label}</span>
                        </Label>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); playVoicePreview(defaultId); }}
                          className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-background"
                          aria-label={`Écouter la voix ${label}`}
                        >
                          {previewingVoiceId === defaultId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </RadioGroup>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Voix sélectionnée :</span>
                    <span className="font-medium">{getVoiceName(ttsVoiceId)}</span>
                    <button
                      type="button"
                      onClick={() => playVoicePreview(ttsVoiceId)}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-accent"
                      aria-label="Écouter la voix sélectionnée"
                    >
                      {previewingVoiceId === ttsVoiceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setVoiceDialogOpen(true)}>
                      <Settings2 className="h-4 w-4" />
                      Modifier la voix
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCloneClick}>
                      <Mic className="h-4 w-4" />
                      Cloner ma voix
                    </Button>
                  </div>
                </div>
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
                onCancel={() => {}}
              />

              <VoiceCloneDialog
                open={cloneDialogOpen}
                onOpenChange={setCloneDialogOpen}
                defaultName={aiPersonaName || "Ma voix"}
                onCloned={(id, name) => {
                  setTtsVoiceId(id);
                  setTtsProvider("elevenlabs");
                  setExistingClonedVoice({ id, name: name || aiPersonaName || "Ma voix" });
                }}
              />

              <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Voix déjà clonée</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous avez déjà cloné une voix («&nbsp;{existingClonedVoice?.name}&nbsp;»). Pour en créer une nouvelle, l'ancienne sera supprimée définitivement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingVoice}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deletingVoice}
                      onClick={(e) => { e.preventDefault(); handleDeleteAndReclone(); }}
                    >
                      {deletingVoice ? "Suppression…" : "Supprimer et recloner"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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

              <Collapsible className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between group">
                    <span>Fonctionnalités avancées</span>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                      Affiche un bouton « Pause » pendant la session. Le candidat peut figer l'interview et reprendre
                      exactement où il s'était arrêté.
                    </p>
                  </div>
                  <Switch checked={allowPause} onCheckedChange={setAllowPause} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Autoriser le candidat à passer une question</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Affiche un lien discret « Passer la question » pendant l'entretien.
                    </p>
                  </div>
                  <Switch checked={allowSkipQuestion} onCheckedChange={setAllowSkipQuestion} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Afficher le timer sur les questions</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si désactivé, le candidat voit uniquement une indication du temps imparti (ex. « Répondez en 1 min »). Le décompte réapparaît automatiquement dans les 20 dernières secondes.
                    </p>
                  </div>
                  <Switch checked={showQuestionTimer} onCheckedChange={setShowQuestionTimer} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>Intro IA</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Si désactivé, l'IA ne prononce pas de phrase d'accueil avant la première question.
                      </p>
                    </div>
                    <Switch checked={aiIntroEnabled} onCheckedChange={setAiIntroEnabled} />
                  </div>
                  {aiIntroEnabled && (
                    <div className="ml-1 space-y-2 border-l-2 border-border pl-3">
                      <RadioGroup
                        value={aiIntroMode}
                        onValueChange={(v) => setAiIntroMode(v as "auto" | "custom")}
                        className="gap-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="auto" id={`ai-intro-auto-${idSuffix}`} />
                          <Label htmlFor={`ai-intro-auto-${idSuffix}`} className="cursor-pointer font-normal text-sm">
                            Laisser l'IA s'adapter au contexte des réponses
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="custom" id={`ai-intro-custom-${idSuffix}`} />
                          <Label htmlFor={`ai-intro-custom-${idSuffix}`} className="cursor-pointer font-normal text-sm">
                            Utiliser un texte fixe
                          </Label>
                        </div>
                      </RadioGroup>
                      {aiIntroMode === "custom" && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setIntroCustomizerOpen(true)}>
                          Modifier le texte
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>Transitions entre questions</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Phrase prononcée par l'IA entre deux questions.
                      </p>
                    </div>
                    <Switch checked={aiQuestionTransitionsEnabled} onCheckedChange={setAiQuestionTransitionsEnabled} />
                  </div>
                  {aiQuestionTransitionsEnabled && (
                    <div className="ml-1 space-y-2 border-l-2 border-border pl-3">
                      <RadioGroup
                        value={aiQuestionTransitionsMode}
                        onValueChange={(v) => setAiQuestionTransitionsMode(v as "auto" | "custom")}
                        className="gap-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="auto" id={`ai-trans-auto-${idSuffix}`} />
                          <Label htmlFor={`ai-trans-auto-${idSuffix}`} className="cursor-pointer font-normal text-sm">
                            Laisser l'IA s'adapter au contexte des réponses
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="custom" id={`ai-trans-custom-${idSuffix}`} />
                          <Label htmlFor={`ai-trans-custom-${idSuffix}`} className="cursor-pointer font-normal text-sm">
                            Utiliser un texte fixe
                          </Label>
                        </div>
                      </RadioGroup>
                      {aiQuestionTransitionsMode === "custom" && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setTransitionsCustomizerOpen(true)}>
                          Modifier le texte
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <AiTextCustomizerDialog
                  open={introCustomizerOpen}
                  onOpenChange={setIntroCustomizerOpen}
                  title="Texte de l'intro IA"
                  description="Phrase prononcée par l'IA juste avant la première question."
                  defaultText={DEFAULT_AI_INTRO_TEXT}
                  value={aiIntroCustomText}
                  variables={[
                    { token: "{prenom}", description: "Prénom du candidat" },
                    { token: "{poste}", description: "Intitulé du poste" },
                    { token: "{question_suivante}", description: "Contenu de la première question" },
                  ]}
                  onSave={setAiIntroCustomText}
                />

                <AiTextCustomizerDialog
                  open={transitionsCustomizerOpen}
                  onOpenChange={setTransitionsCustomizerOpen}
                  title="Texte de transition entre questions"
                  description="Phrase prononcée par l'IA entre deux questions."
                  defaultText={DEFAULT_AI_TRANSITION_TEXT}
                  value={aiQuestionTransitionsCustomText}
                  variables={[
                    { token: "{prenom}", description: "Prénom du candidat" },
                    { token: "{question_suivante}", description: "Contenu de la question suivante" },
                  ]}
                  onSave={setAiQuestionTransitionsCustomText}
                />
              </div>
                </CollapsibleContent>
              </Collapsible>
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
              saveToLibrary={saveIntroToLibrary}
              setSaveToLibrary={setSaveIntroToLibrary}
            />
          )}

          {step === 2 && (
            <StepQuestions
              questions={questions}
              setQuestions={setQuestions}
              projectAvatarUrl={isEdit ? avatarPreview : (presetAvatarUrl ?? avatarPreview)}
            />
          )}

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
                        (q) => q.content.trim() || q.audioPreviewUrl || q.videoPreviewUrl || q.audioBlob || q.videoBlob,
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
                    {status === "archived" ? "Archivé" : "Actif"}
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
