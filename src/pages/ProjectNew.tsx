import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { StepQuestions } from "@/components/project/StepQuestions";
import { StepCriteria } from "@/components/project/StepCriteria";

const STEPS = ["Informations", "Médias", "Questions", "Critères", "Publication"];

export default function ProjectNew() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  // Step 2
  const [aiPersonaName, setAiPersonaName] = useState("Sophie");
  const [aiVoice, setAiVoice] = useState<string>("female_fr");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Step 3
  const [questions, setQuestions] = useState<{ content: string; type: string; follow_up_enabled: boolean; max_follow_ups: number }[]>([
    { content: "", type: "open", follow_up_enabled: true, max_follow_ups: 2 },
  ]);

  // Step 4
  const [criteria, setCriteria] = useState<{ label: string; description: string; weight: number; scoring_scale: string; anchors: Record<string, string>; applies_to: string }[]>([
    { label: "", description: "", weight: 100, scoring_scale: "0-5", anchors: {}, applies_to: "all_questions" },
  ]);

  // Step 5
  const [maxDuration, setMaxDuration] = useState(30);
  const [recordAudio, setRecordAudio] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [status, setStatus] = useState<"draft" | "active">("active");

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const canProceed = () => {
    if (step === 0) return title.trim() && jobTitle.trim();
    if (step === 2) return questions.some((q) => q.content.trim());
    if (step === 3) return criteria.some((c) => c.label.trim()) && totalWeight === 100;
    return true;
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          organization_id: "a0000000-0000-0000-0000-000000000001",
          created_by: user.id,
          title,
          job_title: jobTitle,
          description,
          language,
          ai_persona_name: aiPersonaName,
          ai_voice: aiVoice as any,
          max_duration_minutes: maxDuration,
          record_audio: recordAudio,
          record_video: recordVideo,
          status,
          slug,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert questions
      const validQuestions = questions.filter((q) => q.content.trim());
      if (validQuestions.length > 0) {
        await supabase.from("questions").insert(
          validQuestions.map((q, i) => ({
            project_id: project.id,
            order_index: i,
            content: q.content,
            type: q.type as any,
            follow_up_enabled: q.follow_up_enabled,
            max_follow_ups: q.max_follow_ups,
          }))
        );
      }

      // Insert criteria
      const validCriteria = criteria.filter((c) => c.label.trim());
      if (validCriteria.length > 0) {
        await supabase.from("evaluation_criteria").insert(
          validCriteria.map((c, i) => ({
            project_id: project.id,
            order_index: i,
            label: c.label,
            description: c.description,
            weight: c.weight,
            scoring_scale: c.scoring_scale as any,
            anchors: c.anchors,
            applies_to: c.applies_to as any,
          }))
        );
      }

      // Vérification que le lien candidat est fonctionnel
      const { data: check } = await supabase
        .from("projects")
        .select("id, status, slug")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!check) {
        toast({
          title: "Projet créé mais lien candidat non fonctionnel",
          description: "Le projet a été créé mais le lien public ne semble pas accessible. Vérifiez le statut du projet.",
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Nouveau projet</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
            <span className={`text-sm hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 1: General Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Titre du projet *</Label>
                <Input placeholder="CDI Développeur Full-Stack Paris" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Intitulé du poste *</Label>
                <Input placeholder="Développeur Full-Stack" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <Label>Description du poste</Label>
                <Textarea placeholder="Décrivez le poste..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
              </div>
              <div>
                <Label>Langue de l'entretien</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Media */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Nom du persona IA</Label>
                <Input placeholder="Sophie" value={aiPersonaName} onChange={(e) => setAiPersonaName(e.target.value)} />
              </div>
              <div>
                <Label>Photo de l'avatar</Label>
                <div className="flex items-center gap-4 mt-2">
                  {avatarPreview ? (
                    <div className="relative">
                      <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-border" />
                      <button
                        type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                        className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAvatarFile(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                  <p className="text-sm text-muted-foreground">JPG, PNG — affiché pendant l'entretien candidat</p>
                </div>
              </div>
              <div>
                <Label>Voix IA</Label>
                <Select value={aiVoice} onValueChange={setAiVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female_fr">Femme FR</SelectItem>
                    <SelectItem value="male_fr">Homme FR</SelectItem>
                    <SelectItem value="female_en">Femme EN</SelectItem>
                    <SelectItem value="male_en">Homme EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">L'upload de vidéo de présentation sera disponible prochainement.</p>
            </div>
          )}

          {/* Step 3: Questions */}
          {step === 2 && (
            <StepQuestions questions={questions} setQuestions={setQuestions} />
          )}

          {/* Step 4: Criteria */}
          {step === 3 && (
            <StepCriteria criteria={criteria} setCriteria={setCriteria} totalWeight={totalWeight} />
          )}

          {/* Step 5: Settings */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Durée maximale (minutes) : {maxDuration}</Label>
                <input type="range" min={15} max={60} value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enregistrer l'audio</Label>
                <Switch checked={recordAudio} onCheckedChange={setRecordAudio} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enregistrer la vidéo (RGPD)</Label>
                <Switch checked={recordVideo} onCheckedChange={setRecordVideo} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardHeader><CardTitle className="text-sm">Récapitulatif</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Titre :</strong> {title}</p>
                  <p><strong>Poste :</strong> {jobTitle}</p>
                  <p><strong>Langue :</strong> {language === "fr" ? "Français" : "English"}</p>
                  <p><strong>Persona :</strong> {aiPersonaName}</p>
                  <p><strong>Questions :</strong> {questions.filter((q) => q.content.trim()).length}</p>
                  <p><strong>Critères :</strong> {criteria.filter((c) => c.label.trim()).length}</p>
                  <p><strong>Durée max :</strong> {maxDuration} min</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Suivant <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Création..." : "Créer le projet"}
          </Button>
        )}
      </div>
    </div>
  );
}
