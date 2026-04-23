import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createEmptyQuestion } from "@/components/project/StepQuestions";
import { getDefaultVoiceForGender, type VoiceGender } from "@/components/project/VoiceSelectorDialog";
import {
  ProjectForm,
  DEFAULT_COMPLETION_MESSAGE,
  type ProjectFormState,
} from "@/components/project/ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [initial, setInitial] = useState<ProjectFormState | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);

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

      const loadedGender = (((project as { tts_voice_gender?: string }).tts_voice_gender as VoiceGender) ?? "female");

      const projAny = project as unknown as {
        intro_enabled?: boolean | null;
        intro_mode?: string | null;
        intro_text?: string | null;
        intro_audio_url?: string | null;
        presentation_video_url?: string | null;
      };
      const dbEnabled = projAny.intro_enabled ?? true;
      let introMode: "text" | "tts" | "audio" | "video" = "text";
      if (projAny.intro_mode === "text" || projAny.intro_mode === "tts" || projAny.intro_mode === "audio" || projAny.intro_mode === "video") {
        introMode = projAny.intro_mode;
      } else if (projAny.presentation_video_url) {
        introMode = "video";
      } else if (projAny.intro_audio_url) {
        introMode = "audio";
      }
      const introText = projAny.intro_text ?? "";
      const introAudioPreviewUrl = projAny.intro_audio_url ?? null;
      const introVideoPreviewUrl = projAny.presentation_video_url ?? null;

      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .eq("project_id", id)
        .is("archived_at", null)
        .order("order_index", { ascending: true });

      const questions =
        questionsData && questionsData.length > 0
          ? questionsData.map((q) => {
              const mediaType: "written" | "audio" | "video" = q.video_url
                ? "video"
                : q.audio_url
                  ? "audio"
                  : "written";
              return {
                ...createEmptyQuestion(),
                id: q.id,
                title: q.title || "",
                content: q.content || "",
                type: q.type,
                mediaType,
                follow_up_enabled: q.follow_up_enabled,
                max_follow_ups: q.max_follow_ups,
                relance_level:
                  ((q as { relance_level?: string }).relance_level as "light" | "medium" | "deep") ?? "medium",
                audioPreviewUrl: q.audio_url,
                videoPreviewUrl: q.video_url,
                from_library: true,
                save_to_library: false,
                hint_text: ((q as { hint_text?: string | null }).hint_text) ?? "",
                max_response_seconds: ((q as { max_response_seconds?: number | null }).max_response_seconds) ?? null,
              };
            })
          : [createEmptyQuestion()];

      const { data: criteriaData } = await supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("project_id", id)
        .order("order_index", { ascending: true });

      const criteria =
        criteriaData && criteriaData.length > 0
          ? criteriaData.map((c) => ({
              id: c.id,
              label: c.label,
              description: c.description || "",
              weight: c.weight,
              scoring_scale: c.scoring_scale,
              anchors: (c.anchors as Record<string, string>) || {},
              applies_to: c.applies_to,
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

      setExistingAvatarUrl(project.avatar_image_url);

      setInitial({
        title: project.title,
        language: project.language as "fr" | "en",
        ttsProvider:
          ((project as { tts_provider?: string }).tts_provider as "browser" | "elevenlabs") ?? "browser",
        ttsVoiceGender: loadedGender,
        ttsVoiceId:
          (project as { tts_voice_id?: string | null }).tts_voice_id ?? getDefaultVoiceForGender(loadedGender),
        aiPersonaName: project.ai_persona_name,
        aiVoice: project.ai_voice,
        avatarFile: null,
        avatarPreview: project.avatar_image_url,
        presetAvatarUrl: null,
        introEnabled: dbEnabled,
        introMode,
        introText,
        introAudioBlob: null,
        introAudioPreviewUrl,
        introVideoFile: null,
        introVideoPreviewUrl,
        questions,
        criteria,
        maxDuration: project.max_duration_minutes,
        recordAudio: project.record_audio,
        recordVideo: project.record_video,
        status: project.status as "draft" | "active" | "archived",
        autoSkipSilence: project.auto_skip_silence ?? false,
        allowPause: (project as { allow_pause?: boolean }).allow_pause ?? false,
        completionMessage:
          (project as { completion_message?: string | null }).completion_message ?? DEFAULT_COMPLETION_MESSAGE,
      });

      setLoading(false);
    };

    load();
  }, [id, navigate, toast]);

  const handleSave = async (s: ProjectFormState) => {
    if (!id || !user) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      // Avatar : si nouveau fichier => upload ; sinon, garder preview (preset choisi) ou avatar existant.
      let avatarUrl: string | null = s.avatarPreview ?? existingAvatarUrl;
      if (s.avatarFile) {
        const ext = s.avatarFile.name.split(".").pop() || "png";
        const path = `avatars/${id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, s.avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      let introAudioUrl: string | null =
        s.introEnabled && s.introMode === "audio" ? s.introAudioPreviewUrl : null;
      if (s.introEnabled && s.introMode === "audio" && s.introAudioBlob) {
        const introPath = `intro/${id}.webm`;
        const { error: introUploadError } = await supabase.storage
          .from("media")
          .upload(introPath, s.introAudioBlob, { contentType: "audio/webm", upsert: true });
        if (introUploadError) throw introUploadError;
        const { data: introUrlData } = supabase.storage.from("media").getPublicUrl(introPath);
        introAudioUrl = `${introUrlData.publicUrl}?t=${Date.now()}`;
      }

      let presentationVideoUrl: string | null =
        s.introEnabled && s.introMode === "video" ? s.introVideoPreviewUrl : null;
      if (s.introEnabled && s.introMode === "video" && s.introVideoFile) {
        const videoPath = `presentation/${id}.webm`;
        const { error: videoUploadError } = await supabase.storage
          .from("media")
          .upload(videoPath, s.introVideoFile, { contentType: s.introVideoFile.type, upsert: true });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
        presentationVideoUrl = `${videoUrlData.publicUrl}?t=${Date.now()}`;
      }

      const introTextValue =
        s.introEnabled && (s.introMode === "text" || s.introMode === "tts")
          ? s.introText.trim() || null
          : null;

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          title: s.title,
          job_title: s.title,
          language: s.language as never,
          ai_persona_name: s.aiPersonaName,
          ai_voice: s.aiVoice as never,
          max_duration_minutes: s.maxDuration,
          record_audio: s.recordAudio,
          record_video: s.recordVideo,
          status: s.status as never,
          auto_skip_silence: s.autoSkipSilence,
          allow_pause: s.allowPause,
          avatar_image_url: avatarUrl,
          intro_enabled: s.introEnabled,
          intro_mode: s.introEnabled ? s.introMode : null,
          intro_text: introTextValue,
          intro_audio_url: introAudioUrl,
          presentation_video_url: presentationVideoUrl,
          completion_message: s.completionMessage.trim() || null,
          tts_provider: s.ttsProvider,
          tts_voice_gender: s.ttsVoiceGender,
          tts_voice_id: s.ttsVoiceId,
        } as never)
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("questions").delete().eq("project_id", id);

      const validQuestions = s.questions.filter(
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
              relance_level: q.relance_level,
              hint_text: q.hint_text?.trim() || null,
              max_response_seconds: q.max_response_seconds ?? null,
            })),
          )
          .select();

        if (insertedQuestions) {
          let orgIdForLib: string | null = null;
          const needsLib = validQuestions.some((q) => q.save_to_library && !q.from_library);
          if (needsLib) {
            const { data: orgData } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
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
              await supabase.from("questions").update(updates as never).eq("id", qId);
            }

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
                    relance_level: q.relance_level,
                    audio_url: (updates.audio_url as string | null) || null,
                    video_url: (updates.video_url as string | null) || null,
                    hint_text: q.hint_text?.trim() || null,
                    max_response_seconds: q.max_response_seconds ?? null,
                  } as never);
                }
              }
            }
          }
        }
      }

      await supabase.from("evaluation_criteria").delete().eq("project_id", id);

      const validCriteria = s.criteria.filter((c) => c.label.trim());
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

  if (loading || !initial) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ProjectForm
      mode="edit"
      initial={initial}
      onSubmit={handleSave}
      saving={saving}
      header={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <h1 className="text-2xl font-bold">Modifier le projet</h1>
        </div>
      }
      submitLabel={{ idle: "Enregistrer les modifications", busy: "Enregistrement..." }}
    />
  );
}
