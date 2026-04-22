import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save } from "lucide-react";
import { StepQuestions, type Question, createEmptyQuestion } from "@/components/project/StepQuestions";
import { StepCriteria, type Criterion } from "@/components/project/StepCriteria";

export default function InterviewTemplateEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: tpl } = await supabase
        .from("interview_templates" as never)
        .select("*")
        .eq("id", id)
        .single();
      const t = tpl as unknown as {
        name: string; description: string; category: string | null; job_title: string;
        default_duration_minutes: number; default_language: "fr" | "en";
      } | null;
      if (t) {
        setName(t.name);
        setDescription(t.description || "");
        setCategory(t.category || "");
        setJobTitle(t.job_title || "");
        setDuration(t.default_duration_minutes);
        setLanguage(t.default_language);
      }

      const { data: qs } = await supabase
        .from("interview_template_questions" as never)
        .select("*")
        .eq("template_id", id)
        .order("order_index");
      const qList = (qs as unknown as Array<{
        title: string; content: string; category: string | null; type: string;
        audio_url: string | null; video_url: string | null;
        follow_up_enabled: boolean; max_follow_ups: number; relance_level: string;
        hint_text: string | null; max_response_seconds: number | null;
      }>) || [];
      setQuestions(
        qList.map((q) => ({
          ...createEmptyQuestion(),
          title: q.title || "",
          content: q.content || "",
          category: q.category || "",
          mediaType: (q.type === "audio" || q.type === "video" ? q.type : "written") as "written" | "audio" | "video",
          follow_up_enabled: q.follow_up_enabled,
          max_follow_ups: q.max_follow_ups,
          relance_level: (q.relance_level as "light" | "medium" | "deep") || "medium",
          audioPreviewUrl: q.audio_url,
          videoPreviewUrl: q.video_url,
          from_library: true,
          hint_text: q.hint_text ?? "",
          max_response_seconds: q.max_response_seconds ?? null,
        })),
      );

      const { data: cs } = await supabase
        .from("interview_template_criteria" as never)
        .select("*")
        .eq("template_id", id)
        .order("order_index");
      const cList = (cs as unknown as Array<{
        label: string; description: string; weight: number;
        scoring_scale: string; applies_to: string; anchors: Record<string, string> | null;
      }>) || [];
      setCriteria(
        cList.map((c) => ({
          label: c.label,
          description: c.description || "",
          weight: c.weight,
          scoring_scale: c.scoring_scale,
          applies_to: c.applies_to,
          anchors: c.anchors || {},
          from_library: true,
        })),
      );
      setLoading(false);
    })();
  }, [id]);

  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 0), 0);

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      await supabase
        .from("interview_templates" as never)
        .update({
          name,
          description,
          category: category || null,
          job_title: jobTitle,
          default_duration_minutes: duration,
          default_language: language,
        } as never)
        .eq("id", id);

      // Replace questions
      await supabase.from("interview_template_questions" as never).delete().eq("template_id", id);
      const validQ = questions.filter((q) => q.content.trim() || q.title.trim());
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
          })) as never,
        );
      }

      // Replace criteria
      await supabase.from("interview_template_criteria" as never).delete().eq("template_id", id);
      const validC = criteria.filter((c) => c.label.trim());
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

      toast({ title: "Modèle enregistré" });
      navigate("/library/interviews");
    } catch (e: unknown) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/library/interviews">
            <ChevronLeft className="mr-1 h-4 w-4" /> Retour
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Édition du modèle</h1>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Infos</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="criteria">Critères ({criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Session Commercial Junior" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="À quoi sert ce modèle ?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Commercial, Tech..." />
                </div>
                <div>
                  <Label>Intitulé poste suggéré</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Commercial(e)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Durée par défaut (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <Label>Langue par défaut</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardContent className="pt-6">
              <StepQuestions questions={questions} setQuestions={setQuestions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria">
          <Card>
            <CardContent className="pt-6">
              <StepCriteria criteria={criteria} setCriteria={setCriteria} totalWeight={totalWeight} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
