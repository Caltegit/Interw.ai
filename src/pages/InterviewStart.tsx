import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User, Volume2, VolumeX, Eye, EyeOff, CheckCircle2, MousePointerClick, Pause, Play } from "lucide-react";
import QuestionMediaPlayer, { type QuestionMediaPlayerHandle } from "@/components/interview/QuestionMediaPlayer";
import MicVolumeMeter from "@/components/interview/MicVolumeMeter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import defaultAiAvatar from "@/assets/default-interviewer.png";
import CandidateLayout from "@/components/CandidateLayout";

// Extend window for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function InterviewStart() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  type ChatMessage = {
    role: string;
    content: string;
    mediaType?: "written" | "audio" | "video";
    mediaUrl?: string | null;
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readyToStart, setReadyToStart] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);
  const [showSelfView, setShowSelfView] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const pausedDuringQuestionRef = useRef(false);
  const pausedElapsedRef = useRef<number>(0);
  const isListeningRef = useRef(false);
  // Track what the AI is currently presenting so we can replay it on resume
  type Presentation =
    | { kind: "tts"; text: string }
    | { kind: "media"; mediaType: "audio" | "video" }
    | null;
  const currentPresentationRef = useRef<Presentation>(null);
  const recognitionRef = useRef<any>(null);
  const candidateTranscriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const interviewStartTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndTriggeredRef = useRef(false);
  const questionVideoChunksRef = useRef<Blob[]>([]);
  const questionRecorderRef = useRef<MediaRecorder | null>(null);
  const allQuestionVideosRef = useRef<{ index: number; url: string }[]>([]);
  const featuredPlayerRef = useRef<QuestionMediaPlayerHandle>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  // Watchdog: if onPlaybackEnd never fires within 8s, force the listening state
  const playbackWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showManualContinue, setShowManualContinue] = useState(false);
  const manualContinueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendResponseRef = useRef<(() => void) | null>(null);
  // Background jobs (DB inserts, AI calls) — tracked so we can flush before redirect
  const backgroundJobsRef = useRef<Promise<unknown>[]>([]);
  const [backgroundSaving, setBackgroundSaving] = useState(0);
  const trackBackground = useCallback(<T,>(p: Promise<T>): Promise<T> => {
    setBackgroundSaving((n) => n + 1);
    const tracked = p.finally(() => setBackgroundSaving((n) => Math.max(0, n - 1)));
    backgroundJobsRef.current.push(tracked);
    return p;
  }, []);
  // Helper: persist a single message to DB immediately
  const persistMessage = useCallback(
    async (
      sessionId: string,
      role: "ai" | "candidate",
      content: string,
      options?: { questionId?: string | null; videoSegmentUrl?: string | null },
    ) => {
      const { error } = await supabase.from("session_messages").insert({
        session_id: sessionId,
        role,
        content,
        question_id: options?.questionId ?? null,
        is_follow_up: false,
        video_segment_url: options?.videoSegmentUrl ?? null,
      });

      if (error) {
        console.error("Failed to persist message:", error);
        throw error;
      }
    },
    [],
  );

  const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  const SILENCE_TIMEOUT_MS = 45 * 1000; // 45 seconds
  // Reset silence timer (called on any activity)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (!autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        console.log("Auto-ending interview: 45s silence");
        toast({ title: "Entretien terminé", description: "Fin automatique après 45 secondes de silence." });
        endInterviewRef.current?.();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [toast]);

  // Ref to endInterview so timers can call it without stale closures
  const endInterviewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play a media URL and return a promise that resolves when it ends
  const playMediaUrl = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const el = new Audio(url);
      el.onended = () => resolve();
      el.onerror = () => resolve();
      el.play().catch(() => resolve());
    });
  }, []);

  // TTS: speak text aloud — robust with safety timer + voice fallback
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!ttsEnabled || !window.speechSynthesis || !text?.trim()) {
          console.log("[interview] TTS skipped (disabled/unsupported/empty)");
          resolve();
          return;
        }

        // Track for pause/resume replay
        currentPresentationRef.current = { kind: "tts", text };

        let settled = false;
        // Backup button visible after 4s of TTS (in case it's stuck)
        const manualBackupTimer = setTimeout(() => {
          if (!settled && !isPausedRef.current) {
            console.warn("[interview] TTS slow — showing manual continue button");
            setShowManualContinue(true);
          }
        }, 4000);
        const safeResolve = (reason: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(manualBackupTimer);
          console.log("[interview] TTS done:", reason);
          setIsSpeaking(false);
          resolve();
        };

        try {
          window.speechSynthesis.cancel();
        } catch {}

        const voices = window.speechSynthesis.getVoices();
        // If voices not loaded yet, skip TTS rather than blocking forever
        if (!voices || voices.length === 0) {
          console.warn("[interview] TTS: no voices available, skipping");
          // Brief delay to mimic speech rhythm, then resolve
          setTimeout(() => safeResolve("no_voices"), 300);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 0.95;
        utterance.pitch = 1.1;

        const femaleVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("fr") &&
              /female|femme|amelie|marie|thomas/i.test(v.name) === false &&
              /amelie|audrey|marie|céline|léa|sophie|virginie|siri.*female|google.*fr/i.test(v.name),
          ) ||
          voices.find(
            (v) =>
              v.lang.startsWith("fr") &&
              (/female/i.test(v.name) ||
                v.name.toLowerCase().includes("amelie") ||
                v.name.toLowerCase().includes("audrey")),
          ) ||
          voices.find((v) => v.lang.startsWith("fr"));
        if (femaleVoice) utterance.voice = femaleVoice;

        // Safety timer: text length / 15 chars per second + 4s buffer (max 20s)
        const safetyMs = Math.min(20000, Math.ceil(text.length / 15) * 1000 + 4000);
        const safetyTimer = setTimeout(() => {
          console.warn("[interview] TTS safety timer fired after", safetyMs, "ms");
          try { window.speechSynthesis.cancel(); } catch {}
          safeResolve("safety_timer");
        }, safetyMs);

        utterance.onstart = () => {
          console.log("[interview] TTS onstart");
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          clearTimeout(safetyTimer);
          safeResolve("onend");
        };
        utterance.onerror = (e) => {
          clearTimeout(safetyTimer);
          console.warn("[interview] TTS onerror:", (e as any)?.error);
          safeResolve("onerror");
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("[interview] TTS speak() threw:", e);
          clearTimeout(safetyTimer);
          safeResolve("speak_throw");
        }
      });
    },
    [ttsEnabled],
  );

  // Play question media (audio_url or video_url) if available, otherwise use TTS
  const speakOrPlayQuestion = useCallback(
    async (text: string, question?: any) => {
      if (question?.video_url) {
        setIsSpeaking(true);
        await playMediaUrl(question.video_url);
        setIsSpeaking(false);
      } else if (question?.audio_url) {
        setIsSpeaking(true);
        await playMediaUrl(question.audio_url);
        setIsSpeaking(false);
      } else {
        await speak(text);
      }
    },
    [playMediaUrl, speak],
  );

  // STT: start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Erreur",
        description: "La reconnaissance vocale n'est pas supportée par ce navigateur.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    candidateTranscriptRef.current = "";
    setLiveTranscript("");

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      if (final) {
        candidateTranscriptRef.current += final;
      }
      setLiveTranscript(candidateTranscriptRef.current + interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("[interview] STT onerror:", event.error);
      // "no-speech" is benign on Chrome — let onend auto-restart, don't tear down
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      // Other errors: stop listening
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("[interview] STT onend (isListeningRef:", isListeningRef.current, ", paused:", isPausedRef.current, ")");
      // Auto-restart if we should still be listening (use ref, not stale state)
      if (isListeningRef.current && !isPausedRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log("[interview] STT auto-restarted");
        } catch (e) {
          console.warn("[interview] STT restart failed:", e);
        }
      }
    };

    recognition.start();
    isListeningRef.current = true;
    setIsListening(true);
  }, [toast]);

  // STT: stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Pause: freeze STT, TTS, recorder, all timers — snapshot elapsed time
  const pauseInterview = useCallback(() => {
    isPausedRef.current = true;
    // "Pendant la question" = il y a une présentation en cours (TTS ou média)
    const duringQuestion = currentPresentationRef.current !== null;
    pausedDuringQuestionRef.current = duringQuestion;
    console.log("[interview] PAUSE — duringQuestion:", duringQuestion, "presentation:", currentPresentationRef.current);

    // Stop the question media player cleanly (resets currentTime + finished state)
    if (duringQuestion) {
      try { featuredPlayerRef.current?.stop(); } catch {}
    }
    // STT
    stopListening();
    // TTS
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    // Recorder
    if (questionRecorderRef.current && questionRecorderRef.current.state === "recording") {
      try { questionRecorderRef.current.pause(); } catch {}
    }
    // Snapshot elapsed time for max-duration timer
    if (interviewStartTimeRef.current !== null) {
      pausedElapsedRef.current = Date.now() - interviewStartTimeRef.current;
    }
    // Clear all timers — including watchdog so it doesn't fire during pause
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
    if (autoSkipTimerRef.current) { clearTimeout(autoSkipTimerRef.current); autoSkipTimerRef.current = null; }
    if (autoSkipCountdownRef.current) { clearInterval(autoSkipCountdownRef.current); autoSkipCountdownRef.current = null; }
    if (playbackWatchdogRef.current) { clearTimeout(playbackWatchdogRef.current); playbackWatchdogRef.current = null; }
    if (manualContinueTimerRef.current) { clearTimeout(manualContinueTimerRef.current); manualContinueTimerRef.current = null; }
    setShowManualContinue(false);
    setShouldAutoPlay(false);
    setAutoSkipCountdown(null);
    setIsPaused(true);
  }, [stopListening]);

  // Resume: replay the question (TTS or media) from the start, or resume listening
  const resumeInterview = useCallback(async () => {
    setIsPaused(false);
    isPausedRef.current = false;
    const wasDuringQuestion = pausedDuringQuestionRef.current;
    const presentation = currentPresentationRef.current;
    pausedDuringQuestionRef.current = false;
    console.log("[interview] RESUME — wasDuringQuestion:", wasDuringQuestion, "presentation:", presentation);

    // Restart max-duration timer with remaining time (always)
    const remaining = Math.max(0, MAX_DURATION_MS - pausedElapsedRef.current);
    interviewStartTimeRef.current = Date.now() - pausedElapsedRef.current;
    maxDurationTimerRef.current = setTimeout(() => {
      if (!autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        toast({ title: "Entretien terminé", description: "La durée maximale a été atteinte." });
        endInterviewRef.current?.();
      }
    }, remaining);

    if (wasDuringQuestion && presentation?.kind === "tts") {
      // Replay TTS from the start, then continue the natural flow
      console.log("[interview] Resume: replaying TTS from start");
      await speak(presentation.text);
      if (isPausedRef.current) return; // user re-paused mid-TTS
      // Was this a written question (no media to follow)? Start listening now.
      const q = questions[currentQuestionIndex];
      const hasMedia = !!(q?.audio_url || q?.video_url);
      if (!hasMedia) {
        startQuestionRecording();
        startListening();
        resetSilenceTimer();
      } else {
        // After greeting/transition TTS, the media should auto-play
        setIsSpeaking(true);
        setShouldAutoPlay(false);
        setTimeout(() => {
          setShouldAutoPlay(true);
          armPlaybackWatchdog();
        }, 30);
      }
      return;
    }

    if (wasDuringQuestion && presentation?.kind === "media") {
      // Replay media from start — synchronous call preserves user gesture (mobile autoplay)
      console.log("[interview] Resume: replaying media from start");
      setShouldAutoPlay(true);
      setIsSpeaking(true);
      try { featuredPlayerRef.current?.restart(); } catch (e) { console.warn("restart failed", e); }
      armPlaybackWatchdog();
      return;
    }

    // Listening phase — resume recorder + STT
    if (questionRecorderRef.current && questionRecorderRef.current.state === "paused") {
      try { questionRecorderRef.current.resume(); } catch {}
    }
    startListening();
    resetSilenceTimer();
  }, [speak, startListening, resetSilenceTimer, toast, questions, currentQuestionIndex]);

  // Load session data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: sessions } = await supabase.from("sessions").select("*").eq("token", token).limit(1);
      const sess = sessions?.[0];
      if (!sess) {
        navigate(`/interview/${slug}`);
        return;
      }

      setSession(sess);
      const { data: proj } = await supabase.from("projects").select("*").eq("id", sess.project_id).single();
      setProject(proj);
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("project_id", sess.project_id)
        .order("order_index");
      setQuestions(qs ?? []);
      setLoading(false);
    };
    load();
  }, [token, slug, navigate]);

  // Start camera stream (no global recorder — only per-question recorders)
  const startVideoStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast({
        title: "Caméra inaccessible",
        description: "Veuillez autoriser l'accès à la caméra.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Start a per-question video recorder (uses same stream)
  // Detect supported mime type for MediaRecorder
  const getSupportedMimeType = useCallback(() => {
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined; // browser default
  }, []);

  const startQuestionRecording = useCallback(() => {
    if (!streamRef.current) return;
    questionVideoChunksRef.current = [];
    try {
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(streamRef.current, options);
      questionRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) questionVideoChunksRef.current.push(e.data);
      };
      recorder.start(500);
    } catch (e) {
      console.error("Question recorder error:", e);
    }
  }, [getSupportedMimeType]);

  // Stop per-question recorder and upload the video segment
  const stopAndUploadQuestionVideo = useCallback(
    async (sessionId: string, questionIndex: number): Promise<string | null> => {
      const recorder = questionRecorderRef.current;
      if (!recorder || recorder.state === "inactive") return null;

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      questionRecorderRef.current = null;

      if (questionVideoChunksRef.current.length === 0) return null;

      const blob = new Blob(questionVideoChunksRef.current, { type: "video/webm" });
      questionVideoChunksRef.current = [];
      const fileName = `interviews/${sessionId}/q${questionIndex}.webm`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, blob, { contentType: "video/webm", upsert: true });
        if (uploadError) {
          console.error("Question video upload error:", uploadError);
          return null;
        }
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
        return urlData.publicUrl;
      } catch (e) {
        console.error("Question video upload exception:", e);
        return null;
      }
    },
    [],
  );

  // Watchdog helpers — guarantee transition to listening even if onPlaybackEnd never fires
  const clearPlaybackWatchdog = useCallback(() => {
    if (playbackWatchdogRef.current) {
      clearTimeout(playbackWatchdogRef.current);
      playbackWatchdogRef.current = null;
    }
    if (manualContinueTimerRef.current) {
      clearTimeout(manualContinueTimerRef.current);
      manualContinueTimerRef.current = null;
    }
    setShowManualContinue(false);
  }, []);

  const forceStartListening = useCallback(() => {
    if (isPausedRef.current) {
      console.log("[InterviewStart] forceStartListening blocked — interview is paused");
      return;
    }
    console.log("[InterviewStart] Forcing transition to listening");
    clearPlaybackWatchdog();
    setShouldAutoPlay(false);
    setIsSpeaking(false);
    startQuestionRecording();
    startListening();
  }, [clearPlaybackWatchdog, startQuestionRecording, startListening]);

  const armPlaybackWatchdog = useCallback(() => {
    clearPlaybackWatchdog();
    console.log("[interview] watchdog armed (manual btn @3s, hard fallback @7s)");
    // After 3s of "Préparation", offer a manual button as backup
    manualContinueTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) setShowManualContinue(true);
    }, 3000);
    // Hard fallback after 7s if onPlaybackEnd never fires
    playbackWatchdogRef.current = setTimeout(() => {
      if (isPausedRef.current) return;
      console.warn("[interview] Playback watchdog triggered after 7s — forcing listening");
      forceStartListening();
    }, 7000);
  }, [clearPlaybackWatchdog, forceStartListening]);

  // Called when user clicks "Démarrer" — runs in user gesture context (needed for mobile TTS)
  const beginInterview = async () => {
    if (!session || !project || questions.length === 0) return;

    // Warm up speech synthesis with a silent utterance (mobile requires gesture)
    if (window.speechSynthesis) {
      const warmup = new SpeechSynthesisUtterance("");
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
    }

    setReadyToStart(true);

    // Mark session as in_progress
    supabase
      .from("sessions")
      .update({ status: "in_progress" as any, started_at: new Date().toISOString() })
      .eq("id", session.id);

    // Start camera stream
    await startVideoStream();

    // Start auto-end timers
    interviewStartTimeRef.current = Date.now();
    maxDurationTimerRef.current = setTimeout(() => {
      if (!autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        console.log("Auto-ending interview: 10min max duration");
        toast({ title: "Entretien terminé", description: "La durée maximale de 10 minutes a été atteinte." });
        endInterviewRef.current?.();
      }
    }, MAX_DURATION_MS);
    resetSilenceTimer();

    const q0 = questions[0];
    const firstQMediaType: "written" | "audio" | "video" = q0?.video_url
      ? "video"
      : q0?.audio_url
        ? "audio"
        : "written";
    const firstQMediaUrl = q0?.video_url || q0?.audio_url || null;
    const isFirstQMedia = firstQMediaType !== "written";

    const greeting = isFirstQMedia
      ? `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. ${firstQMediaType === "video" ? "Regardez" : "Écoutez"} la première question.`
      : `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. Commençons avec la première question : ${questions[0].content}`;

    const aiMsg = { role: "assistant" as const, content: greeting };
    const chatMsg: ChatMessage = {
      role: "ai",
      content: greeting,
      mediaType: firstQMediaType,
      mediaUrl: firstQMediaUrl,
    };
    setMessages([chatMsg]);
    messagesRef.current = [chatMsg];
    setAiMessages([aiMsg]);

    // Persist greeting to DB immediately
    try {
      await persistMessage(session.id, "ai", greeting);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le début de l'entretien.",
        variant: "destructive",
      });
    }

    // Speak the greeting via TTS, then trigger auto-play on the featured player for media questions
    await speak(greeting);
    if (isFirstQMedia) {
      setIsSpeaking(true);
      setShouldAutoPlay(false);
      setTimeout(() => {
        setShouldAutoPlay(true);
        armPlaybackWatchdog();
      }, 30);
      // Don't start listening yet — onPlaybackEnd will do it (watchdog as backup)
    } else {
      // Text question: start recording + listening immediately after TTS
      startQuestionRecording();
      startListening();
    }
  };

  // Send candidate response — UI advances IMMEDIATELY, persistence + AI run in background.
  const handleSendResponse = async () => {
    stopListening();
    const transcript = candidateTranscriptRef.current.trim() || liveTranscript.trim();

    if (!transcript) {
      toast({
        title: "Aucune réponse",
        description: "Veuillez parler avant d'envoyer votre réponse.",
        variant: "destructive",
      });
      startListening();
      return;
    }

    // Snapshot context for background jobs
    const questionIdx = currentQuestionIndex;
    const sessionId = session?.id as string | undefined;
    const questionIdSnapshot = questions[questionIdx]?.id || null;
    const aiHistorySnapshot: { role: "user" | "assistant"; content: string }[] = [
      ...aiMessages,
      { role: "user", content: transcript },
    ];
    const isLastQuestion = questionIdx >= questions.length - 1;

    // ── 1. Update UI immediately ──
    setMessages((prev) => {
      const updated = [...prev, { role: "candidate", content: transcript }];
      messagesRef.current = updated;
      return updated;
    });
    setAiMessages(aiHistorySnapshot);
    setLiveTranscript("");
    candidateTranscriptRef.current = "";

    // ── 2. Background: stop & upload current question video, persist candidate message ──
    if (sessionId) {
      const persistCandidateJob = (async () => {
        let videoUrl: string | null = null;
        try {
          videoUrl = await stopAndUploadQuestionVideo(sessionId, questionIdx);
        } catch (e) {
          console.error("Background video upload error:", e);
        }
        // Insert candidate message (1 retry on failure)
        const insertOnce = () =>
          persistMessage(sessionId, "candidate", transcript, {
            questionId: questionIdSnapshot,
            videoSegmentUrl: videoUrl,
          });
        try {
          await insertOnce();
        } catch (e) {
          console.warn("Candidate message insert failed, retrying in 2s…", e);
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await insertOnce();
          } catch (e2) {
            console.error("Candidate message insert failed after retry:", e2);
            toast({
              title: "Sauvegarde échouée",
              description: "Une réponse n'a pas pu être enregistrée. L'entretien continue.",
              variant: "destructive",
            });
          }
        }
        // Update session video_recording_url with first video if missing
        if (videoUrl) {
          try {
            const { data: sessRow } = await supabase
              .from("sessions")
              .select("video_recording_url")
              .eq("id", sessionId)
              .maybeSingle();
            if (sessRow && !sessRow.video_recording_url) {
              await supabase.from("sessions").update({ video_recording_url: videoUrl }).eq("id", sessionId);
              setSession((prev: any) => (prev ? { ...prev, video_recording_url: videoUrl } : prev));
            }
          } catch (e) {
            console.error("Session video url update error:", e);
          }
        }
      })();
      trackBackground(persistCandidateJob);
    }

    // ── 3. Background: call AI for transition text + persist (non-blocking, used for report only) ──
    if (sessionId) {
      const aiJob = (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("ai-conversation-turn", {
            body: {
              messages: aiHistorySnapshot,
              projectContext: {
                aiPersonaName: project?.ai_persona_name ?? "Marie",
                jobTitle: project?.job_title ?? "",
                questions: questions.map((q) => ({
                  content: q.content,
                  type: q.type,
                  mediaType: q.video_url ? "video" : q.audio_url ? "audio" : "written",
                })),
                currentQuestionNumber: questionIdx + 1,
                totalQuestions: questions.length,
              },
            },
          });
          if (error) throw error;
          const aiResponse = data?.message;
          if (aiResponse) {
            try {
              await persistMessage(sessionId, "ai", aiResponse);
            } catch (e) {
              console.error("AI message persist failed:", e);
            }
            setAiMessages((prev) => [...prev, { role: "assistant", content: aiResponse }]);
          }
        } catch (e) {
          console.warn("Background AI conversation turn failed (non-blocking):", e);
        }
      })();
      trackBackground(aiJob);
    }

    // ── 4. Advance UI to next question NOW (no await on AI) ──
    if (isLastQuestion) {
      setInterviewFinished(true);
      // Speak short closing then end interview
      const closing = "Merci pour vos réponses, l'entretien est terminé.";
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: closing }];
        messagesRef.current = updated;
        return updated;
      });
      await speak(closing);
      // endInterview will flush background jobs with timeout
      endInterviewRef.current?.();
      return;
    }

    const nextQIdx = questionIdx + 1;
    const nextQ = questions[nextQIdx];
    const nMediaType: "written" | "audio" | "video" = nextQ?.video_url
      ? "video"
      : nextQ?.audio_url
        ? "audio"
        : "written";
    const nMediaUrl = nextQ?.video_url || nextQ?.audio_url || null;

    // Local deterministic transition (no AI on critical path)
    const transition =
      nMediaType === "written"
        ? `Merci. Question suivante : ${nextQ.content}`
        : `Merci. ${nMediaType === "video" ? "Regardez" : "Écoutez"} la question suivante.`;

    setMessages((prev) => {
      const updated = [...prev, { role: "ai", content: transition, mediaType: nMediaType, mediaUrl: nMediaUrl }];
      messagesRef.current = updated;
      return updated;
    });

    setCurrentQuestionIndex(nextQIdx);

    // Speak transition + auto-play next media (or start listening for written)
    await speak(transition);
    if (nextQ && (nextQ.audio_url || nextQ.video_url)) {
      setIsSpeaking(true);
      setShouldAutoPlay(false);
      setTimeout(() => {
        setShouldAutoPlay(true);
        armPlaybackWatchdog();
      }, 30);
      // onPlaybackEnd (or watchdog) will start recording + listening
    } else {
      startQuestionRecording();
      startListening();
    }
  };

  // Skip the current question — go directly to the next one without calling AI
  const handleSkipQuestion = async () => {
    if (isProcessing || interviewFinished) return;
    if (currentQuestionIndex >= questions.length - 1) return;

    setIsProcessing(true);

    // 1. Stop listening + reset transcript
    stopListening();
    candidateTranscriptRef.current = "";
    setLiveTranscript("");
    clearAutoSkip();
    window.speechSynthesis?.cancel();

    // 2. Stop & upload current question recording
    const questionIdx = currentQuestionIndex;
    let questionVideoUrl: string | null = null;
    if (session?.id) {
      questionVideoUrl = await stopAndUploadQuestionVideo(session.id, questionIdx);
    }

    // 3. Persist a marker message so the report knows the question was skipped
    const skipMarker = "[Question passée]";
    setMessages((prev) => {
      const updated = [...prev, { role: "candidate", content: skipMarker }];
      messagesRef.current = updated;
      return updated;
    });
    if (session?.id) {
      try {
        await persistMessage(session.id, "candidate", skipMarker, {
          questionId: questions[questionIdx]?.id || null,
          videoSegmentUrl: questionVideoUrl,
        });
      } catch {
        // non-blocking
      }
    }
    setAiMessages((prev) => [...prev, { role: "user" as const, content: skipMarker }]);

    // 4. Build next question transition
    const nextQIdx = currentQuestionIndex + 1;
    const nextQ = questions[nextQIdx];
    const nMediaType: "written" | "audio" | "video" = nextQ?.video_url
      ? "video"
      : nextQ?.audio_url
        ? "audio"
        : "written";
    const nMediaUrl = nextQ?.video_url || nextQ?.audio_url || null;

    const transition =
      nMediaType === "written"
        ? `Passons à la question suivante : ${nextQ.content}`
        : `Passons à la question suivante. ${nMediaType === "video" ? "Regardez" : "Écoutez"} bien.`;

    setMessages((prev) => {
      const updated = [...prev, { role: "ai", content: transition, mediaType: nMediaType, mediaUrl: nMediaUrl }];
      messagesRef.current = updated;
      return updated;
    });
    if (session?.id) {
      try {
        await persistMessage(session.id, "ai", transition);
      } catch {
        // non-blocking
      }
    }
    setAiMessages((prev) => [...prev, { role: "assistant" as const, content: transition }]);

    setCurrentQuestionIndex((prev) => prev + 1);
    setIsProcessing(false);

    // 5. Speak transition + auto-play next question media (or start listening for written)
    await speak(transition);
    if (nextQ && (nextQ.audio_url || nextQ.video_url)) {
      setIsSpeaking(true);
      setShouldAutoPlay(false);
      setTimeout(() => {
        setShouldAutoPlay(true);
        armPlaybackWatchdog();
      }, 30);
    } else {
      startQuestionRecording();
      startListening();
    }
  };

  const endInterview = async () => {
    // Clear all auto-end timers
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    stopListening();
    window.speechSynthesis?.cancel();

    if (session?.id) {
      // Stop per-question recorder if still running and upload last segment
      if (questionRecorderRef.current && questionRecorderRef.current.state !== "inactive") {
        await stopAndUploadQuestionVideo(session.id, currentQuestionIndex);
      }

      // Stop camera stream
      streamRef.current?.getTracks().forEach((t) => t.stop());

      // Flush in-flight background jobs (candidate inserts + AI transitions), max 3s
      if (backgroundJobsRef.current.length > 0) {
        const flush = Promise.allSettled(backgroundJobsRef.current);
        const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
        await Promise.race([flush, timeout]);
        backgroundJobsRef.current = [];
      }

      // Calculate duration
      const durationSeconds = interviewStartTimeRef.current
        ? Math.round((Date.now() - interviewStartTimeRef.current) / 1000)
        : null;

      // Update session status to completed
      await supabase
        .from("sessions")
        .update({
          status: "completed" as any,
          completed_at: new Date().toISOString(),
          ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
        })
        .eq("id", session.id);

      // Trigger report generation — messages already saved in real-time
      try {
        const { error: reportError } = await supabase.functions.invoke("generate-report", {
          body: { session_id: session.id },
        });
        if (reportError) console.error("Report generation error:", reportError);
      } catch (e) {
        console.error("Report generation exception:", e);
      }
    }

    navigate(`/interview/${slug}/complete/${token}`);
  };

  // Keep endInterviewRef in sync
  useEffect(() => {
    endInterviewRef.current = endInterview;
  });

  // Keep handleSendResponseRef in sync
  useEffect(() => {
    handleSendResponseRef.current = handleSendResponse;
  });

  // Spacebar shortcut to validate the answer (same conditions as the "Ma réponse est terminée" button)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (isPaused || interviewFinished || isSpeaking || isProcessing || !isListening) return;
      const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
      if (!hasVoice) return;
      e.preventDefault();
      handleSendResponseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPaused, interviewFinished, isSpeaking, isProcessing, isListening, liveTranscript]);

  // Auto-skip 3s: when listening and no speech for 3s, show countdown then auto-send
  const clearAutoSkip = useCallback(() => {
    if (autoSkipTimerRef.current) {
      clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    if (autoSkipCountdownRef.current) {
      clearInterval(autoSkipCountdownRef.current);
      autoSkipCountdownRef.current = null;
    }
    setAutoSkipCountdown(null);
  }, []);

  const startAutoSkipTimer = useCallback(() => {
    if (!project?.auto_skip_silence) return;
    clearAutoSkip();
    // After 3s of silence, start a 3s countdown then auto-send
    autoSkipTimerRef.current = setTimeout(() => {
      let remaining = 3;
      setAutoSkipCountdown(remaining);
      autoSkipCountdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearAutoSkip();
          // Auto-send response
          handleSendResponseRef.current?.();
        } else {
          setAutoSkipCountdown(remaining);
        }
      }, 1000);
    }, 3000);
  }, [project?.auto_skip_silence, clearAutoSkip]);

  // Reset auto-skip when candidate speaks
  useEffect(() => {
    if (liveTranscript && isListening) {
      clearAutoSkip();
      // Restart timer for next silence window
      startAutoSkipTimer();
    }
  }, [liveTranscript, isListening, clearAutoSkip, startAutoSkipTimer]);

  // Start auto-skip timer when listening starts, clear when it stops
  useEffect(() => {
    if (isListening && !isSpeaking && !isProcessing) {
      startAutoSkipTimer();
    } else {
      clearAutoSkip();
    }
  }, [isListening, isSpeaking, isProcessing, startAutoSkipTimer, clearAutoSkip]);

  // Reset silence timer on candidate speech activity
  useEffect(() => {
    if (liveTranscript) {
      resetSilenceTimer();
    }
  }, [liveTranscript, resetSilenceTimer]);

  // Also reset silence timer when AI speaks or processing
  useEffect(() => {
    if (isSpeaking || isProcessing) {
      resetSilenceTimer();
    }
  }, [isSpeaking, isProcessing, resetSilenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (playbackWatchdogRef.current) clearTimeout(playbackWatchdogRef.current);
      if (manualContinueTimerRef.current) clearTimeout(manualContinueTimerRef.current);
      clearAutoSkip();
    };
  }, [stopListening, clearAutoSkip]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  // Show "ready to start" screen — user must click to enable TTS on mobile
  if (!readyToStart) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-6">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, hsl(var(--l-accent) / 0.4), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--l-accent) / 0.2), hsl(var(--l-accent-2) / 0.2))",
                }}
              >
                <Mic className="h-10 w-10" style={{ color: "hsl(var(--l-accent))" }} />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-xl font-bold candidate-gradient-text">Prêt à démarrer ?</h1>
              <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
                Soyez naturel.le et souriez vous êtes filmé.e !
              </p>
            </div>
            <Button size="lg" className="candidate-btn-primary w-full h-16 text-xl" onClick={beginInterview}>
              <Volume2 className="mr-2 !h-6 !w-6" />
              Lancer l'entretien
            </Button>
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout minimal>
      <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 flex flex-col min-h-[calc(100vh-4rem)]">
        {/* ── Header sticky : indicateur sauvegarde uniquement ── */}
        {backgroundSaving > 0 && (
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-2 -mx-2 sm:-mx-4 px-2 sm:px-4 flex justify-end">
            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
              Sauvegarde…
            </span>
          </div>
        )}

        {(() => {
          const currentQ = questions[currentQuestionIndex];
          const questionType: "written" | "audio" | "video" = currentQ?.video_url
            ? "video"
            : currentQ?.audio_url
              ? "audio"
              : "written";
          return (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center py-6 sm:py-8 pb-32 sm:pb-24">
              {/* ── Colonne gauche : Avatar IA (2/3 desktop) ── */}
              <div className="lg:col-span-2">
                {questionType === "video" && currentQ?.video_url ? (
                  <div className="relative w-full mx-auto max-w-3xl">
                    <QuestionMediaPlayer
                      ref={featuredPlayerRef}
                      type="video"
                      content={currentQ.content}
                      videoUrl={currentQ.video_url}
                      variant="featured"
                      autoPlay={shouldAutoPlay}
                      onPlaybackEnd={() => {
                        if (isPausedRef.current) {
                          console.log("[InterviewStart] onPlaybackEnd (video) ignored — paused");
                          return;
                        }
                        console.log("[InterviewStart] onPlaybackEnd (video) fired");
                        forceStartListening();
                      }}
                    />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium z-10">
                      {project?.ai_persona_name || "Marie"} — IA
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full max-w-[200px] sm:max-w-none aspect-square mx-auto lg:max-h-[70vh]">
                    {/* Halo respirant quand IA parle */}
                    {isSpeaking && <div className="candidate-avatar-halo" aria-hidden="true" />}
                    <div
                      className={`relative w-full h-full rounded-3xl overflow-hidden transition-all ${
                        isSpeaking
                          ? "ring-2 ring-offset-4 shadow-2xl"
                          : isListening
                            ? "ring-1 candidate-avatar-ring-listening"
                            : "ring-1 shadow-lg"
                      }`}
                      style={{
                        ["--tw-ring-color" as string]: isSpeaking
                          ? "hsl(var(--l-accent) / 0.6)"
                          : isListening
                            ? "hsl(160 84% 50% / 0.5)"
                            : "hsl(var(--l-border))",
                        ["--tw-ring-offset-color" as string]: "hsl(var(--l-bg))",
                      } as React.CSSProperties}
                    >
                      <img
                        src={project?.avatar_image_url || defaultAiAvatar}
                        alt={project?.ai_persona_name || "IA"}
                        className={`w-full h-full object-cover transition-transform duration-700 ${isSpeaking ? "scale-105" : "scale-100"}`}
                      />
                      {isSpeaking && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6 flex items-end justify-center gap-1.5">
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-7 sm:h-10 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "100ms" }} />
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "200ms" }} />
                          <span className="h-8 sm:h-12 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "400ms" }} />
                        </div>
                      )}
                      <div
                        className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 rounded text-xs font-medium backdrop-blur-md"
                        style={{ background: "hsl(var(--l-bg) / 0.6)", color: "hsl(var(--l-fg))" }}
                      >
                        {project?.ai_persona_name || "Marie"} — IA
                      </div>
                    </div>
                  </div>
                )}
                {!interviewFinished && !isProcessing && currentQuestionIndex < questions.length - 1 && (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={handleSkipQuestion}
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Passer la question
                    </button>
                  </div>
                )}
              </div>

              {/* ── Colonne droite : Question + état + CTA (1/3 desktop) ── */}
              <div className="lg:col-span-1 flex flex-col justify-center gap-4 sm:gap-5">
                {/* Question text (for written/audio) */}
                {currentQ && questionType !== "video" && (
                  <QuestionMediaPlayer
                    ref={featuredPlayerRef}
                    type={questionType}
                    content={currentQ.content}
                    audioUrl={currentQ.audio_url}
                    variant="featured"
                    autoPlay={shouldAutoPlay}
                    onPlaybackEnd={() => {
                      if (isPausedRef.current) {
                        console.log("[InterviewStart] onPlaybackEnd (audio/text) ignored — paused");
                        return;
                      }
                      console.log("[InterviewStart] onPlaybackEnd (audio/text) fired");
                      forceStartListening();
                    }}
                  />
                )}

                {/* For video questions, also show the question content as text */}
                {currentQ && questionType === "video" && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                      {currentQ.content}
                    </p>
                  </div>
                )}

                {/* Auto-skip countdown */}
                {autoSkipCountdown !== null && (
                  <div className="flex items-center justify-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-warning">{autoSkipCountdown}</span>
                    </div>
                    <span className="text-xs text-warning font-medium">Passage auto dans {autoSkipCountdown}s...</span>
                  </div>
                )}

                {/* Bandeau d'état */}
                {(() => {
                  if (interviewFinished) return null;
                  const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
                  const showBigCta = isListening && !isSpeaking && !isProcessing && !hasVoice;

                  if (showBigCta) {
                    return (
                      <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/15 px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className="relative flex h-9 w-9 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40" />
                            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/30">
                              <Mic className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300">
                            🎙️ À vous !
                          </span>
                        </div>
                        {currentQuestionIndex < 2 && (
                          <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                            Le bouton apparaîtra dès que je vous entendrai.
                          </p>
                        )}
                      </div>
                    );
                  }

                  // État "listening" : on fusionne le vu-mètre et le bouton dans une seule carte
                  if (isListening && !isProcessing && !isSpeaking && !interviewFinished) {
                    const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
                    return (
                      <div
                        className="rounded-2xl border p-3 sm:p-4 space-y-3 shadow-lg"
                        style={{
                          borderColor: "hsl(var(--l-border))",
                          background: "hsl(var(--l-bg-elev))",
                        }}
                      >
                        <div className="flex items-center justify-center py-2">
                          <MicVolumeMeter stream={streamRef.current} active={isListening} />
                        </div>
                        <div className="h-px" style={{ background: "hsl(var(--l-border))" }} />
                        <Button
                          className={`w-full h-16 px-6 text-lg sm:text-xl font-semibold rounded-2xl transition-all ${
                            hasVoice
                              ? "candidate-btn-primary hover:scale-[1.02] animate-pulse"
                              : ""
                          }`}
                          style={
                            !hasVoice
                              ? {
                                  background: "hsl(var(--l-bg-elev-2))",
                                  color: "hsl(var(--l-fg) / 0.4)",
                                  cursor: "not-allowed",
                                }
                              : undefined
                          }
                          onClick={handleSendResponse}
                          disabled={!hasVoice}
                        >
                          {hasVoice ? (
                            <span className="inline-flex items-center gap-3">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                                <CheckCircle2 className="!h-5 !w-5" />
                              </span>
                              Ma réponse est terminée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Mic className="!h-5 !w-5" />
                              Parlez pour répondre…
                            </span>
                          )}
                        </Button>
                        {hasVoice && (
                          <p className="text-xs text-center" style={{ color: "hsl(var(--l-fg) / 0.5)" }}>
                            ou appuyer sur la barre d'espace du clavier
                          </p>
                        )}
                        {currentQuestionIndex < 2 && hasVoice && (
                          <p className="text-[11px] text-muted-foreground text-center inline-flex items-center justify-center gap-1 w-full">
                            <MousePointerClick className="h-3 w-3" />
                            Cliquez dès que vous avez terminé.
                          </p>
                        )}
                      </div>
                    );
                  }


                  return (
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg border px-3 py-2.5 text-center text-xs sm:text-sm font-medium transition-colors ${
                          isProcessing
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : isSpeaking
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                            Analyse de votre réponse…
                          </span>
                        ) : isSpeaking ? (
                          <span className="inline-flex items-center gap-2">
                            <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                            L'IA pose la question…
                          </span>
                        ) : (
                          <span>Préparation…</span>
                        )}
                      </div>
                      {/* Bouton manuel de secours si la transition tarde */}
                      {showManualContinue && !isListening && !isProcessing && (
                        <button
                          type="button"
                          onClick={forceStartListening}
                          className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors py-1"
                        >
                          La question ne se lance pas ? Continuer →
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* CTA "Terminer l'entretien" si fini */}
                {interviewFinished && (
                  <div className="flex flex-col items-center gap-2">
                    <Button className="w-full h-16 text-lg rounded-2xl" size="lg" variant="destructive" onClick={endInterview}>
                      Terminer l'entretien
                    </Button>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

        {/* ── Footer : progression + Arrêter l'entretien ── */}
        {!interviewFinished && (
          <div className="border-t border-border/50 py-3 sm:py-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground shrink-0">
                Question {currentQuestionIndex + 1} / {questions.length}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEndDialog(true)}
                className="gap-2 text-muted-foreground hover:text-destructive"
              >
                <PhoneOff className="h-4 w-4" />
                Arrêter l'entretien
              </Button>
              {project?.allow_pause && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={pauseInterview}
                  className="gap-2 text-muted-foreground"
                  style={{ color: "hsl(var(--l-fg) / 0.6)" }}
                >
                  <Pause className="h-4 w-4" />
                  Mettre en pause
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── PIP retour vidéo candidat (fixe en bas-gauche) ── */}
      <div className="fixed bottom-4 left-4 z-50 flex items-end gap-2">
        {showSelfView ? (
          <div className="relative rounded-xl overflow-hidden bg-black border-2 border-emerald-500/40 shadow-2xl w-[140px] h-[100px] sm:w-[160px] sm:h-[115px]">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute top-1 right-1 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded text-[9px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              REC
            </div>
            <button
              type="button"
              onClick={() => setShowSelfView(false)}
              className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
              aria-label="Masquer mon retour vidéo"
              title="Masquer mon retour vidéo"
            >
              <EyeOff className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <>
            {/* Hidden video keeps stream alive even when masqué */}
            <video ref={videoRef} muted playsInline className="hidden" style={{ transform: "scaleX(-1)" }} />
            <button
              type="button"
              onClick={() => setShowSelfView(true)}
              className="flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur border border-border shadow-lg px-3 py-1.5 text-xs font-medium hover:bg-background transition-colors"
              aria-label="Afficher mon retour vidéo"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Eye className="h-3.5 w-3.5" />
              Afficher ma vidéo
            </button>
          </>
        )}
      </div>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer l'entretien ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir mettre fin à l'entretien ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Continuer
            </Button>
            <Button variant="destructive" onClick={endInterview}>
              Terminer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPaused && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md"
          style={{ background: "hsl(var(--l-bg) / 0.85)" }}
        >
          <p
            className="mb-4 text-sm font-medium uppercase tracking-widest candidate-gradient-text"
          >
            En pause
          </p>
          <Button
            onClick={resumeInterview}
            className="candidate-btn-primary h-20 px-12 text-xl font-semibold rounded-2xl hover:scale-[1.03] transition-transform"
          >
            <Play className="!h-6 !w-6 mr-3" />
            REPRENDRE
          </Button>
          <p
            className="mt-6 text-sm text-center max-w-sm px-6"
            style={{ color: "hsl(var(--l-fg) / 0.6)" }}
          >
            {pausedDuringQuestionRef.current
              ? "La question sera rejouée depuis le début à la reprise."
              : "Cliquez pour reprendre exactement où vous vous êtes arrêté(e)."}
          </p>
        </div>
      )}
    </CandidateLayout>
  );
}
