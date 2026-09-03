import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Globe, Mic, CheckCircle, Play, Volume2, Video, ArrowRight, Upload, FileText, FileSignature, Linkedin, Trash2 } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";
import {
  CANDIDATE_FIELD_KEYS,
  CANDIDATE_FIELD_LABELS,
  DEFAULT_CANDIDATE_FIELDS,
  mergeCandidateFields,
  type CandidateFieldKey,
  type CandidateFieldsConfig,
} from "@/lib/candidateFields";
import { cn } from "@/lib/utils";

export default function InterviewLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [starting, setStarting] = useState(false);

  // Champs candidat configurables
  const [candidateFields, setCandidateFields] = useState<CandidateFieldsConfig>(DEFAULT_CANDIDATE_FIELDS);
  const [candidateJobTitle, setCandidateJobTitle] = useState("");
  const [candidateLinkedin, setCandidateLinkedin] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Intermediate media screen state
  const [showIntroMedia, setShowIntroMedia] = useState(false);
  const [introMediaType, setIntroMediaType] = useState<"audio" | "video" | "text" | "tts" | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [mediaFinished, setMediaFinished] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  // Quand l'intro est jouée AVANT le formulaire d'inscription
  const [preFormIntro, setPreFormIntro] = useState(false);
  const [preFormIntroDone, setPreFormIntroDone] = useState(false);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const trackedRef = useRef(false);

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
        setError("Ce lien est invalide ou le poste n'est plus actif.");
        setLoading(false);
        return;
      }

      if (proj.expires_at && new Date(proj.expires_at) < new Date()) {
        setError("Ce lien n'est plus actif.");
        setLoading(false);
        return;
      }

      setProject(proj);
      setCandidateFields(mergeCandidateFields((proj as any).candidate_fields));
      setLoading(false);

      // Tracking « clics » sur le lien candidat (déduplication quotidienne côté serveur)
      if (!trackedRef.current && proj.id) {
        trackedRef.current = true;
        supabase.functions
          .invoke("track-project-view", {
            body: { project_id: proj.id, referrer: document.referrer || "" },
          })
          .catch(() => {
            /* tracking best-effort */
          });
      }

      // Si l'option « intro en premier écran » est activée et qu'une intro est configurée,
      // on affiche l'intro avant le formulaire d'inscription.
      const projAny = proj as any;
      if (projAny.intro_first_screen && projAny.intro_enabled !== false) {
        const dbMode: string | null = projAny.intro_mode ?? null;
        let mode: "text" | "tts" | "audio" | "video" | null = null;
        if (dbMode === "text" || dbMode === "tts" || dbMode === "audio" || dbMode === "video") {
          mode = dbMode;
        } else if (projAny.presentation_video_url) {
          mode = "video";
        } else if (projAny.intro_audio_url) {
          mode = "audio";
        }
        if (mode) {
          setIntroMediaType(mode);
          setPreFormIntro(true);
          setShowIntroMedia(true);
        }
      }
    };
    load();
  }, [slug]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = candidateEmail.trim();
  const trimmedName = candidateName.trim();
  const trimmedJobTitle = candidateJobTitle.trim();
  const trimmedLinkedin = candidateLinkedin.trim();
  const trimmedPhone = candidatePhone.trim();
  const emailValid = emailRegex.test(trimmedEmail);
  const showEmailError = candidateEmail.length > 0 && !emailValid;

  const linkedinValid = !trimmedLinkedin || /^https?:\/\//i.test(trimmedLinkedin);
  const phoneValid = !trimmedPhone || /^[+0-9 ().-]{6,}$/.test(trimmedPhone);

  // Validation des champs additionnels selon la config du poste
  const missingRequired =
    (candidateFields.phone.enabled && candidateFields.phone.required && !trimmedPhone) ||
    (candidateFields.job_title.enabled && candidateFields.job_title.required && !trimmedJobTitle) ||
    (candidateFields.linkedin.enabled && candidateFields.linkedin.required && !trimmedLinkedin) ||
    (candidateFields.cv.enabled && candidateFields.cv.required && !cvFile) ||
    (candidateFields.cover_letter.enabled && candidateFields.cover_letter.required && !coverLetterFile);

  const canSubmit =
    trimmedName.length > 0 &&
    emailValid &&
    linkedinValid &&
    phoneValid &&
    !missingRequired &&
    !starting;

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_EXTS = [".pdf", ".doc", ".docx"];

  const handlePickFile = (file: File | null, setter: (f: File | null) => void) => {
    setFileError(null);
    if (!file) {
      setter(null);
      return;
    }
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTS.some((e) => lower.endsWith(e))) {
      setFileError("Format non supporté. Utilisez PDF, DOC ou DOCX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Fichier trop volumineux (10 Mo max).");
      return;
    }
    setter(file);
  };

  const uploadCandidateFile = async (sessionId: string, file: File, kind: "cv" | "cover-letter") => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix = kind === "cv" ? "" : "cover-letters/";
    const path = `${sessionId}/${prefix}${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("candidate-cvs")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    return { url: path, filename: file.name };
  };

  const handleStart = async () => {
    if (!canSubmit || !project) return;
    setStarting(true);

    const jobTitleValue = candidateFields.job_title.enabled && trimmedJobTitle ? trimmedJobTitle : null;
    const { data: session, error: err } = await supabase
      .from("sessions")
      .insert({
        project_id: project.id,
        organization_id: project.organization_id,
        candidate_name: trimmedName,
        candidate_email: trimmedEmail,
        candidate_job_title: jobTitleValue,
        candidate_linkedin_url: candidateFields.linkedin.enabled && trimmedLinkedin ? trimmedLinkedin : null,
        candidate_phone: candidateFields.phone.enabled && trimmedPhone ? trimmedPhone : null,
        recruiter_note: jobTitleValue ? `Poste : ${jobTitleValue}` : null,
      })
      .select()
      .single();

    if (err || !session) {
      setError("Impossible de démarrer la session. Réessayez.");
      setStarting(false);
      return;
    }

    // Upload des fichiers (CV / lettre de motivation) si présents
    try {
      const patch: Record<string, string | null> = {};
      if (candidateFields.cv.enabled && cvFile) {
        const { url, filename } = await uploadCandidateFile(session.id, cvFile, "cv");
        patch.candidate_cv_url = url;
        patch.candidate_cv_filename = filename;
      }
      if (candidateFields.cover_letter.enabled && coverLetterFile) {
        const { url, filename } = await uploadCandidateFile(session.id, coverLetterFile, "cover-letter");
        patch.candidate_cover_letter_url = url;
        patch.candidate_cover_letter_filename = filename;
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from("sessions").update(patch as never).eq("id", session.id);
      }
    } catch (uploadErr) {
      console.error("[InterviewLanding] file upload failed", uploadErr);
      // On n'interrompt pas le candidat — il pourra continuer l'entretien
    }


    const introEnabled = project.intro_enabled !== false;
    const dbMode: string | null = project.intro_mode ?? null;
    let mode: "text" | "tts" | "audio" | "video" | null = null;
    if (introEnabled && !preFormIntroDone) {
      if (dbMode === "text" || dbMode === "tts" || dbMode === "audio" || dbMode === "video") {
        mode = dbMode;
      } else if (project.presentation_video_url) {
        mode = "video";
      } else if (project.intro_audio_url) {
        mode = "audio";
      }
    }

    if (mode) {
      setSessionToken(session.token);
      setIntroMediaType(mode);
      setShowIntroMedia(true);
      setStarting(false);
    } else {
      navigate(`/session/${slug}/test/${session.token}`);
    }
  };

  const handlePlayMedia = async () => {
    setMediaError(false);
    if (introMediaType === "audio" && introAudioRef.current) {
      introAudioRef.current.play().catch(() => setMediaError(true));
      setMediaPlaying(true);
    } else if (introMediaType === "video" && introVideoRef.current) {
      introVideoRef.current.muted = false;
      introVideoRef.current.volume = 1;
      introVideoRef.current.play().catch(() => setMediaError(true));
      setMediaPlaying(true);
    } else if (introMediaType === "tts") {
      const text = (project?.intro_text || "").trim();
      if (!text) {
        setMediaFinished(true);
        return;
      }
      setTtsLoading(true);

      const playWithBrowserTts = () => {
        try {
          const synth = window.speechSynthesis;
          if (!synth) {
            setMediaFinished(true);
            return;
          }
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "fr-FR";
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.onend = () => {
            setMediaPlaying(false);
            setMediaFinished(true);
          };
          utterance.onerror = () => {
            setMediaPlaying(false);
            setMediaFinished(true);
          };
          (ttsAudioRef as any).current = {
            pause: () => synth.cancel(),
            src: "",
          };
          synth.speak(utterance);
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
          // Pas de TTS serveur disponible : on lit avec la voix du navigateur
          playWithBrowserTts();
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
        playWithBrowserTts();
      } finally {
        setTtsLoading(false);
      }
    }
  };

  const handleMediaEnded = () => {
    setMediaPlaying(false);
    setMediaFinished(true);
  };

  // Démarrage automatique de l'intro dès qu'elle est affichée (vidéo, audio, ou TTS).
  // Important : on garde le son. Si l'autoplay sonore est bloqué par le
  // navigateur, on N'AUTORISE PAS de bascule en muet — l'utilisateur cliquera
  // sur le bouton "Lire" qui constitue un geste utilisateur valide.
  const autoPlayAttemptedRef = useRef(false);
  useEffect(() => {
    if (!showIntroMedia) return;
    if (mediaPlaying || mediaFinished) return;
    if (autoPlayAttemptedRef.current) return;

    if (introMediaType === "video") {
      const v = introVideoRef.current;
      if (!v) return;
      autoPlayAttemptedRef.current = true;
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setMediaPlaying(true))
        .catch(() => {
          // Autoplay sonore bloqué : on laisse le bouton Play visible.
          autoPlayAttemptedRef.current = false;
        });
    } else if (introMediaType === "audio" || introMediaType === "tts") {
      autoPlayAttemptedRef.current = true;
      // handlePlayMedia gère son propre fallback (bouton visible si bloqué).
      handlePlayMedia().catch(() => {
        autoPlayAttemptedRef.current = false;
      });
    }
  }, [showIntroMedia, introMediaType, mediaPlaying, mediaFinished]);


  const stopAllIntroMedia = () => {
    try {
      const a = introAudioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
    try {
      const v = introVideoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    } catch {}
    try {
      const t = ttsAudioRef.current;
      if (t) {
        t.pause();
        const src = t.src;
        t.src = "";
        if (src && src.startsWith("blob:")) URL.revokeObjectURL(src);
        ttsAudioRef.current = null;
      }
    } catch {}
    setMediaPlaying(false);
    setTtsLoading(false);
  };

  const handleProceedToInterview = () => {
    stopAllIntroMedia();
    // Cas 1 : intro jouée AVANT le formulaire — on révèle le formulaire d'inscription
    if (preFormIntro) {
      setPreFormIntro(false);
      setShowIntroMedia(false);
      setPreFormIntroDone(true);
      setMediaPlaying(false);
      setMediaFinished(false);
      setIntroMediaType(null);
      return;
    }
    // Cas 2 : intro jouée APRÈS le formulaire — on poursuit vers la session
    if (sessionToken) {
      navigate(`/session/${slug}/test/${sessionToken}`);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "#111111", borderTopColor: "transparent" }} />
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
        <div className={`${introMediaType === "video" ? "max-w-2xl self-start mt-0" : "max-w-md"} w-full animate-fade-in space-y-3`}>
          {/* Skip link (hors vidéo : au-dessus de la carte) */}
          {introMediaType !== "video" && (
            <div className="flex justify-end">
              <button
                onClick={handleProceedToInterview}
                className="min-h-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Passer
              </button>
            </div>
          )}
          <Card className="w-full overflow-hidden">
            <CardContent className={`${introMediaType === "video" ? "py-5" : "py-8"} space-y-6 text-center`}>
              {(introMediaType === "audio" || introMediaType === "tts" || introMediaType === "text") && project.avatar_image_url ? (
                <img
                  src={project.avatar_image_url}
                  alt={project.ai_persona_name || "Recruteur"}
                  className={`mx-auto h-72 w-72 rounded-full object-cover object-top border-4 transition-all duration-500 ${mediaPlaying ? "border-[#d4a574] shadow-[0_0_20px_rgba(212,165,116,0.3)] scale-105" : "border-[#333]"}`}
                />
              ) : (introMediaType === "audio" || introMediaType === "tts") ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full animate-scale-in" style={{ backgroundColor: "rgba(212, 165, 116, 0.15)" }}>
                  <Volume2 className="h-8 w-8" style={{ color: "#d4a574" }} />
                </div>
              ) : null}

              <div className="space-y-2">
                <h2 className="text-xl font-bold">Message de {project.ai_persona_name || "votre recruteur"}</h2>
                <p className="text-sm" style={{ color: "rgba(245, 240, 232, 0.65)" }}>
                  {introMediaType === "video"
                    ? "Regardez cette vidéo avant de commencer votre session."
                    : introMediaType === "text"
                      ? "Lisez ce message avant de commencer votre session."
                      : "Écoutez ce message avant de commencer votre session."}
                </p>
              </div>

              {introMediaType === "audio" && (
                <audio
                  ref={introAudioRef}
                  src={project.intro_audio_url}
                  onEnded={handleMediaEnded}
                  onError={() => setMediaError(true)}
                  className="hidden"
                />
              )}

              {introMediaType === "video" && (
                <video
                  ref={introVideoRef}
                  src={project.presentation_video_url}
                  onEnded={handleMediaEnded}
                  onError={() => setMediaError(true)}
                  controls={mediaPlaying}
                  playsInline
                  className="w-full rounded-xl border transition-all duration-300"
                  style={{ borderColor: "rgba(245, 240, 232, 0.12)" }}
                />
              )}

              {introMediaType === "text" && (
                <div
                  className="text-left rounded-xl border p-5 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ borderColor: "rgba(245, 240, 232, 0.12)", backgroundColor: "rgba(255,255,255,0.02)" }}
                >
                  {project.intro_text}
                </div>
              )}

              {introMediaType === "text" ? (
                <Button size="lg" className="w-full group transition-all duration-300" onClick={handleProceedToInterview}>
                  <Mic className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  J'ai lu, continuer
                </Button>
              ) : mediaError ? (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-sm" style={{ color: "#f59e0b" }}>
                    Lecture impossible sur cet appareil. Vous pouvez continuer sans visionner le message.
                  </p>
                  <Button size="lg" className="w-full group transition-all duration-300" onClick={handleProceedToInterview}>
                    <Mic className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                    Continuer sans visionner
                  </Button>
                </div>
              ) : (
                <>
                  {!mediaPlaying && !mediaFinished && (
                    <Button size="lg" className="w-full group transition-all duration-300" onClick={handlePlayMedia} disabled={ttsLoading}>
                      <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                      {ttsLoading ? "Chargement..." : introMediaType === "video" ? "Regarder la vidéo" : "Écouter le message"}
                    </Button>
                  )}

                  {mediaPlaying && (introMediaType === "audio" || introMediaType === "tts") && (
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
                        Commencer la session
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          {introMediaType === "video" && (
            <div className="flex justify-center">
              <button
                onClick={handleProceedToInterview}
                className="min-h-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Passer
              </button>
            </div>
          )}
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
          <p className="text-base font-medium tracking-tight" style={{ color: "rgba(245, 240, 232, 0.7)" }}>
            Nouvelle session
          </p>
          <h1 className="text-3xl font-bold" style={{ color: "#d4a574" }}>
            {project?.job_title}
          </h1>
        </div>


        {/* Form card */}
        <Card className="overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #d4a574, #c4955e, #d4a574)" }} />
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Votre prénom/nom *</Label>
              <Input
                id="name"
                placeholder="Prénom Nom"
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
                placeholder="prenom.nom@email.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
              />
              {showEmailError && (
                <p className="text-xs" style={{ color: "#f87171" }}>
                  Veuillez saisir une adresse email valide.
                </p>
              )}
            </div>

            {/* Champs candidat configurables */}
            {candidateFields.phone.enabled && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Tél. mobile {candidateFields.phone.required && "*"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                  style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
                />
                {!phoneValid && (
                  <p className="text-xs" style={{ color: "#f87171" }}>
                    Numéro de téléphone invalide.
                  </p>
                )}
              </div>
            )}

            {candidateFields.job_title.enabled && (
              <div className="space-y-2">
                <Label htmlFor="job-title" className="text-sm font-medium">
                  Poste {candidateFields.job_title.required && "*"}
                </Label>
                <Input
                  id="job-title"
                  placeholder="Intitulé du poste visé"
                  value={candidateJobTitle}
                  onChange={(e) => setCandidateJobTitle(e.target.value)}
                  className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                  style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
                />
              </div>
            )}

            {candidateFields.linkedin.enabled && (
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-sm font-medium">
                  Profil LinkedIn {candidateFields.linkedin.required && "*"}
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={candidateLinkedin}
                  onChange={(e) => setCandidateLinkedin(e.target.value)}
                  className="h-12 rounded-lg transition-all duration-200 focus:ring-2"
                  style={{ "--tw-ring-color": "rgba(212, 165, 116, 0.5)" } as any}
                />
                {!linkedinValid && (
                  <p className="text-xs" style={{ color: "#f87171" }}>
                    L'URL doit commencer par http:// ou https://
                  </p>
                )}
              </div>
            )}

            {candidateFields.cv.enabled && (
              <CandidateFileField
                id="cv"
                label="CV"
                required={candidateFields.cv.required}
                file={cvFile}
                onPick={(f) => handlePickFile(f, setCvFile)}
                icon={<FileText className="h-4 w-4 shrink-0" style={{ color: "#d4a574" }} />}
              />
            )}

            {candidateFields.cover_letter.enabled && (
              <CandidateFileField
                id="cover-letter"
                label="Lettre de motivation"
                required={candidateFields.cover_letter.required}
                file={coverLetterFile}
                onPick={(f) => handlePickFile(f, setCoverLetterFile)}
                icon={<FileSignature className="h-4 w-4 shrink-0" style={{ color: "#d4a574" }} />}
              />
            )}

            {fileError && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {fileError}
              </p>
            )}

            <Button
              className="w-full h-12 rounded-lg text-base font-semibold group transition-all duration-300"
              size="lg"
              onClick={handleStart}
              disabled={!canSubmit}
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
          Cette session sera enregistré, transcrit et analysé par intelligence artificielle. En continuant, vous
          acceptez ces conditions.
        </p>
      </div>
    </CandidateLayout>
  );
}

function CandidateFileField({
  id,
  label,
  required,
  file,
  onPick,
  icon,
}: {
  id: string;
  label: string;
  required: boolean;
  file: File | null;
  onPick: (f: File | null) => void;
  icon: React.ReactNode;
}) {
  const inputId = `file-${id}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label} {required && "*"}
      </Label>
      {file ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm"
          style={{ borderColor: "rgba(245, 240, 232, 0.18)", backgroundColor: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Retirer le fichier"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors hover:border-[#d4a574]"
          style={{ borderColor: "rgba(245, 240, 232, 0.2)", color: "rgba(245, 240, 232, 0.6)" }}
        >
          <Upload className="h-4 w-4" />
          Glissez ou cliquez (PDF, DOC — 10 Mo max)
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

