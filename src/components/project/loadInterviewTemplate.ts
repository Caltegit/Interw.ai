import { supabase } from "@/integrations/supabase/client";
import type { InterviewTemplatePayload } from "./InterviewTemplatePickerDialog";

export async function loadInterviewTemplate(id: string): Promise<InterviewTemplatePayload | null> {
  const [{ data: qs }, { data: cs }, { data: tpl }] = await Promise.all([
    supabase
      .from("interview_template_questions" as never)
      .select("*")
      .eq("template_id", id)
      .order("order_index"),
    supabase
      .from("interview_template_criteria" as never)
      .select("*")
      .eq("template_id", id)
      .order("order_index"),
    supabase.from("interview_templates" as never).select("*").eq("id", id).maybeSingle(),
  ]);

  if (!tpl) return null;
  const t = tpl as unknown as Record<string, unknown>;

  return {
    name: (t.name as string) || "",
    description: (t.description as string) || "",
    job_title: (t.job_title as string) || "",
    default_duration_minutes: (t.default_duration_minutes as number) || 30,
    default_language: ((t.default_language as string) || "fr") as "fr" | "en",
    // Extended fields (same names as projects)
    ai_persona_name: (t.ai_persona_name as string | null) ?? null,
    ai_voice: (t.ai_voice as string | null) ?? null,
    avatar_image_url: (t.avatar_image_url as string | null) ?? null,
    tts_provider: (t.tts_provider as "browser" | "elevenlabs" | null) ?? null,
    tts_voice_id: (t.tts_voice_id as string | null) ?? null,
    tts_voice_gender: (t.tts_voice_gender as "female" | "male" | null) ?? null,
    intro_enabled: (t.intro_enabled as boolean | null) ?? null,
    intro_mode: (t.intro_mode as "text" | "tts" | "audio" | "video" | null) ?? null,
    intro_text: (t.intro_text as string | null) ?? null,
    intro_audio_url: (t.intro_audio_url as string | null) ?? null,
    presentation_video_url: (t.presentation_video_url as string | null) ?? null,
    ai_intro_enabled: (t.ai_intro_enabled as boolean | null) ?? null,
    ai_intro_mode: (t.ai_intro_mode as "auto" | "custom" | null) ?? null,
    ai_intro_custom_text: (t.ai_intro_custom_text as string | null) ?? null,
    ai_question_transitions_enabled: (t.ai_question_transitions_enabled as boolean | null) ?? null,
    ai_question_transitions_mode: (t.ai_question_transitions_mode as "auto" | "custom" | null) ?? null,
    ai_question_transitions_custom_text: (t.ai_question_transitions_custom_text as string | null) ?? null,
    record_audio: (t.record_audio as boolean | null) ?? null,
    record_video: (t.record_video as boolean | null) ?? null,
    auto_skip_silence: (t.auto_skip_silence as boolean | null) ?? null,
    allow_pause: (t.allow_pause as boolean | null) ?? null,
    allow_skip_question: (t.allow_skip_question as boolean | null) ?? null,
    intro_first_screen: (t.intro_first_screen as boolean | null) ?? null,
    audio_analysis_enabled: (t.audio_analysis_enabled as boolean | null) ?? null,
    show_question_timer: (t.show_question_timer as boolean | null) ?? null,
    completion_message: (t.completion_message as string | null) ?? null,
    pre_session_message: (t.pre_session_message as string | null) ?? null,
    candidate_fields: (t.candidate_fields as Record<string, unknown> | null) ?? null,
    candidate_email_subject: (t.candidate_email_subject as string | null) ?? null,
    candidate_email_body: (t.candidate_email_body as string | null) ?? null,
    questions: ((qs as unknown as Array<Record<string, unknown>>) || []).map((q) => ({
      title: (q.title as string) || "",
      content: (q.content as string) || "",
      type: (q.type as string) || "written",
      audio_url: (q.audio_url as string | null) || null,
      video_url: (q.video_url as string | null) || null,
      category: (q.category as string | null) || null,
      follow_up_enabled: q.follow_up_enabled as boolean,
      max_follow_ups: (q.max_follow_ups as number) ?? 0,
      relance_level: ((q.relance_level as string) || "light") as "light" | "medium" | "deep",
      avatar_image_url: (q.avatar_image_url as string | null) ?? null,
      hint_text: (q.hint_text as string | null) ?? null,
      max_response_seconds: (q.max_response_seconds as number | null) ?? null,
    })),
    criteria: ((cs as unknown as Array<Record<string, unknown>>) || []).map((c) => ({
      label: (c.label as string) || "",
      description: (c.description as string) || "",
      weight: (c.weight as number) || 0,
      scoring_scale: (c.scoring_scale as string) || "0-5",
      applies_to: (c.applies_to as string) || "all_questions",
      anchors: ((c.anchors as Record<string, string>) || {}),
    })),
  };
}
