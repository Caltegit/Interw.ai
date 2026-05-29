import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Volume2, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

type IntroMode = "text" | "tts" | "audio" | "video";

function resolveIntroMode(project: any): IntroMode | null {
  if (project?.intro_enabled === false) return null;
  const m = project?.intro_mode;
  if (m === "text" || m === "tts" || m === "audio" || m === "video") return m;
  if (project?.presentation_video_url) return "video";
  if (project?.intro_audio_url) return "audio";
  return null;
}

export default function InterviewDemoLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [introMode, setIntroMode] = useState<IntroMode | null>(null);
  const [phase, setPhase] = useState<"ready" | "intro" | "navigating">("ready");
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [mediaFinished, setMediaFinished] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (!proj) {
        setError("Ce projet n'est pas accessible.");
        setLoading(false);
        return;
      }
      setProject(proj);
      setLoading(false);
    })();
  }, [slug]);

  const goToInterview = (token: string) => {
    setPhase("navigating");
    navigate(`/session/${slug}/start/${token}`, { replace: true });
  };

  const handleStart = async () => {
    if (!project || starting || startedRef.current) return;
    startedRef.current = true;
    setStarting(true);

    // 1) Plein écran — geste utilisateur valide ici (desktop uniquement)
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );
    if (!isMobile) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // ignoré : on continue sans
      }
    }

    // 2) Création de la session démo
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
      startedRef.current = false;
      return;
    }
    const token = (session as any).token as string;
    setSessionToken(token);

    // 3) Intro projet si configurée
    const mode = resolveIntroMode(project);
    if (mode) {
      setIntroMode(mode);
      setPhase("intro");
      setStarting(false);
      return;
    }

    // 4) Sinon, on enchaîne directement
    goToInterview(token);
  };

  const playTts = async () => {
    const text = (project?.intro_text || "").trim();
    if (!text) {
      setMediaFinished(true);
      return;
    }
    setTtsLoading(true);
    const playBrowser = () => {
      try {
        const synth = window.speechSynthesis;
        if (!synth) {
          setMediaFinished(true);
          return;
        }
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "fr-FR";
        u.onend = () => {
          setMediaPlaying(false);
          setMediaFinished(true);
        };
        u.onerror = () => {
          setMediaPlaying(false);
          setMediaFinished(true);
        };
        synth.speak(u);
        setMediaPlaying(true);
      } catch {
        setMediaFinished(true);
      }
    };
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, projectId: project.id }),
      });
      const ct = res.headers.get("Content-Type") || "";
      if (!ct.includes("audio")) {
        playBrowser();
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        setMediaPlaying(false);
        setMediaFinished(true);
        URL.revokeObjectURL(objectUrl);
      };
      await audio.play();
      setMediaPlaying(true);
    } catch {
      playBrowser();
    } finally {
      setTtsLoading(false);
    }
  };

  const handlePlayMedia = async () => {
    if (introMode === "audio" && audioRef.current) {
      audioRef.current.play().catch(() => setMediaFinished(true));
      setMediaPlaying(true);
    } else if (introMode === "video" && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      videoRef.current.play().catch(() => setMediaFinished(true));
      setMediaPlaying(true);
    } else if (introMode === "tts") {
      await playTts();
    }
  };

  // Autoplay si possible
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (phase !== "intro" || autoTriedRef.current) return;
    if (introMode === "video" && videoRef.current) {
      autoTriedRef.current = true;
      const v = videoRef.current;
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setMediaPlaying(true))
        .catch(() => {
          autoTriedRef.current = false;
        });
    } else if (introMode === "audio" || introMode === "tts") {
      autoTriedRef.current = true;
      handlePlayMedia().catch(() => {
        autoTriedRef.current = false;
      });
    }
    // text : pas d'autoplay
  }, [phase, introMode]);

  const handleProceed = () => {
    try {
      audioRef.current?.pause();
      videoRef.current?.pause();
      const t = ttsAudioRef.current;
      if (t) {
        t.pause();
        ttsAudioRef.current = null;
      }
    } catch {}
    if (sessionToken) goToInterview(sessionToken);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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

  if (phase === "navigating") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "intro" && introMode) {
    return (
      <CandidateLayout minimal>
        <div
          className={`${introMode === "video" ? "max-w-2xl" : "max-w-md"} w-full animate-fade-in space-y-3`}
        >
          <div className="flex justify-end">
            <button
              onClick={handleProceed}
              className="min-h-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Passer
            </button>
          </div>
          <Card className="w-full overflow-hidden">
            <CardContent className={`${introMode === "video" ? "py-5" : "py-8"} space-y-6 text-center`}>
              {(introMode === "audio" || introMode === "tts" || introMode === "text") &&
              project.avatar_image_url ? (
                <img
                  src={project.avatar_image_url}
                  alt={project.ai_persona_name || "Recruteur"}
                  className={`mx-auto h-56 w-56 rounded-full object-cover object-top border-4 transition-all duration-500 ${mediaPlaying ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)] scale-105" : "border-border"}`}
                />
              ) : introMode === "audio" || introMode === "tts" ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                  <Volume2 className="h-8 w-8 text-primary" />
                </div>
              ) : null}

              {introMode === "audio" && (
                <audio
                  ref={audioRef}
                  src={project.intro_audio_url}
                  onEnded={() => {
                    setMediaPlaying(false);
                    setMediaFinished(true);
                  }}
                  className="hidden"
                />
              )}

              {introMode === "video" && (
                <video
                  ref={videoRef}
                  src={project.presentation_video_url}
                  onEnded={() => {
                    setMediaPlaying(false);
                    setMediaFinished(true);
                  }}
                  controls={mediaPlaying}
                  playsInline
                  className="w-full rounded-xl border"
                />
              )}

              {introMode === "text" && (
                <div className="text-left rounded-xl border p-5 whitespace-pre-wrap text-sm leading-relaxed bg-muted/30">
                  {project.intro_text}
                </div>
              )}

              {introMode === "text" ? (
                <Button size="lg" className="w-full" onClick={handleProceed}>
                  Continuer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  {!mediaPlaying && !mediaFinished && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handlePlayMedia}
                      disabled={ttsLoading}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      {ttsLoading
                        ? "Chargement…"
                        : introMode === "video"
                          ? "Regarder la vidéo"
                          : "Écouter le message"}
                    </Button>
                  )}

                  {mediaPlaying && (introMode === "audio" || introMode === "tts") && (
                    <div className="flex items-center justify-center gap-2 text-sm text-primary animate-fade-in">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Lecture en cours…
                    </div>
                  )}

                  {mediaFinished && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-center gap-2 text-sm text-success">
                        <CheckCircle className="h-5 w-5" />
                        {introMode === "video" ? "Vidéo visionnée" : "Message écouté"}
                      </div>
                      <Button size="lg" className="w-full" onClick={handleProceed}>
                        Continuer
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  // phase === "ready"
  return (
    <CandidateLayout>
      <div className="w-full max-w-md animate-fade-in">
        <Card>
          <CardContent className="py-10 space-y-6 text-center">
            <h1 className="text-2xl font-bold candidate-gradient-text">Mode démo</h1>
            <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.75)" }}>
              Aucun enregistrement ne sera effectué.
            </p>
            <Button size="lg" className="w-full" onClick={handleStart} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Démarrage…
                </>
              ) : (
                <>
                  Démarrer la démo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}
