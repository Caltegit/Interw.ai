import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function InterviewStart() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

      if (qs && qs.length > 0) {
        const greeting = `Bonjour ${sess.candidate_name}, je suis ${proj?.ai_persona_name ?? "l'IA"}. Bienvenue pour cet entretien pour le poste de ${proj?.job_title}. Commençons avec la première question : ${qs[0].content}`;
        setMessages([{ role: "ai", content: greeting }]);
      }
    };
    load();
  }, [token, slug, navigate]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(5000);
      setIsRecording(true);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'accéder au microphone.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  const simulateResponse = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        setCurrentQuestionIndex(nextIndex);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Merci pour votre réponse. Question suivante : ${questions[nextIndex].content}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Merci beaucoup pour vos réponses. Toutes les questions ont été posées. Vous pouvez terminer l'entretien quand vous êtes prêt." },
        ]);
        setInterviewFinished(true);
      }
      setIsProcessing(false);
    }, 1500);
  };

  const handleSendResponse = () => {
    setMessages((prev) => [...prev, { role: "candidate", content: "[Réponse audio enregistrée]" }]);
    simulateResponse();
  };

  const endInterview = () => {
    stopRecording();
    navigate(`/interview/${slug}/complete`);
  };

  useEffect(() => {
    if (!loading && session) startRecording();
    return () => stopRecording();
  }, [loading]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2">
            {isRecording && <span className="flex items-center gap-1 text-xs text-destructive"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Enregistrement</span>}
          </div>
        </div>
        <div className="mb-6 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 flex flex-col items-center gap-4">
            <div className="relative w-48 h-64 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
              {project?.avatar_image_url ? (
                <img src={project.avatar_image_url} alt={project.ai_persona_name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-20 w-20 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium">{project?.ai_persona_name} — IA Recruteuse</p>
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
              </CardContent>
            </Card>

            <div className="flex gap-2">
              {interviewFinished ? (
                <Button className="flex-1" variant="destructive" onClick={endInterview}>
                  Terminer l'entretien
                </Button>
              ) : (
                <>
                  <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button className="flex-1" onClick={handleSendResponse} disabled={isProcessing}>
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
