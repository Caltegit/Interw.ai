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

      const { data: tpl, error } = await supabase
        .from("interview_templates" as never)
        .insert({
          organization_id: orgId as unknown as string,
          created_by: user.id,
          name: name.trim(),
          description,
          category: category || null,
          job_title: defaultJobTitle,
          default_duration_minutes: defaultDuration,
          default_language: defaultLanguage,
        } as never)
        .select()
        .single();
      if (error || !tpl) throw error || new Error("Erreur création modèle");
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

      toast({ title: "Modèle créé", description: "Disponible dans la bibliothèque." });
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
        <Bookmark className="mr-1 h-4 w-4" /> Sauver comme modèle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme session type</DialogTitle>
            <DialogDescription>
              Crée un modèle réutilisable à partir des questions et critères de ce projet.
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
              {saving ? "Création..." : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
