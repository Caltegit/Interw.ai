import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createEmptyQuestion } from "@/components/project/StepQuestions";
import defaultCamilleAvatar from "@/assets/avatars/woman-1.jpg";
import { getDefaultVoiceForGender } from "@/components/project/VoiceSelectorDialog";
import {
  ProjectForm,
  DEFAULT_COMPLETION_MESSAGE,
  DEFAULT_PRE_SESSION_MESSAGE,
  mergeTemplateIntoState,
  type ProjectFormState,
} from "@/components/project/ProjectForm";
import { loadInterviewTemplate } from "@/components/project/loadInterviewTemplate";

const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";

const initialState: ProjectFormState = {
  title: "Candidature spontanée",
  language: "fr",
  ttsProvider: "browser",
  ttsVoiceGender: "female",
  ttsVoiceId: getDefaultVoiceForGender("female"),
  aiPersonaName: "Marie",
  aiVoice: "female_fr",
  avatarFile: null,
  avatarPreview: defaultCamilleAvatar,
  presetAvatarUrl: defaultCamilleAvatar,
  introEnabled: false,
  introMode: "text",
  introText: "",
  introAudioBlob: null,
  introAudioPreviewUrl: null,
  introVideoFile: null,
  introVideoPreviewUrl: null,
  questions: [
    { ...createEmptyQuestion(), title: "Bien-être", content: "Comment ça va aujourd'hui ?" },
    { ...createEmptyQuestion(), title: "Culture", content: "Tu penses quoi de Morning ?" },
  ],
  criteria: [
    {
      label: "Entrepreneur de son périmètre",
      description:
        "Capacité à s'approprier son rôle, prendre des décisions de façon autonome et en assumer la responsabilité. Situations concrètes où le candidat a pris des initiatives sans y être explicitement invité.",
      weight: 35,
      scoring_scale: "0-5",
      anchors: {},
      applies_to: "all_questions",
    },
    {
      label: "Résilience au changement",
      description:
        "Capacité à s'adapter, faire évoluer son rôle et rester efficace dans un environnement qui bouge vite, sans avoir besoin de cases fixes ni de process très définis.",
      weight: 35,
      scoring_scale: "0-5",
      anchors: {},
      applies_to: "all_questions",
    },
    {
      label: "Fit culturel & envie sincère",
      description:
        "Alignement réel avec les valeurs et l'ambiance Morning. Capacité à dire ce qu'on a vraiment envie de faire, au-delà du discours poli de session.",
      weight: 30,
      scoring_scale: "0-5",
      anchors: {},
      applies_to: "all_questions",
    },
  ],
  maxDuration: 30,
  recordAudio: true,
  recordVideo: false,
  status: "active",
  autoSkipSilence: true,
  allowPause: false,
  completionMessage: DEFAULT_COMPLETION_MESSAGE,
};

export default function ProjectNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template");
  const [saving, setSaving] = useState(false);
  const [formInitial, setFormInitial] = useState<ProjectFormState>(initialState);
  const [templateLoading, setTemplateLoading] = useState(!!templateId);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await loadInterviewTemplate(templateId);
        if (cancelled) return;
        if (!payload) {
          toast({
            title: "Modèle introuvable",
            description: "Le formulaire est vide.",
            variant: "destructive",
          });
        } else {
          setFormInitial((s) => mergeTemplateIntoState(s, payload));
          toast({ title: "Modèle appliqué", description: payload.name });
        }
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateId, toast]);

  const handleSave = async (s: ProjectFormState) => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const slug =
        s.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString(36);

      let avatarUrl: string | null = s.presetAvatarUrl;
      if (s.avatarFile) {
        const ext = s.avatarFile.name.split(".").pop() || "png";
        const path = `avatars/${slug}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, s.avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          organization_id: DEFAULT_ORG_ID,
          created_by: user.id,
          title: s.title,
          job_title: s.title,
          description: "",
          language: s.language,
          ai_persona_name: s.aiPersonaName,
          ai_voice: s.aiVoice as never,
          max_duration_minutes: s.maxDuration,
          record_audio: s.recordAudio,
          record_video: s.recordVideo,
          status: s.status,
          auto_skip_silence: s.autoSkipSilence,
          allow_pause: s.allowPause,
          slug,
          avatar_image_url: avatarUrl,
          intro_enabled: s.introEnabled,
          intro_mode: s.introEnabled ? s.introMode : null,
          intro_text:
            s.introEnabled && (s.introMode === "text" || s.introMode === "tts")
              ? s.introText.trim() || null
              : null,
          intro_audio_url:
            s.introEnabled && s.introMode === "audio" && s.introAudioPreviewUrl && !s.introAudioPreviewUrl.startsWith("blob:")
              ? s.introAudioPreviewUrl
              : null,
          presentation_video_url:
            s.introEnabled && s.introMode === "video" && s.introVideoPreviewUrl && !s.introVideoPreviewUrl.startsWith("blob:")
              ? s.introVideoPreviewUrl
              : null,
          completion_message: s.completionMessage.trim() || null,
          tts_provider: s.ttsProvider,
          tts_voice_gender: s.ttsVoiceGender,
          tts_voice_id: s.ttsVoiceId,
        } as never)
        .select()
        .single();

      if (error) throw error;

      if (s.introEnabled && s.introMode === "audio" && s.introAudioBlob) {
        const introPath = `intro/${project.id}.webm`;
        const { error: introUploadError } = await supabase.storage
          .from("media")
          .upload(introPath, s.introAudioBlob, { contentType: "audio/webm", upsert: true });
        if (introUploadError) throw introUploadError;
        const { data: introUrlData } = supabase.storage.from("media").getPublicUrl(introPath);
        const { error: introUpdateError } = await supabase
          .from("projects")
          .update({ intro_audio_url: introUrlData.publicUrl } as never)
          .eq("id", project.id);
        if (introUpdateError) throw introUpdateError;
      }

      if (s.introEnabled && s.introMode === "video" && s.introVideoFile) {
        const videoPath = `presentation/${project.id}.webm`;
        const { error: videoUploadError } = await supabase.storage
          .from("media")
          .upload(videoPath, s.introVideoFile, { contentType: s.introVideoFile.type, upsert: true });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
        const { error: videoUpdateError } = await supabase
          .from("projects")
          .update({ presentation_video_url: videoUrlData.publicUrl } as never)
          .eq("id", project.id);
        if (videoUpdateError) throw videoUpdateError;
      }

      const validQuestions = s.questions.filter(
        (q) => q.content.trim() || q.audioBlob || q.videoBlob || q.audioPreviewUrl || q.videoPreviewUrl,
      );
      if (validQuestions.length > 0) {
        const insertedQuestions = await supabase
          .from("questions")
          .insert(
            validQuestions.map((q, i) => ({
              project_id: project.id,
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
              updates.video_url = q.videoPreviewUrl;
            }

            if (Object.keys(updates).length > 0) {
              await supabase.from("questions").update(updates as never).eq("id", qId);
            }

            if (q.save_to_library && !q.from_library) {
              const contentText = q.content.trim() || q.title || "";
              if (contentText) {
                const { data: existing } = await supabase
                  .from("question_templates")
                  .select("id")
                  .eq("organization_id", DEFAULT_ORG_ID)
                  .eq("content", contentText)
                  .maybeSingle();
                if (!existing) {
                  await supabase.from("question_templates").insert({
                    organization_id: DEFAULT_ORG_ID,
                    created_by: user.id,
                    title: q.title || contentText.slice(0, 60),
                    content: contentText,
                    category: q.category || null,
                    type: q.mediaType,
                    follow_up_enabled: q.follow_up_enabled,
                    max_follow_ups: q.max_follow_ups,
                    relance_level: q.relance_level,
                    audio_url: updates.audio_url || null,
                    video_url: updates.video_url || null,
                    hint_text: q.hint_text?.trim() || null,
                    max_response_seconds: q.max_response_seconds ?? null,
                  } as never);
                }
              }
            }
          }
        }
      }

      const validCriteria = s.criteria.filter((c) => c.label.trim());
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
          })),
        );

        const toLibrary = validCriteria.filter((c) => c.save_to_library && !c.from_library);
        if (toLibrary.length > 0) {
          await supabase.from("criteria_templates").insert(
            toLibrary.map((c) => ({
              organization_id: DEFAULT_ORG_ID,
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

      const { data: check } = await supabase
        .from("projects")
        .select("id, status, slug")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!check) {
        toast({
          title: "Projet créé mais lien candidat non fonctionnel",
          description:
            "Le projet a été créé mais le lien public ne semble pas accessible. Vérifiez le statut du projet.",
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

  if (templateLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ProjectForm
      mode="create"
      initial={formInitial}
      onSubmit={handleSave}
      saving={saving}
      header={<h1 className="text-2xl font-bold">Nouveau projet</h1>}
      submitLabel={{ idle: "Créer le projet", busy: "Création..." }}
    />
  );
}
