import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryClient";
import {
  NonverbalProfileCard,
  type NonverbalAnalysis,
} from "./NonverbalProfileCard";

interface Props {
  analysis?: NonverbalAnalysis | null;
  sessionId: string;
  onGoToMessage?: (id: string, startSeconds?: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  running: "Analyse corporelle en cours…",
  rate_limited: "Trop de requêtes vers l'IA. Réessayez dans quelques minutes.",
  no_credits:
    "Crédits IA épuisés. Ajoutez des crédits dans Workspace → Usage pour relancer l'analyse.",
  failed: "L'analyse corporelle a échoué. Réessayez ci-dessous.",
  skipped: "Analyse corporelle non disponible pour cette session.",
};

export function NonverbalTabContent({ analysis, sessionId, onGoToMessage }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  if (analysis?.profile) {
    return <NonverbalProfileCard analysis={analysis} onGoToMessage={onGoToMessage} />;
  }

  const status = (analysis as any)?.status as string | undefined;
  const isRunning = status === "running";
  const canRetry = !isRunning && status !== "skipped";

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-nonverbal", {
        body: { session_id: sessionId, force: true },
      });
      if (error) throw error;
      toast({ title: "Analyse relancée — patientez 1 à 3 minutes." });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      }, 30000);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible de relancer l'analyse.",
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        <p>
          {status
            ? STATUS_LABELS[status] ?? "Analyse corporelle non disponible."
            : "Analyse corporelle non disponible. Elle nécessite des réponses vidéo et peut prendre quelques minutes après la fin de l'entretien."}
        </p>
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Relancer l'analyse
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
