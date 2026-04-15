import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User, Volume2, VolumeX } from "lucide-react";
import QuestionMediaPlayer, { type QuestionMediaPlayerHandle } from "@/components/interview/QuestionMediaPlayer";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import defaultAiAvatar from "@/assets/ai-avatar-marie.png";
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
  type ChatMessage = { role: string; content: string; mediaType?: "written" | "audio" | "video"; mediaUrl?: string | null };
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
  const recognitionRef = useRef<any>(null);
  const candidateTranscriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const interviewStartTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoEndTriggeredRef = useRef(false);
  const questionVideoChunksRef = useRef<Blob[]>([]);
  const questionRecorderRef = useRef<MediaRecorder | null>(null);
  const allQuestionVideosRef = useRef<{ index: number; url: string }[]>([]);

  // Helper: persist a single message to DB immediately
  const persistMessage = useCallback(async (
    sessionId: string,
    role: "ai" | "candidate",
    content: string,
    options?: { questionId?: string | null; videoSegmentUrl?: string | null }
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
  }, []);

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

  // TTS: speak text aloud
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!ttsEnabled || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      utterance.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v =>
        v.lang.startsWith("fr") && /female|femme|amelie|marie|thomas/i.test(v.name) === false &&
        /amelie|audrey|marie|céline|léa|sophie|virginie|siri.*female|google.*fr/i.test(v.name)
      ) || voices.find(v =>
        v.lang.startsWith("fr") && (/female/i.test(v.name) || v.name.toLowerCase().includes("amelie") || v.name.toLowerCase().includes("audrey"))
      ) || voices.find(v => v.lang.startsWith("fr"));
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, [ttsEnabled]);

  // Play question media (audio_url or video_url) if available, otherwise use TTS
  const speakOrPlayQuestion = useCallback(async (text: string, question?: any) => {
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
  }, [playMediaUrl, speak]);

  // STT: start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Erreur", description: "La reconnaissance vocale n'est pas supportée par ce navigateur.", variant: "destructive" });
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
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening
      if (isListening && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, toast]);

  // STT: stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Load session data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", token)
        .limit(1);
      const sess = sessions?.[0];
      if (!sess) { navigate(`/interview/${slug}`); return; }

      setSession(sess);
      const { data: proj } = await supabase.from("projects").select("*").eq("id", sess.project_id).single();
      setProject(proj);
      const { data: qs } = await supabase.from("questions").select("*").eq("project_id", sess.project_id).order("order_index");
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
      toast({ title: "Caméra inaccessible", description: "Veuillez autoriser l'accès à la caméra.", variant: "destructive" });
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
  const stopAndUploadQuestionVideo = useCallback(async (sessionId: string, questionIndex: number): Promise<string | null> => {
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
      if (uploadError) { console.error("Question video upload error:", uploadError); return null; }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e) {
      console.error("Question video upload exception:", e);
      return null;
    }
  }, []);

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
    supabase.from("sessions").update({ status: "in_progress" as any, started_at: new Date().toISOString() }).eq("id", session.id);

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
    const firstQMediaType: "written" | "audio" | "video" = q0?.video_url ? "video" : q0?.audio_url ? "audio" : "written";
    const firstQMediaUrl = q0?.video_url || q0?.audio_url || null;
    const isFirstQMedia = firstQMediaType !== "written";

    const greeting = isFirstQMedia
      ? `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. ${firstQMediaType === "video" ? "Regardez" : "Écoutez"} la première question.`
      : `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. Commençons avec la première question : ${questions[0].content}`;

    const aiMsg = { role: "assistant" as const, content: greeting };
    const chatMsg: ChatMessage = { role: "ai", content: greeting, mediaType: firstQMediaType, mediaUrl: firstQMediaUrl };
    setMessages([chatMsg]);
    messagesRef.current = [chatMsg];
    setAiMessages([aiMsg]);

    // Persist greeting to DB immediately
    try {
      await persistMessage(session.id, "ai", greeting);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le début de l'entretien.", variant: "destructive" });
    }

    // Speak the greeting via TTS, then play question media if audio/video
    await speak(greeting);
    if (isFirstQMedia) {
      setIsSpeaking(true);
      await playMediaUrl(firstQMediaUrl!);
      setIsSpeaking(false);
    }
    // Start recording video for question 1
    startQuestionRecording();
    startListening();
  };

  // Send candidate response to AI
  const handleSendResponse = async () => {
    stopListening();
    const transcript = candidateTranscriptRef.current.trim() || liveTranscript.trim();

    if (!transcript) {
      toast({ title: "Aucune réponse", description: "Veuillez parler avant d'envoyer votre réponse.", variant: "destructive" });
      startListening();
      return;
    }

    // Stop question video recording and upload in background
    const questionIdx = currentQuestionIndex;
    let questionVideoUrl: string | null = null;
    if (session?.id) {
      questionVideoUrl = await stopAndUploadQuestionVideo(session.id, questionIdx);
    }

    // Add candidate message to UI
    setMessages((prev) => {
      const updated = [...prev, { role: "candidate", content: transcript }];
      messagesRef.current = updated;
      return updated;
    });

    if (session?.id) {
      try {
        await persistMessage(session.id, "candidate", transcript, {
          questionId: questions[questionIdx]?.id || null,
          videoSegmentUrl: questionVideoUrl,
        });

        if (questionVideoUrl && !session.video_recording_url) {
          const { error: sessionVideoError } = await supabase
            .from("sessions")
            .update({ video_recording_url: questionVideoUrl })
            .eq("id", session.id);

          if (!sessionVideoError) {
            setSession((prev: any) => prev ? { ...prev, video_recording_url: questionVideoUrl } : prev);
          }
        }
      } catch {
        toast({ title: "Erreur", description: "Impossible d'enregistrer votre réponse.", variant: "destructive" });
        startQuestionRecording();
        startListening();
        return;
      }
    }

    setLiveTranscript("");
    candidateTranscriptRef.current = "";

    // Build conversation history for AI
    const updatedAiMessages: { role: "user" | "assistant"; content: string }[] = [
      ...aiMessages,
      { role: "user" as const, content: transcript },
    ];
    setAiMessages(updatedAiMessages);

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-conversation-turn", {
        body: {
          messages: updatedAiMessages,
          projectContext: {
            aiPersonaName: project?.ai_persona_name ?? "Marie",
            jobTitle: project?.job_title ?? "",
            questions: questions.map(q => ({
              content: q.content,
              type: q.type,
              mediaType: q.video_url ? "video" : q.audio_url ? "audio" : "written",
            })),
            currentQuestionNumber: currentQuestionIndex + 1,
            totalQuestions: questions.length,
          },
        },
      });

      if (error) throw error;

      const aiResponse = data.message;

      // Determine next question media info
      const nextQIdx = currentQuestionIndex + 1;
      const nextQ = nextQIdx < questions.length ? questions[nextQIdx] : undefined;
      const nMediaType: "written" | "audio" | "video" = nextQ?.video_url ? "video" : nextQ?.audio_url ? "audio" : "written";
      const nMediaUrl = nextQ?.video_url || nextQ?.audio_url || null;

      // Add AI message with media info
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: aiResponse, mediaType: nMediaType, mediaUrl: nMediaUrl }];
        messagesRef.current = updated;
        return updated;
      });
      // Persist AI response immediately
      if (session?.id) {
        try {
          await persistMessage(session.id, "ai", aiResponse);
        } catch {
          toast({ title: "Erreur", description: "Impossible d'enregistrer la réponse de l'IA.", variant: "destructive" });
        }
      }
      setAiMessages((prev) => [...prev, { role: "assistant" as const, content: aiResponse }]);

      // Check if interview is over
      const isOver = aiResponse.toLowerCase().includes("terminé") && currentQuestionIndex >= questions.length - 1;

      if (isOver) {
        setInterviewFinished(true);
      }

      // Advance question counter
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }

      setIsProcessing(false);

      // Speak AI transition via TTS, then play next question media directly if audio/video
      await speak(aiResponse);
      if (nextQ && (nextQ.audio_url || nextQ.video_url)) {
        setIsSpeaking(true);
        await playMediaUrl(nextQ.video_url || nextQ.audio_url);
        setIsSpeaking(false);
      }
      if (!isOver) {
        startQuestionRecording();
        startListening();
      }
    } catch (e: any) {
      console.error("AI conversation error:", e);
      setIsProcessing(false);
      toast({ title: "Erreur", description: "Impossible de contacter l'IA. Veuillez réessayer.", variant: "destructive" });
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
      streamRef.current?.getTracks().forEach(t => t.stop());

      // Messages already persisted in real-time — no batch save needed

      // Calculate duration
      const durationSeconds = interviewStartTimeRef.current
        ? Math.round((Date.now() - interviewStartTimeRef.current) / 1000)
        : null;

      // Update session status to completed
      await supabase.from("sessions").update({
        status: "completed" as any,
        completed_at: new Date().toISOString(),
        ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
      }).eq("id", session.id);

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

    navigate(`/interview/${slug}/complete`);
  };

  // Keep endInterviewRef in sync
  useEffect(() => {
    endInterviewRef.current = endInterview;
  });

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
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    };
  }, [stopListening]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  // Show "ready to start" screen — user must click to enable TTS on mobile
  if (!readyToStart) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Mic className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Prêt à démarrer ?</h1>
              <p className="text-muted-foreground text-sm">
                L'entretien va commencer avec {project?.ai_persona_name || "l'IA"}. 
                Assurez-vous que votre micro et vos haut-parleurs fonctionnent.
              </p>
            </div>
            <Button size="lg" className="w-full" onClick={beginInterview}>
              <Volume2 className="mr-2 h-5 w-5" />
              Lancer l'entretien
            </Button>
            <p className="text-xs text-muted-foreground">
              L'IA vous parlera et écoutera vos réponses en temps réel.
            </p>
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout minimal>
      <div className="mx-auto w-full max-w-5xl px-2 sm:px-4">
        {/* Header: progress */}
        <div className="mb-2 sm:mb-4 flex items-center justify-between">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2">
            {isSpeaking && <span className="flex items-center gap-1 text-xs text-primary"><Volume2 className="h-3 w-3 animate-pulse" /> L'IA parle...</span>}
            {isListening && !isSpeaking && <span className="flex items-center gap-1 text-xs text-destructive"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Écoute en cours</span>}
          </div>
        </div>
        <div className="mb-4 sm:mb-6 h-1.5 sm:h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Mobile: stacked layout / Desktop: side-by-side */}
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 sm:gap-6">

          {/* Videos section */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
            {/* Mobile: AI avatar + candidate side by side / Desktop: stacked */}
            <div className="flex gap-3 lg:flex-col lg:gap-4">
              {/* AI Avatar */}
              <div className={`relative flex-1 lg:flex-none lg:w-full aspect-square rounded-xl overflow-hidden transition-all ${isSpeaking ? "ring-4 ring-primary/50 ring-offset-2 ring-offset-background" : "ring-1 ring-border"}`}>
                <img
                  src={project?.avatar_image_url || defaultAiAvatar}
                  alt={project?.ai_persona_name || "IA"}
                  className="w-full h-full object-cover"
                />
                {isSpeaking && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-3 flex items-end justify-center gap-1">
                    <span className="h-3 sm:h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-5 sm:h-6 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "100ms" }} />
                    <span className="h-3 sm:h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "200ms" }} />
                    <span className="h-5 sm:h-7 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="h-3 sm:h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "400ms" }} />
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/50 text-white px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs font-medium">
                  {project?.ai_persona_name || "Marie"} — IA
                </div>
              </div>

              {/* Candidate video preview */}
              <div className="relative flex-1 lg:flex-none lg:w-full aspect-video rounded-lg bg-muted overflow-hidden ring-1 ring-border">
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-destructive-foreground animate-pulse" />
                  REC
                </div>
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/50 text-white px-1.5 py-0.5 sm:px-2 rounded text-[10px] sm:text-xs">
                  Vous
                </div>
              </div>
            </div>

            {/* Sound toggle + processing */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTtsEnabled(!ttsEnabled)} className="text-xs text-muted-foreground flex-1">
                {ttsEnabled ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
                {ttsEnabled ? "Son activé" : "Son coupé"}
              </Button>
              {isProcessing && (
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </div>

          {/* Conversation + controls */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            {/* 0) Fixed "Question en cours" zone */}
            {questions[currentQuestionIndex] && (
              <div className="mb-3 sm:mb-4">
                <QuestionMediaPlayer
                  type={
                    questions[currentQuestionIndex].video_url ? "video"
                    : questions[currentQuestionIndex].audio_url ? "audio"
                    : "written"
                  }
                  content={questions[currentQuestionIndex].content}
                  audioUrl={questions[currentQuestionIndex].audio_url}
                  videoUrl={questions[currentQuestionIndex].video_url}
                  variant="featured"
                />
              </div>
            )}

            {/* 1) Conversation history */}
            <Card className="mb-3 sm:mb-4 flex-1 min-h-0">
              <CardContent className="p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto space-y-2 sm:space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${m.role === "ai" ? "bg-primary/5" : "bg-muted ml-4 sm:ml-8"}`}>
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                      {m.role === "ai" ? `🤖 ${project?.ai_persona_name}` : "👤 Vous"}
                    </span>
                    {m.role === "ai" && m.mediaType && m.mediaType !== "written" ? (
                      <div className="mt-1.5">
                        <QuestionMediaPlayer
                          type={m.mediaType}
                          content={m.content}
                          audioUrl={m.mediaType === "audio" ? m.mediaUrl : undefined}
                          videoUrl={m.mediaType === "video" ? m.mediaUrl : undefined}
                          variant="inline"
                        />
                      </div>
                    ) : (
                      <p className="mt-0.5 sm:mt-1">{m.content}</p>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* 2) Live transcript */}
            {isListening && liveTranscript && (
              <div className="p-2 sm:p-3 rounded-lg text-xs sm:text-sm bg-muted/50 border border-dashed border-muted-foreground/30 mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">👤 Vous (en cours...)</span>
                <p className="mt-0.5 sm:mt-1 text-muted-foreground italic">{liveTranscript}</p>
              </div>
            )}

            {/* 3) Action buttons */}
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              {interviewFinished ? (
                <Button className="w-full max-w-sm" size="lg" variant="destructive" onClick={endInterview}>
                  Terminer l'entretien
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full max-w-sm h-12 sm:h-14 text-sm sm:text-base"
                    size="lg"
                    onClick={handleSendResponse}
                    disabled={isProcessing || isSpeaking || (!liveTranscript && !candidateTranscriptRef.current)}
                  >
                    {isProcessing ? "Analyse en cours..." : "Envoyer ma réponse"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant={isListening ? "default" : "outline"}
                      size="icon"
                      onClick={() => isListening ? stopListening() : startListening()}
                      disabled={isSpeaking || isProcessing}
                    >
                      {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setShowEndDialog(true)}>
                      <PhoneOff className="h-5 w-5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Terminer l'entretien ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir mettre fin à l'entretien ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>Continuer</Button>
            <Button variant="destructive" onClick={endInterview}>Terminer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CandidateLayout>
  );
}
