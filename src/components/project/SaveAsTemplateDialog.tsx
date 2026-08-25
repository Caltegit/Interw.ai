import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bookmark } from "lucide-react";

interface Props {
  projectId: string;
  defaultName: string;
  defaultJobTitle?: string;
  defaultDuration?: number;
  defaultLanguage?: "fr" | "en";
}

export function SaveAsTemplateDialog({
  projectId,
  defaultName,
  defaultJobTitle = "",
  defaultDuration = 30,
  defaultLanguage = "fr",
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (!orgId) throw new Error("Organisation introuvable");

      // Charger toutes les colonnes du poste pour les copier dans la session type
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      const p = (project ?? {}) as Record<string, unknown>;

      const { data: tpl, error } = await supabase
        .from("interview_templates" as never)
        .insert({
          organization_id: orgId as unknown as string,
          created_by: user.id,
          name: name.trim(),
          description,
          category: category || null,
          job_title: (p.job_title as string) || defaultJobTitle,
          default_duration_minutes: (p.max_duration_minutes as number) || defaultDuration,
          default_language: (p.language as string) || defaultLanguage,
          // Tous les champs étendus copiés depuis le poste
          ai_persona_name: p.ai_persona_name ?? undefined,
          ai_voice: p.ai_voice ?? undefined,
          avatar_image_url: p.avatar_image_url ?? null,
          tts_provider: p.tts_provider ?? undefined,
          tts_voice_id: p.tts_voice_id ?? null,
          tts_voice_gender: p.tts_voice_gender ?? undefined,
          intro_enabled: p.intro_enabled ?? undefined,
          intro_mode: p.intro_mode ?? null,
          intro_text: p.intro_text ?? null,
          intro_audio_url: p.intro_audio_url ?? null,
          presentation_video_url: p.presentation_video_url ?? null,
          ai_intro_enabled: p.ai_intro_enabled ?? undefined,
          ai_intro_mode: p.ai_intro_mode ?? undefined,
          ai_intro_custom_text: p.ai_intro_custom_text ?? null,
          ai_question_transitions_enabled: p.ai_question_transitions_enabled ?? undefined,
          ai_question_transitions_mode: p.ai_question_transitions_mode ?? undefined,
          ai_question_transitions_custom_text: p.ai_question_transitions_custom_text ?? null,
          record_audio: p.record_audio ?? undefined,
          record_video: p.record_video ?? undefined,
          auto_skip_silence: p.auto_skip_silence ?? undefined,
          allow_pause: p.allow_pause ?? undefined,
          allow_skip_question: p.allow_skip_question ?? undefined,
          intro_first_screen: p.intro_first_screen ?? undefined,
          audio_analysis_enabled: p.audio_analysis_enabled ?? undefined,
          show_question_timer: p.show_question_timer ?? undefined,
          completion_message: p.completion_message ?? null,
          pre_session_message: p.pre_session_message ?? null,
          candidate_fields: p.candidate_fields ?? undefined,
          candidate_email_subject: p.candidate_email_subject ?? null,
          candidate_email_body: p.candidate_email_body ?? null,
        } as never)
        .select()
        .single();
      if (error || !tpl) throw error || new Error("Erreur création session type");
      const newId = (tpl as { id: string }).id;

      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");
      if (qs && qs.length) {
        await supabase.from("interview_template_questions" as never).insert(
          qs.map((q, i) => ({
            template_id: newId,
            order_index: i,
            title: q.title || "",
            content: q.content,
            type: q.audio_url ? "audio" : q.video_url ? "video" : "written",
            audio_url: q.audio_url,
            video_url: q.video_url,
            category: null,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
            relance_level: (q as unknown as { relance_level?: string }).relance_level || "medium",
            hint_text: (q as unknown as { hint_text?: string | null }).hint_text ?? null,
            max_response_seconds: (q as unknown as { max_response_seconds?: number | null }).max_response_seconds ?? null,
            avatar_image_url: (q as unknown as { avatar_image_url?: string | null }).avatar_image_url ?? null,
          })) as never,
        );
      }

      const { data: cs } = await supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");
      if (cs && cs.length) {
        await supabase.from("interview_template_criteria" as never).insert(
          cs.map((c, i) => ({
            template_id: newId,
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

      toast({ title: "Session type créée", description: "Disponible dans les ressources." });
      setOpen(false);
    } catch (e: unknown) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Bookmark className="mr-1 h-4 w-4" /> Sauver comme session type
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme session type</DialogTitle>
            <DialogDescription>
              Crée une session type réutilisable à partir des questions et critères de ce poste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Commercial, Tech..." />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Création..." : "Créer la session type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
