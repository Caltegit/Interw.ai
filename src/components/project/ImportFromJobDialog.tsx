import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Library } from "lucide-react";
import { INTRO_FORMAT_META, type IntroFormat } from "@/components/library/IntroFormatPicker";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export interface JobImportPayload {
  title: string;
  questions: Array<{ title: string; content: string }>;
  criteria: Array<{ label: string; description: string; weight: number }>;
  intro: IntroTemplate | null;
  voice: LastVoice | null;
}

export interface IntroTemplate {
  id: string;
  name: string;
  type: string;
  intro_text: string | null;
  audio_url: string | null;
  video_url: string | null;
  tts_voice_id: string | null;
}

export interface LastVoice {
  tts_provider: "browser" | "elevenlabs";
  tts_voice_gender: "male" | "female";
  tts_voice_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (payload: JobImportPayload) => void;
}

export function ImportFromJobDialog({ open, onOpenChange, onApply }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [questionsCount, setQuestionsCount] = useState(10);
  const [criteriaCount, setCriteriaCount] = useState(3);
  const [introId, setIntroId] = useState<string>("none");
  const [intros, setIntros] = useState<IntroTemplate[]>([]);
  const [lastVoice, setLastVoice] = useState<LastVoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");

  // Charge intros + dernière voix à l'ouverture
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    (async () => {
      // Org de l'utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      const orgId = profile?.organization_id;

      if (orgId) {
        const { data: introsData } = await supabase
          .from("intro_templates" as never)
          .select("id, name, type, intro_text, audio_url, video_url, tts_voice_id")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });
        if (!cancelled && introsData) {
          const list = introsData as unknown as IntroTemplate[];
          setIntros(list);
          if (list.length > 0) setIntroId(list[0].id);
        }
      }

      // Dernière voix utilisée par ce recruteur
      const { data: lastProject } = await supabase
        .from("projects")
        .select("tts_provider, tts_voice_gender, tts_voice_id")
        .eq("created_by", user.id)
        .not("tts_voice_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && lastProject?.tts_voice_id) {
        setLastVoice({
          tts_provider: (lastProject.tts_provider as "browser" | "elevenlabs") ?? "browser",
          tts_voice_gender: (lastProject.tts_voice_gender as "male" | "female") ?? "female",
          tts_voice_id: lastProject.tts_voice_id,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleSubmit = async () => {
    if (!/^https?:\/\/.+/i.test(url.trim())) {
      toast({
        title: "Lien invalide",
        description: "Collez une URL complète (https://…).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setStatusLabel("Lecture de l'offre…");

    try {
      // Petit délai visuel pour montrer la première étape
      const generationPromise = supabase.functions.invoke("import-job-offer", {
        body: {
          url: url.trim(),
          questionsCount,
          criteriaCount,
        },
      });

      // Bascule du label après 1.5s
      const labelTimer = setTimeout(() => {
        setStatusLabel("Génération des questions…");
      }, 1500);

      const { data, error } = await generationPromise;
      clearTimeout(labelTimer);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const intro = intros.find((i) => i.id === introId) ?? null;

      onApply({
        title: data.title,
        questions: data.questions,
        criteria: data.criteria,
        intro,
        voice: lastVoice,
      });

      toast({ title: "Session générée", description: "Vérifiez et ajustez avant de publier." });
      onOpenChange(false);
      // Reset
      setUrl("");
    } catch (err: any) {
      console.error("[import-job-offer] failed", err);
      toast({
        title: "Erreur",
        description: err?.message ?? "Impossible de générer la session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setStatusLabel("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Démarrer depuis une offre existante
          </DialogTitle>
          <DialogDescription>
            Collez le lien d'une offre. L'IA génère un brouillon de session adapté à votre poste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="job-url">Lien de l'offre *</Label>
            <Input
              id="job-url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Intro candidat (depuis votre bibliothèque)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
                className="h-auto px-2 py-1 text-xs"
              >
                <Link to="/library/intros" target="_blank">
                  <Library className="mr-1 h-3 w-3" /> Gérer
                </Link>
              </Button>
            </div>
            <Select value={introId} onValueChange={setIntroId} disabled={loading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    intros.length === 0 ? "Aucune intro en bibliothèque" : "Choisir une intro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pas d'intro</SelectItem>
                {intros.map((i) => {
                  const meta = INTRO_FORMAT_META[(i.type as IntroFormat) ?? "text"];
                  const Icon = meta?.icon;
                  return (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{i.name}</span>
                        <span className="text-xs text-muted-foreground">— {meta?.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {intros.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aucune intro enregistrée.{" "}
                <Link to="/library/intros" target="_blank" className="text-primary underline">
                  Créez-en une dans la bibliothèque
                </Link>
                .
              </p>
            )}
            {introId !== "none" && (() => {
              const sel = intros.find((i) => i.id === introId);
              if (!sel) return null;
              const meta = INTRO_FORMAT_META[(sel.type as IntroFormat) ?? "text"];
              return (
                <div className="rounded-md border bg-muted/30 p-2 space-y-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {meta?.label}
                  </Badge>
                  {(sel.type === "text" || sel.type === "tts") && sel.intro_text && (
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {sel.intro_text}
                    </p>
                  )}
                  {sel.type === "audio" && sel.audio_url && (
                    <audio controls src={sel.audio_url} className="w-full h-8" />
                  )}
                  {sel.type === "video" && sel.video_url && (
                    <video controls src={sel.video_url} className="w-full max-h-32 rounded" />
                  )}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qcount">Nombre de questions</Label>
              <Input
                id="qcount"
                type="number"
                min={1}
                max={15}
                value={questionsCount}
                onChange={(e) => setQuestionsCount(Number(e.target.value))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccount">Nombre de critères</Label>
              <Input
                id="ccount"
                type="number"
                min={1}
                max={6}
                value={criteriaCount}
                onChange={(e) => setCriteriaCount(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>

          {lastVoice && (
            <p className="text-xs text-muted-foreground">
              Voix utilisée : votre dernière voix ({lastVoice.tts_voice_gender === "male" ? "homme" : "femme"}).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !url.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {statusLabel || "Génération…"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer la session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
