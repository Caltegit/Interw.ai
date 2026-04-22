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
  const t = tpl as unknown as {
    name: string;
    description: string;
    job_title: string;
    default_duration_minutes: number;
    default_language: "fr" | "en";
  };

  return {
    name: t.name,
    description: t.description,
    job_title: t.job_title,
    default_duration_minutes: t.default_duration_minutes,
    default_language: t.default_language,
    questions: ((qs as unknown as Array<Record<string, unknown>>) || []).map((q) => ({
      title: (q.title as string) || "",
      content: (q.content as string) || "",
      type: (q.type as string) || "written",
      audio_url: (q.audio_url as string | null) || null,
      video_url: (q.video_url as string | null) || null,
      category: (q.category as string | null) || null,
      follow_up_enabled: q.follow_up_enabled as boolean,
      max_follow_ups: (q.max_follow_ups as number) ?? 2,
      relance_level: ((q.relance_level as string) || "medium") as "light" | "medium" | "deep",
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
