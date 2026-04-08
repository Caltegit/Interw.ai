import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Globe, Mic, CheckCircle } from "lucide-react";

export default function InterviewLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!proj) {
        setError("Ce lien est invalide ou le projet n'est plus actif.");
        setLoading(false);
        return;
      }

      if (proj.expires_at && new Date(proj.expires_at) < new Date()) {
        setError("Ce lien n'est plus actif.");
        setLoading(false);
        return;
      }

      setProject(proj);
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleStart = async () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !project) return;
    setStarting(true);

    const { data: session, error: err } = await supabase
      .from("sessions")
      .insert({
        project_id: project.id,
        candidate_name: candidateName.trim(),
        candidate_email: candidateEmail.trim(),
      })
      .select()
      .single();

    if (err || !session) {
      setError("Impossible de démarrer l'entretien. Réessayez.");
      setStarting(false);
      return;
    }

    navigate(`/interview/${slug}/start/${session.token}`);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-xl font-bold text-center">
          Entretien pour le poste de {project?.job_title}
        </h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-sm">~{project?.max_duration_minutes} min</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm">{project?.language === "fr" ? "Français" : "English"}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Mic className="h-5 w-5 text-primary" />
            <span className="text-sm">Entretien IA</span>
          </div>
        </div>

        {project?.presentation_video_url && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Regardez cette vidéo avant de commencer :</p>
            <video src={project.presentation_video_url} controls className="w-full rounded-lg" />
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Votre nom complet *</Label>
              <Input id="name" placeholder="Jean Dupont" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Votre email *</Label>
              <Input id="email" type="email" placeholder="jean@exemple.com" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleStart}
              disabled={!candidateName.trim() || !candidateEmail.trim() || starting}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              {starting ? "Démarrage..." : "Commencer l'entretien"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Cet entretien sera enregistré, transcrit et analysé par intelligence artificielle.
          En continuant, vous acceptez ces conditions.
        </p>
      </div>
    </div>
  );
}
