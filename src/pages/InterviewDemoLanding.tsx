import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle, Info } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewDemoLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .single();
      if (!data) {
        setError("Ce projet n'est pas accessible.");
      } else {
        setProject(data);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleStart = async () => {
    if (!project) return;
    setStarting(true);
    const { data: session, error: err } = await supabase
      .from("sessions")
      .insert({
        project_id: project.id,
        organization_id: project.organization_id,
        candidate_name: "Démo",
        candidate_email: "demo@interw.local",
        is_demo: true,
        consent_accepted_at: new Date().toISOString(),
      } as never)
      .select()
      .single();

    if (err || !session) {
      setError("Impossible de démarrer la démo. Réessayez.");
      setStarting(false);
      return;
    }

    navigate(`/session/${slug}/start/${(session as any).token}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="w-full max-w-xl space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-10 space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(var(--l-accent) / 0.15)" }}>
              <PlayCircle className="h-7 w-7" style={{ color: "hsl(var(--l-accent))" }} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold candidate-gradient-text">Mode démo</h1>
              <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
                {project?.title}
              </p>
            </div>
            <div
              className="flex items-start gap-3 text-left rounded-md p-4 text-sm"
              style={{ backgroundColor: "hsl(var(--l-fg) / 0.04)", color: "hsl(var(--l-fg) / 0.85)" }}
            >
              <Info className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "hsl(var(--l-accent))" }} />
              <span>
                Vous allez vivre l'entretien comme un candidat. Aucune donnée
                n'est enregistrée : pas de vidéo, pas de transcription, pas de
                rapport.
              </span>
            </div>
            <Button
              size="lg"
              className="candidate-btn-primary w-full h-14 text-base"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? "Préparation…" : "Commencer la démo"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}
