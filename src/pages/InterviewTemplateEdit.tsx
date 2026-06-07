import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { createEmptyQuestion } from "@/components/project/StepQuestions";
import { getDefaultVoiceForGender, type VoiceGender } from "@/components/project/VoiceSelectorDialog";
import {
  ProjectForm,
  DEFAULT_COMPLETION_MESSAGE,
  DEFAULT_PRE_SESSION_MESSAGE,
  type ProjectFormState,
} from "@/components/project/ProjectForm";
import { mergeCandidateFields, DEFAULT_CANDIDATE_FIELDS } from "@/lib/candidateFields";
import {
  DEFAULT_CANDIDATE_EMAIL_BODY,
  DEFAULT_CANDIDATE_EMAIL_SUBJECT,
} from "@/lib/candidateEmailDefaults";

export default function InterviewTemplateEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [initial, setInitial] = useState<ProjectFormState | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: tpl, error } = await supabase
        .from("interview_templates" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !tpl) {
        toast({ title: "Session type introuvable", variant: "destructive" });
        navigate("/library/sessions");
        return;
      }
      const t = tpl as unknown as Record<string, unknown>;

      const loadedGender = ((t.tts_voice_gender as VoiceGender) ?? "female");

      // Intro mode fallback
      let introMode: "text" | "tts" | "audio" | "video" = "text";
      if (t.intro_mode === "text" || t.intro_mode === "tts" || t.intro_mode === "audio" || t.intro_mode === "video") {
        introMode = t.intro_mode;
      } else if (t.presentation_video_url) {
        introMode = "video";
      } else if (t.intro_audio_url) {
        introMode = "audio";
      }

      const { data: qs } = await supabase
        .from("interview_template_questions" as never)
        .select("*")
        .eq("template_id", id)
        .order("order_index");
      const qList = (qs as unknown as Array<Record<string, unknown>>) || [];
      const questions = qList.length
        ? qList.map((q) => {
            const mediaType: "written" | "audio" | "video" = q.video_url
              ? "video"
              : q.audio_url
                ? "audio"
                : "written";
            return {
              ...createEmptyQuestion(),
              title: (q.title as string) || "",
              content: (q.content as string) || "",
              mediaType,
              follow_up_enabled: !!q.follow_up_enabled,
              max_follow_ups: (q.max_follow_ups as number) ?? 0,
              relance_level: ((q.relance_level as "light" | "medium" | "deep") ?? "medium"),
              audioPreviewUrl: (q.audio_url as string | null) ?? null,
              videoPreviewUrl: (q.video_url as string | null) ?? null,
              from_library: true,
              save_to_library: false,
              hint_text: (q.hint_text as string | null) ?? "",
              max_response_seconds: (q.max_response_seconds as number | null) ?? null,
              avatar_image_url: (q.avatar_image_url as string | null) ?? null,
            };
          })
        : [createEmptyQuestion()];

      const { data: cs } = await supabase
        .from("interview_template_criteria" as never)
        .select("*")
        .eq("template_id", id)
        .order("order_index");
      const cList = (cs as unknown as Array<Record<string, unknown>>) || [];
      const criteria = cList.length
        ? cList.map((c) => ({
            label: (c.label as string) || "",
            description: (c.description as string) || "",
            weight: (c.weight as number) || 0,
            scoring_scale: (c.scoring_scale as string) || "0-5",
            anchors: ((c.anchors as Record<string, string>) || {}),
            applies_to: (c.applies_to as string) || "all_questions",
            from_library: true,
          }))
        : [
            {
              label: "",
              description: "",
              weight: 100,
              scoring_scale: "0-5",
              anchors: {},
              applies_to: "all_questions",
            },
          ];

      setInitial({
        title: (t.name as string) || "",
        language: ((t.default_language as string) || "fr") as "fr" | "en",
        ttsProvider: ((t.tts_provider as "browser" | "elevenlabs") ?? "browser"),
        ttsVoiceGender: loadedGender,
        ttsVoiceId: ((t.tts_voice_id as string | null) ?? getDefaultVoiceForGender(loadedGender)),
        aiPersonaName: (t.ai_persona_name as string) || "Sophie",
        aiVoice: (t.ai_voice as string) || "female_fr",
        avatarFile: null,
        avatarPreview: (t.avatar_image_url as string | null) ?? null,
        presetAvatarUrl: (t.avatar_image_url as string | null) ?? null,
        introEnabled: (t.intro_enabled as boolean | null) ?? true,
        introMode,
        introText: (t.intro_text as string) || "",
        introAudioBlob: null,
        introAudioPreviewUrl: (t.intro_audio_url as string | null) ?? null,
        introVideoFile: null,
        introVideoPreviewUrl: (t.presentation_video_url as string | null) ?? null,
        questions,
        criteria,
        maxDuration: (t.default_duration_minutes as number) || 30,
        recordAudio: (t.record_audio as boolean | null) ?? true,
        recordVideo: (t.record_video as boolean | null) ?? true,
        status: "active",
        autoSkipSilence: (t.auto_skip_silence as boolean | null) ?? true,
        allowPause: (t.allow_pause as boolean | null) ?? false,
        allowSkipQuestion: (t.allow_skip_question as boolean | null) ?? true,
        introFirstScreen: (t.intro_first_screen as boolean | null) ?? false,
        completionMessage: (t.completion_message as string) || DEFAULT_COMPLETION_MESSAGE,
        preSessionMessage: (t.pre_session_message as string) || DEFAULT_PRE_SESSION_MESSAGE,
        aiIntroEnabled: (t.ai_intro_enabled as boolean | null) ?? true,
        aiIntroMode: ((t.ai_intro_mode as "auto" | "custom") ?? "auto"),
        aiIntroCustomText: (t.ai_intro_custom_text as string) || "",
        aiQuestionTransitionsEnabled: (t.ai_question_transitions_enabled as boolean | null) ?? true,
        aiQuestionTransitionsMode: ((t.ai_question_transitions_mode as "auto" | "custom") ?? "auto"),
        aiQuestionTransitionsCustomText: (t.ai_question_transitions_custom_text as string) || "",
        audioAnalysisEnabled: (t.audio_analysis_enabled as boolean | null) ?? true,
        showQuestionTimer: (t.show_question_timer as boolean | null) ?? true,
        reportRecipientUserIds: [],
        visibleToUserIds: [],
        candidateFields: t.candidate_fields ? mergeCandidateFields(t.candidate_fields) : DEFAULT_CANDIDATE_FIELDS,
        candidateEmailSubject: (t.candidate_email_subject as string) || DEFAULT_CANDIDATE_EMAIL_SUBJECT,
        candidateEmailBody: (t.candidate_email_body as string) || DEFAULT_CANDIDATE_EMAIL_BODY,
      });
      setLoading(false);
    })();
  }, [id, navigate, toast]);

  const handleSave = async (s: ProjectFormState) => {
    if (!id || !user) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      // Avatar upload (si nouveau fichier)
      let avatarUrl: string | null = s.avatarPreview ?? null;
      if (s.avatarFile) {
        const ext = s.avatarFile.name.split(".").pop() || "png";
        const path = `templates/avatars/${id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, s.avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Intro audio upload
      let introAudioUrl: string | null =
        s.introEnabled && s.introMode === "audio" ? s.introAudioPreviewUrl : null;
      if (s.introEnabled && s.introMode === "audio" && s.introAudioBlob) {
        const introPath = `templates/intro/${id}.webm`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(introPath, s.introAudioBlob, { contentType: "audio/webm", upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(introPath);
        introAudioUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Intro video upload
      let presentationVideoUrl: string | null =
        s.introEnabled && s.introMode === "video" ? s.introVideoPreviewUrl : null;
      if (s.introEnabled && s.introMode === "video" && s.introVideoFile) {
        const videoPath = `templates/presentation/${id}.webm`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(videoPath, s.introVideoFile, { contentType: s.introVideoFile.type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(videoPath);
        presentationVideoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const introTextValue =
        s.introEnabled && (s.introMode === "text" || s.introMode === "tts")
          ? s.introText.trim() || null
          : null;

      const { error: updateError } = await supabase
        .from("interview_templates" as never)
        .update({
          name: s.title,
          job_title: s.title,
          default_language: s.language as never,
          default_duration_minutes: s.maxDuration,
          ai_persona_name: s.aiPersonaName,
          ai_voice: s.aiVoice as never,
          avatar_image_url: avatarUrl,
          tts_provider: s.ttsProvider,
          tts_voice_gender: s.ttsVoiceGender,
          tts_voice_id: s.ttsVoiceId,
          intro_enabled: s.introEnabled,
          intro_mode: s.introEnabled ? s.introMode : null,
          intro_text: introTextValue,
          intro_audio_url: introAudioUrl,
          presentation_video_url: presentationVideoUrl,
          ai_intro_enabled: s.aiIntroEnabled,
          ai_intro_mode: s.aiIntroMode,
          ai_intro_custom_text: s.aiIntroCustomText.trim() || null,
          ai_question_transitions_enabled: s.aiQuestionTransitionsEnabled,
          ai_question_transitions_mode: s.aiQuestionTransitionsMode,
          ai_question_transitions_custom_text: s.aiQuestionTransitionsCustomText.trim() || null,
          record_audio: s.recordAudio,
          record_video: s.recordVideo,
          auto_skip_silence: s.autoSkipSilence,
          allow_pause: s.allowPause,
          allow_skip_question: s.allowSkipQuestion,
          intro_first_screen: s.introFirstScreen,
          audio_analysis_enabled: s.audioAnalysisEnabled,
          show_question_timer: s.showQuestionTimer,
          completion_message: s.completionMessage.trim() || null,
          pre_session_message: s.preSessionMessage.trim() || null,
          candidate_fields: s.candidateFields,
          candidate_email_subject: s.candidateEmailSubject.trim() || null,
          candidate_email_body: s.candidateEmailBody.trim() || null,
        } as never)
        .eq("id", id);
      if (updateError) throw updateError;

      // Remplacer les questions et critères (table simple → on supprime puis on réinsère)
      await supabase.from("interview_template_questions" as never).delete().eq("template_id", id);
      const validQ = s.questions.filter((q) => q.content.trim() || q.title.trim() || q.audioPreviewUrl || q.videoPreviewUrl);
      if (validQ.length) {
        await supabase.from("interview_template_questions" as never).insert(
          validQ.map((q, i) => ({
            template_id: id,
            order_index: i,
            title: q.title || q.content.slice(0, 60),
            content: q.content || q.title,
            type: q.mediaType,
            audio_url: q.audioPreviewUrl && !q.audioPreviewUrl.startsWith("blob:") ? q.audioPreviewUrl : null,
            video_url: q.videoPreviewUrl && !q.videoPreviewUrl.startsWith("blob:") ? q.videoPreviewUrl : null,
            category: q.category || null,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
            relance_level: q.relance_level,
            hint_text: q.hint_text?.trim() || null,
            max_response_seconds: q.max_response_seconds ?? null,
            avatar_image_url: q.avatar_image_url ?? null,
          })) as never,
        );
      }

      await supabase.from("interview_template_criteria" as never).delete().eq("template_id", id);
      const validC = s.criteria.filter((c) => c.label.trim());
      if (validC.length) {
        await supabase.from("interview_template_criteria" as never).insert(
          validC.map((c, i) => ({
            template_id: id,
            order_index: i,
            label: c.label,
            description: c.description,
            weight: c.weight,
            scoring_scale: c.scoring_scale,
            applies_to: c.applies_to,
            anchors: c.anchors || {},
          })) as never,
        );
      }

      toast({ title: "Session type enregistrée" });
      navigate("/library/sessions");
    } catch (e: unknown) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  if (loading || !initial) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ProjectForm
      mode="template"
      initial={initial}
      onSubmit={handleSave}
      saving={saving}
      header={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/library/sessions")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <h1 className="text-2xl font-bold">Édition de la session type</h1>
        </div>
      }
      submitLabel={{ idle: "Enregistrer la session type", busy: "Enregistrement..." }}
    />
  );
}
