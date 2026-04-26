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
  DEFAULT_PRE_SESSION_MESSAGE,
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
        preSessionMessage:
          (project as { pre_session_message?: string | null }).pre_session_message ?? DEFAULT_PRE_SESSION_MESSAGE,
        aiTransitionsEnabled:
          (project as { ai_transitions_enabled?: boolean }).ai_transitions_enabled ?? true,
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
          pre_session_message: s.preSessionMessage.trim() || null,
          tts_provider: s.ttsProvider,
          tts_voice_gender: s.ttsVoiceGender,
          tts_voice_id: s.ttsVoiceId,
          ai_transitions_enabled: s.aiTransitionsEnabled,
        } as never)
        .eq("id", id);

      if (updateError) throw updateError;

      // ===== Synchronisation des questions (merge intelligent, jamais de delete global) =====
      const validQuestions = s.questions.filter(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );

      // Récupérer les questions actuellement actives en base pour calculer les diffs
      const { data: existingDb, error: existingErr } = await supabase
        .from("questions")
        .select("id")
        .eq("project_id", id)
        .is("archived_at", null);
      if (existingErr) throw existingErr;
      const existingIds = new Set((existingDb ?? []).map((r) => r.id));
      const submittedIds = new Set(
        validQuestions.map((q) => q.id).filter((x): x is string => Boolean(x)),
      );

      // 1) Suppressions ciblées (ou archivage si la question est référencée par des messages)
      const idsToRemove = [...existingIds].filter((qid) => !submittedIds.has(qid));
      for (const qid of idsToRemove) {
        const { error: delErr } = await supabase.from("questions").delete().eq("id", qid);
        if (delErr) {
          // Probable violation de FK (session_messages) → on archive au lieu de planter
          const { error: archErr } = await supabase
            .from("questions")
            .update({ archived_at: new Date().toISOString() } as never)
            .eq("id", qid);
          if (archErr) throw archErr;
        }
      }

      // 2) Préparer org pour la bibliothèque (récupéré une seule fois si besoin)
      let orgIdForLib: string | null = null;
      const needsLib = validQuestions.some((q) => q.save_to_library && !q.from_library);
      if (needsLib) {
        const { data: orgData } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
        orgIdForLib = orgData || null;
      }

      // 3) Update existantes / Insert nouvelles, en préservant l'ordre
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        const basePayload = {
          order_index: i,
          title: q.title || q.content.slice(0, 60) || `Question ${i + 1}`,
          content: q.content.trim() || q.title || `Question ${i + 1}`,
          type: q.type as never,
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: q.relance_level,
          hint_text: q.hint_text?.trim() || null,
          max_response_seconds: q.max_response_seconds ?? null,
        };

        let qId: string;
        if (q.id && existingIds.has(q.id)) {
          // UPDATE
          const { error: upErr } = await supabase
            .from("questions")
            .update(basePayload as never)
            .eq("id", q.id);
          if (upErr) throw upErr;
          qId = q.id;
        } else {
          // INSERT
          const { data: inserted, error: insErr } = await supabase
            .from("questions")
            .insert({ ...basePayload, project_id: id } as never)
            .select("id")
            .single();
          if (insErr || !inserted) throw insErr ?? new Error("Insert question failed");
          qId = (inserted as { id: string }).id;
        }

        // Médias éventuels (audio/vidéo)
        const mediaUpdates: Record<string, string | null> = {};
        if (q.audioBlob) {
          const audioPath = `questions/${qId}_audio.webm`;
          const { error: aErr } = await supabase.storage
            .from("media")
            .upload(audioPath, q.audioBlob, { contentType: "audio/webm", upsert: true });
          if (!aErr) {
            const { data: aUrl } = supabase.storage.from("media").getPublicUrl(audioPath);
            mediaUpdates.audio_url = `${aUrl.publicUrl}?t=${Date.now()}`;
          }
        } else if (q.audioPreviewUrl && !q.audioPreviewUrl.startsWith("blob:")) {
          mediaUpdates.audio_url = q.audioPreviewUrl;
        } else if (q.mediaType !== "audio") {
          mediaUpdates.audio_url = null;
        }

        if (q.videoBlob) {
          const videoPath = `questions/${qId}_video.webm`;
          const { error: vErr } = await supabase.storage
            .from("media")
            .upload(videoPath, q.videoBlob, { contentType: "video/webm", upsert: true });
          if (!vErr) {
            const { data: vUrl } = supabase.storage.from("media").getPublicUrl(videoPath);
            mediaUpdates.video_url = `${vUrl.publicUrl}?t=${Date.now()}`;
          }
        } else if (q.videoPreviewUrl && !q.videoPreviewUrl.startsWith("blob:")) {
          mediaUpdates.video_url = q.videoPreviewUrl;
        } else if (q.mediaType !== "video") {
          mediaUpdates.video_url = null;
        }

        if (Object.keys(mediaUpdates).length > 0) {
          await supabase.from("questions").update(mediaUpdates as never).eq("id", qId);
        }

        // Sauvegarde en bibliothèque si demandée
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
                audio_url: (mediaUpdates.audio_url as string | null) || null,
                video_url: (mediaUpdates.video_url as string | null) || null,
                hint_text: q.hint_text?.trim() || null,
                max_response_seconds: q.max_response_seconds ?? null,
              } as never);
            }
          }
        }
      }

      // ===== Synchronisation des critères (merge ciblé, vérification des erreurs) =====
      const validCriteria = s.criteria.filter((c) => c.label.trim());

      const { data: existingCritDb, error: existingCritErr } = await supabase
        .from("evaluation_criteria")
        .select("id")
        .eq("project_id", id);
      if (existingCritErr) throw existingCritErr;
      const existingCritIds = new Set((existingCritDb ?? []).map((r) => r.id));
      const submittedCritIds = new Set(
        validCriteria.map((c) => c.id).filter((x): x is string => Boolean(x)),
      );

      // Suppressions ciblées
      const critToRemove = [...existingCritIds].filter((cid) => !submittedCritIds.has(cid));
      for (const cid of critToRemove) {
        const { error: delErr } = await supabase.from("evaluation_criteria").delete().eq("id", cid);
        if (delErr) throw delErr;
      }

      // Update / Insert
      for (let i = 0; i < validCriteria.length; i++) {
        const c = validCriteria[i];
        const payload = {
          order_index: i,
          label: c.label,
          description: c.description,
          weight: c.weight,
          scoring_scale: c.scoring_scale as never,
          anchors: c.anchors,
          applies_to: c.applies_to as never,
        };
        if (c.id && existingCritIds.has(c.id)) {
          const { error: upErr } = await supabase
            .from("evaluation_criteria")
            .update(payload as never)
            .eq("id", c.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase
            .from("evaluation_criteria")
            .insert({ ...payload, project_id: id } as never);
          if (insErr) throw insErr;
        }
      }

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

      toast({ title: "Projet mis à jour !" });
      navigate(`/projects/${id}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
