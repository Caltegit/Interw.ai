import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import defaultAiAvatar from "@/assets/ai-avatar.jpg";

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
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const interviewStartTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoEndTriggeredRef = useRef(false);

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

  // TTS: speak text aloud
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!ttsEnabled || !window.speechSynthesis) {
        resolve();
        return;
      }
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Try to pick a French voice
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, [ttsEnabled]);

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

  // Start video recording
  const startVideoRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000); // collect chunks every second
    } catch (err) {
      console.error("Camera access error:", err);
      toast({ title: "Caméra inaccessible", description: "Veuillez autoriser l'accès à la caméra.", variant: "destructive" });
    }
  }, [toast]);

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

    // Start recording video
    await startVideoRecording();

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

    const greeting = `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. Commençons avec la première question : ${questions[0].content}`;

    const aiMsg = { role: "assistant" as const, content: greeting };
    setMessages([{ role: "ai", content: greeting }]);
    messagesRef.current = [{ role: "ai", content: greeting }];
    setAiMessages([aiMsg]);

    // Speak the greeting (now in user gesture context — works on mobile)
    await speak(greeting);
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

    // Add candidate message to UI
    setMessages((prev) => {
      const updated = [...prev, { role: "candidate", content: transcript }];
      messagesRef.current = updated;
      return updated;
    });
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
            aiPersonaName: project?.ai_persona_name ?? "Sophie",
            jobTitle: project?.job_title ?? "",
            questions: questions.map(q => ({ content: q.content, type: q.type })),
            currentQuestionNumber: currentQuestionIndex + 1,
            totalQuestions: questions.length,
          },
        },
      });

      if (error) throw error;

      const aiResponse = data.message;

      // Add AI message
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: aiResponse }];
        messagesRef.current = updated;
        return updated;
      });
      setAiMessages((prev) => [...prev, { role: "assistant" as const, content: aiResponse }]);

      // Check if interview is over (AI says "terminé" in response)
      const isOver = aiResponse.toLowerCase().includes("terminé") && currentQuestionIndex >= questions.length - 1;

      if (isOver) {
        setInterviewFinished(true);
      }

      // Advance question counter
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }

      setIsProcessing(false);

      // Speak AI response, then resume listening
      await speak(aiResponse);
      if (!isOver) {
        startListening();
      }
    } catch (e: any) {
      console.error("AI conversation error:", e);
      setIsProcessing(false);
      toast({ title: "Erreur", description: "Impossible de contacter l'IA. Veuillez réessayer.", variant: "destructive" });
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
      // Stop video recording and upload
      let videoUrl: string | null = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        await new Promise<void>((resolve) => {
          mediaRecorderRef.current!.onstop = () => resolve();
          mediaRecorderRef.current!.stop();
        });

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const fileName = `interviews/${session.id}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("media")
            .upload(fileName, blob, { contentType: "video/webm", upsert: true });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
            videoUrl = urlData.publicUrl;
          }
        }
      }

      // Stop camera stream
      streamRef.current?.getTracks().forEach(t => t.stop());

      // Save all messages to session_messages — use ref to avoid stale closure
      const currentMessages = messagesRef.current;
      const messagesToSave = currentMessages.map((m) => ({
        session_id: session.id,
        role: m.role === "ai" ? "ai" as const : "candidate" as const,
        content: m.content,
        question_id: null,
        is_follow_up: false,
      }));

      if (messagesToSave.length > 0) {
        const { error: msgError } = await supabase.from("session_messages").insert(messagesToSave);
        if (msgError) {
          console.error("Failed to save messages:", msgError);
        }
      }

      // Calculate duration
      const durationSeconds = interviewStartTimeRef.current
        ? Math.round((Date.now() - interviewStartTimeRef.current) / 1000)
        : null;

      // Update session status to completed with video URL
      await supabase.from("sessions").update({
        status: "completed" as any,
        completed_at: new Date().toISOString(),
        ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
        ...(videoUrl ? { video_recording_url: videoUrl } : {}),
      }).eq("id", session.id);

      // Trigger report generation — AWAIT to ensure it completes before navigation
      if (messagesToSave.length > 0) {
        try {
          const { error: reportError } = await supabase.functions.invoke("generate-report", {
            body: { session_id: session.id },
          });
          if (reportError) console.error("Report generation error:", reportError);
        } catch (e) {
          console.error("Report generation exception:", e);
        }
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2">
            {isSpeaking && <span className="flex items-center gap-1 text-xs text-primary"><Volume2 className="h-3 w-3 animate-pulse" /> L'IA parle...</span>}
            {isListening && !isSpeaking && <span className="flex items-center gap-1 text-xs text-destructive"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Écoute en cours</span>}
          </div>
        </div>
        <div className="mb-6 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 flex flex-col items-center gap-4">
            {/* AI Avatar - large display */}
            <div className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all ${isSpeaking ? "ring-4 ring-primary/50 ring-offset-2 ring-offset-background" : "ring-1 ring-border"}`}>
              <img
                src={project?.avatar_image_url || defaultAiAvatar}
                alt={project?.ai_persona_name || "IA"}
                className="w-full h-full object-cover"
              />
              {isSpeaking && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-end justify-center gap-1">
                  <span className="h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-6 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "100ms" }} />
                  <span className="h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "200ms" }} />
                  <span className="h-7 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="h-4 w-1 rounded-full bg-white animate-bounce" style={{ animationDelay: "400ms" }} />
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-medium">
                {project?.ai_persona_name || "Sophie"} — IA
              </div>
            </div>

            {/* Candidate video preview - small pip */}
            <div className="relative w-full aspect-video rounded-lg bg-muted overflow-hidden ring-1 ring-border">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover mirror" style={{ transform: "scaleX(-1)" }} />
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-2 py-0.5 rounded text-xs">
                <span className="h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
                REC
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
                Vous
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setTtsEnabled(!ttsEnabled)} className="text-xs text-muted-foreground flex-1">
                {ttsEnabled ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
                {ttsEnabled ? "Son activé" : "Son coupé"}
              </Button>
            </div>

            {isProcessing && (
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>

          <div className="lg:col-span-3 flex flex-col justify-center">
            {/* Action button - centered */}
            <div className="flex flex-col items-center gap-4 mb-6">
              {interviewFinished ? (
                <Button className="w-full max-w-sm" size="lg" variant="destructive" onClick={endInterview}>
                  Terminer l'entretien
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full max-w-sm h-14 text-base"
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

            {/* Live transcript preview */}
            {isListening && liveTranscript && (
              <div className="p-3 rounded-lg text-sm bg-muted/50 border border-dashed border-muted-foreground/30 mb-4">
                <span className="text-xs font-medium text-muted-foreground">👤 Vous (en cours...)</span>
                <p className="mt-1 text-muted-foreground italic">{liveTranscript}</p>
              </div>
            )}

            {/* Conversation history - scrollable below */}
            <Card>
              <CardContent className="p-4 max-h-48 overflow-y-auto space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-lg text-sm ${m.role === "ai" ? "bg-primary/5" : "bg-muted ml-8"}`}>
                    <span className="text-xs font-medium text-muted-foreground">
                      {m.role === "ai" ? `🤖 ${project?.ai_persona_name}` : "👤 Vous"}
                    </span>
                    <p className="mt-1">{m.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>
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
    </div>
  );
}
