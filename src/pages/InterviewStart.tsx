import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const candidateTranscriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
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

  // Generate and speak initial greeting
  useEffect(() => {
    if (loading || !session || !project || questions.length === 0) return;

    const greeting = `Bonjour ${session.candidate_name}, je suis ${project.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${project.job_title}. Commençons avec la première question : ${questions[0].content}`;

    const aiMsg = { role: "assistant" as const, content: greeting };
    setMessages([{ role: "ai", content: greeting }]);
    setAiMessages([aiMsg]);

    // Speak the greeting, then start listening
    speak(greeting).then(() => {
      startListening();
    });
  }, [loading, session, project, questions]);

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
    setMessages((prev) => [...prev, { role: "candidate", content: transcript }]);
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
      setMessages((prev) => [...prev, { role: "ai", content: aiResponse }]);
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

  const endInterview = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    navigate(`/interview/${slug}/complete`);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
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
            <div className={`relative w-48 h-64 rounded-xl bg-muted flex items-center justify-center overflow-hidden transition-all ${isSpeaking ? "ring-4 ring-primary/50 ring-offset-2" : ""}`}>
              {project?.avatar_image_url ? (
                <img src={project.avatar_image_url} alt={project.ai_persona_name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-20 w-20 text-muted-foreground" />
              )}
              {isSpeaking && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  <span className="h-3 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-4 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "100ms" }} />
                  <span className="h-3 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "200ms" }} />
                  <span className="h-5 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="h-3 w-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "400ms" }} />
                </div>
              )}
            </div>
            <p className="text-sm font-medium">{project?.ai_persona_name} — IA Recruteuse</p>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className="text-xs text-muted-foreground"
            >
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

          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex-1 mb-4">
              <CardContent className="p-4 max-h-96 overflow-y-auto space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-lg text-sm ${m.role === "ai" ? "bg-primary/5" : "bg-muted ml-8"}`}>
                    <span className="text-xs font-medium text-muted-foreground">
                      {m.role === "ai" ? `🤖 ${project?.ai_persona_name}` : "👤 Vous"}
                    </span>
                    <p className="mt-1">{m.content}</p>
                  </div>
                ))}

                {/* Live transcript preview */}
                {isListening && liveTranscript && (
                  <div className="p-3 rounded-lg text-sm bg-muted/50 ml-8 border border-dashed border-muted-foreground/30">
                    <span className="text-xs font-medium text-muted-foreground">👤 Vous (en cours...)</span>
                    <p className="mt-1 text-muted-foreground italic">{liveTranscript}</p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              {interviewFinished ? (
                <Button className="flex-1" variant="destructive" onClick={endInterview}>
                  Terminer l'entretien
                </Button>
              ) : (
                <>
                  <Button
                    variant={isListening ? "default" : "outline"}
                    size="icon"
                    onClick={() => isListening ? stopListening() : startListening()}
                    disabled={isSpeaking || isProcessing}
                  >
                    {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSendResponse}
                    disabled={isProcessing || isSpeaking || (!liveTranscript && !candidateTranscriptRef.current)}
                  >
                    {isProcessing ? "Analyse en cours..." : "Envoyer ma réponse"}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => setShowEndDialog(true)}>
                    <PhoneOff className="h-5 w-5" />
                  </Button>
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
    </div>
  );
}
