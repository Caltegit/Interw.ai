import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Globe, Mic, CheckCircle } from "lucide-react";

export default function InterviewLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", token)
        .limit(1);

      const sess = sessions?.[0];
      if (!sess) { setError("Ce lien est invalide."); setLoading(false); return; }
      if (sess.status === "completed") { setError("Vous avez déjà passé cet entretien."); setLoading(false); return; }
      if (sess.status === "expired") { setError("Ce lien n'est plus actif."); setLoading(false); return; }

      setSession(sess);

      const { data: proj } = await supabase.from("projects").select("*").eq("id", sess.project_id).single();
      if (proj) {
        setProject(proj);
        if (proj.expires_at && new Date(proj.expires_at) < new Date()) {
          setError("Ce lien n'est plus actif.");
          setLoading(false);
          return;
        }
        const { data: orgData } = await supabase.from("organizations").select("*").eq("id", proj.organization_id).single();
        setOrg(orgData);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleStart = () => {
    navigate(`/interview/${token}/start`);
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
        {org?.logo_url && <img src={org.logo_url} alt={org.name} className="h-10 mx-auto" />}
        {org && <p className="text-center text-sm text-muted-foreground">{org.name}</p>}

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
            <video
              src={project.presentation_video_url}
              controls
              className="w-full rounded-lg"
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleStart}
          disabled={project?.presentation_video_url && !videoEnded}
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Commencer l'entretien
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Cet entretien sera enregistré, transcrit et analysé par intelligence artificielle.
          En continuant, vous acceptez ces conditions.
        </p>
      </div>
    </div>
  );
}
