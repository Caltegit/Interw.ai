import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Globe, Mic, CheckCircle, Play, Volume2, Video } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [starting, setStarting] = useState(false);

  // Intermediate media screen state
  const [showIntroMedia, setShowIntroMedia] = useState(false);
  const [introMediaType, setIntroMediaType] = useState<"audio" | "video" | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [mediaFinished, setMediaFinished] = useState(false);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

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

    // Show intermediate media screen if project has video or audio
    if (project.presentation_video_url) {
      setSessionToken(session.token);
      setIntroMediaType("video");
      setShowIntroMedia(true);
      setStarting(false);
    } else if (project.intro_audio_url) {
      setSessionToken(session.token);
      setIntroMediaType("audio");
      setShowIntroMedia(true);
      setStarting(false);
    } else {
      navigate(`/interview/${slug}/start/${session.token}`);
    }
  };

  const handlePlayMedia = () => {
    if (introMediaType === "audio" && introAudioRef.current) {
      introAudioRef.current.play().catch(() => setMediaFinished(true));
      setMediaPlaying(true);
    } else if (introMediaType === "video" && introVideoRef.current) {
      introVideoRef.current.play().catch(() => setMediaFinished(true));
      setMediaPlaying(true);
    }
  };

  const handleMediaEnded = () => {
    setMediaPlaying(false);
    setMediaFinished(true);
  };

  const handleProceedToInterview = () => {
    if (sessionToken) {
      navigate(`/interview/${slug}/start/${sessionToken}`);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

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

  // Intermediate screen: intro media from recruiter
  if (showIntroMedia) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full">
          <CardContent className="py-10 space-y-6 text-center">
            {introMediaType === "video" ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-8 w-8 text-primary" />
              </div>
            ) : project.avatar_image_url ? (
              <img
                src={project.avatar_image_url}
                alt={project.ai_persona_name || "Recruteur"}
                className={`mx-auto h-24 w-24 rounded-full object-cover border-4 ${mediaPlaying ? "border-primary animate-pulse" : "border-muted"}`}
              />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Volume2 className="h-8 w-8 text-primary" />
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Message de {project.ai_persona_name || "votre recruteur"}</h2>
              <p className="text-sm text-muted-foreground">
                {introMediaType === "video"
                  ? "Regardez cette vidéo avant de commencer votre entretien."
                  : "Écoutez ce message avant de commencer votre entretien."}
              </p>
            </div>

            {introMediaType === "audio" && (
              <audio
                ref={introAudioRef}
                src={project.intro_audio_url}
                onEnded={handleMediaEnded}
                className="hidden"
              />
            )}

            {introMediaType === "video" && (
              <video
                ref={introVideoRef}
                src={project.presentation_video_url}
                onEnded={handleMediaEnded}
                controls={mediaPlaying}
                playsInline
                className="w-full rounded-lg border border-border"
              />
            )}

            {!mediaPlaying && !mediaFinished && (
              <Button size="lg" className="w-full" onClick={handlePlayMedia}>
                <Play className="mr-2 h-5 w-5" />
                {introMediaType === "video" ? "Regarder la vidéo" : "Écouter le message"}
              </Button>
            )}

            {mediaPlaying && introMediaType === "audio" && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="text-sm font-medium">Lecture en cours...</span>
                </div>
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "100%" }} />
                </div>
              </div>
            )}

            {mediaFinished && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {introMediaType === "video" ? "Vidéo visionnée" : "Message écouté"}
                  </span>
                </div>
                <Button size="lg" className="w-full" onClick={handleProceedToInterview}>
                  <Mic className="mr-2 h-5 w-5" />
                  Commencer l'entretien
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
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
              {starting ? "Démarrage..." : "Continuer"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Cet entretien sera enregistré, transcrit et analysé par intelligence artificielle.
          En continuant, vous acceptez ces conditions.
        </p>
      </div>
    </CandidateLayout>
  );
}
