import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Globe, Mic, CheckCircle, Play, Volume2, Video, ArrowRight } from "lucide-react";
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = candidateEmail.trim();
  const trimmedName = candidateName.trim();
  const emailValid = emailRegex.test(trimmedEmail);
  const showEmailError = candidateEmail.length > 0 && !emailValid;
  const canSubmit = trimmedName.length > 0 && emailValid && !starting;

  const handleStart = async () => {
    if (!canSubmit || !project) return;
    setStarting(true);

    const { data: session, error: err } = await supabase
      .from("sessions")
      .insert({
        project_id: project.id,
        candidate_name: trimmedName,
        candidate_email: trimmedEmail,
      })
      .select()
      .single();

    if (err || !session) {
      setError("Impossible de démarrer l'entretien. Réessayez.");
      setStarting(false);
      return;
    }

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
      navigate(`/interview/${slug}/test/${session.token}`);
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
      navigate(`/interview/${slug}/test/${sessionToken}`);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "#d4a574", borderTopColor: "transparent" }} />
      </div>
    );

  if (error) {
    return (
      <CandidateLayout>
        <div className="animate-fade-in">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <p className="text-lg font-medium text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  // Intermediate screen: intro media from recruiter
  if (showIntroMedia) {
    return (
      <CandidateLayout minimal>
        <div className="animate-fade-in">
          <Card className={`${introMediaType === "video" ? "max-w-2xl" : "max-w-md"} w-full overflow-hidden`}>
            <CardContent className="py-8 space-y-6 text-center">
              {introMediaType === "audio" && project.avatar_image_url ? (
                <img
                  src={project.avatar_image_url}
                  alt={project.ai_persona_name || "Recruteur"}
                  className={`mx-auto h-24 w-24 rounded-full object-cover border-4 transition-all duration-500 ${mediaPlaying ? "border-[#d4a574] shadow-[0_0_20px_rgba(212,165,116,0.3)] scale-105" : "border-[#333]"}`}
                />
              ) : introMediaType === "audio" ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full animate-scale-in" style={{ backgroundColor: "rgba(212, 165, 116, 0.15)" }}>
                  <Volume2 className="h-8 w-8" style={{ color: "#d4a574" }} />
                </div>
              ) : null}

              <div className="space-y-2">
                <h2 className="text-xl font-bold">Message de {project.ai_persona_name || "votre recruteur"}</h2>
                <p className="text-sm" style={{ color: "rgba(245, 240, 232, 0.65)" }}>
                  {introMediaType === "video"
                    ? "Regardez cette vidéo avant de commencer votre entretien."
                    : "Écoutez ce message avant de commencer votre entretien."}
                </p>
              </div>

              {introMediaType === "audio" && (
                <audio ref={introAudioRef} src={project.intro_audio_url} onEnded={handleMediaEnded} className="hidden" />
              )}

              {introMediaType === "video" && (
                <video
                  ref={introVideoRef}
                  src={project.presentation_video_url}
                  onEnded={handleMediaEnded}
                  controls={mediaPlaying}
                  playsInline
                  className="w-full rounded-xl border transition-all duration-300"
                  style={{ borderColor: "rgba(245, 240, 232, 0.12)" }}
                />
              )}

              {!mediaPlaying && !mediaFinished && (
                <Button size="lg" className="w-full group transition-all duration-300" onClick={handlePlayMedia}>
                  <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  {introMediaType === "video" ? "Regarder la vidéo" : "Écouter le message"}
                </Button>
              )}

              {mediaPlaying && introMediaType === "audio" && (
                <div className="flex flex-col items-center gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#d4a574" }} />
                    <span className="h-3.5 w-3.5 rounded-full animate-pulse" style={{ backgroundColor: "#d4a574", animationDelay: "0.2s" }} />
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "#d4a574", animationDelay: "0.4s" }} />
                    <span className="text-sm font-medium" style={{ color: "#d4a574" }}>Lecture en cours...</span>
                  </div>
                </div>
              )}

              {mediaFinished && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-center gap-2" style={{ color: "#4ade80" }}>
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {introMediaType === "video" ? "Vidéo visionnée" : "Message écouté"}
                    </span>
                  </div>
                  <Button size="lg" className="w-full group transition-all duration-300" onClick={handleProceedToInterview}>
                    <Mic className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                    Commencer l'entretien
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="w-full max-w-xl space-y-8 animate-fade-in">
        {/* Hero section */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4 animate-scale-in" style={{ backgroundColor: "rgba(212, 165, 116, 0.15)" }}>
            <Mic className="h-7 w-7" style={{ color: "#d4a574" }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nouvelle session pour
          </h1>
          <p className="text-lg font-semibold" style={{ color: "#d4a574" }}>
            {project?.job_title}
          </p>
        </div>


        {/* Form card */}
        <Card className="overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #d4a574, #c4955e, #d4a574)" }} />
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Votre nom *</Label>
              <Input
                id="name"
                placeholder="Jean Dupont"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Votre email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@exemple.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
              />
            </div>
            <Button
              className="w-full h-12 rounded-lg text-base font-semibold group transition-all duration-300"
              size="lg"
              onClick={handleStart}
              disabled={!candidateName.trim() || !candidateEmail.trim() || starting}
            >
              {starting ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Démarrage...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center" style={{ color: "rgba(245, 240, 232, 0.4)" }}>
          Cet entretien sera enregistré, transcrit et analysé par intelligence artificielle. En continuant, vous
          acceptez ces conditions.
        </p>
      </div>
    </CandidateLayout>
  );
}
