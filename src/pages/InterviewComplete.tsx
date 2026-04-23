import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import CandidateLayout from "@/components/CandidateLayout";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COMPLETION_MESSAGE = "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.";
const POLL_INTERVAL_MS = 2000;
const PROCESSING_TIMEOUT_MS = 60_000;

export default function InterviewComplete() {
  const { token } = useParams();
  const [message, setMessage] = useState<string>(DEFAULT_COMPLETION_MESSAGE);
  const [processing, setProcessing] = useState(true);
  const cancelledRef = useRef(false);

  // Load completion message from project (independent of processing state)
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("project_id")
        .eq("token", token)
        .maybeSingle();
      if (!session?.project_id) return;
      const { data: project } = await supabase
        .from("projects")
        .select("completion_message")
        .eq("id", session.project_id)
        .maybeSingle();
      const cm = (project as { completion_message?: string | null } | null)?.completion_message;
      if (cm && cm.trim()) setMessage(cm);
    })();
  }, [token]);

  // Poll session status until completed (or safety timeout)
  useEffect(() => {
    if (!token) {
      setProcessing(false);
      return;
    }
    cancelledRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkStatus = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("status")
        .eq("token", token)
        .maybeSingle();
      if (cancelledRef.current) return;
      if (data?.status === "completed") {
        setProcessing(false);
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    // Check immediately, then poll
    checkStatus();
    intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);

    // Safety: after 60s, show final screen anyway (server keeps processing)
    timeoutId = setTimeout(() => {
      if (!cancelledRef.current) setProcessing(false);
      if (intervalId) clearInterval(intervalId);
    }, PROCESSING_TIMEOUT_MS);

    return () => {
      cancelledRef.current = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [token]);

  return (
    <CandidateLayout>
      <div className="animate-fade-in">
        <Card className="max-w-md w-full text-center overflow-hidden">
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)), hsl(var(--l-accent)))",
            }}
          />
          <CardContent className="py-14 space-y-6">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center animate-scale-in">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: "hsl(var(--l-accent))" }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--l-accent) / 0.25), hsl(var(--l-accent-2) / 0.25))",
                  boxShadow: "0 12px 32px -8px hsl(var(--l-accent) / 0.5)",
                }}
              >
                {processing ? (
                  <Loader2
                    className="h-10 w-10 animate-spin"
                    style={{ color: "hsl(var(--l-accent))" }}
                  />
                ) : (
                  <CheckCircle className="h-10 w-10" style={{ color: "hsl(var(--l-accent))" }} />
                )}
              </div>
            </div>

            {processing ? (
              <div className="space-y-2 animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight candidate-gradient-text">
                  Enregistrement de votre session…
                </h1>
                <p className="text-base leading-relaxed" style={{ color: "hsl(var(--l-fg) / 0.75)" }}>
                  Merci de patienter quelques secondes, ne fermez pas cette page.
                </p>
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight candidate-gradient-text">
                  Session terminée, merci !
                </h1>
                <p className="text-base leading-relaxed" style={{ color: "hsl(var(--l-fg) / 0.75)" }}>
                  {message}
                </p>
              </div>
            )}

            {!processing && (
              <div
                className="flex items-center justify-center gap-2 text-sm animate-fade-in"
                style={{ color: "hsl(var(--l-fg) / 0.45)" }}
              >
                <Sparkles className="h-4 w-4" />
                <span>À très vite.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CandidateLayout>
  );
}
