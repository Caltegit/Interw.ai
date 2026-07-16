import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles } from "lucide-react";
import { useReportJobStatus } from "@/hooks/queries/useSessionDetail";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | undefined;
  /** Horodatage ISO d'ouverture ; sert à ignorer un ancien job déjà terminé. */
  startedAt: string | null;
}

const TIMEOUT_MS = 3 * 60 * 1000;

export function RegenerateReportDialog({ open, onOpenChange, sessionId, startedAt }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const openedAtRef = useRef<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const finishedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now();
      setTimedOut(false);
      finishedRef.current = false;
      setNow(Date.now());
    }
  }, [open, startedAt]);

  // Tick pour animer la barre de progression
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open]);

  const { data: job } = useReportJobStatus(sessionId, {
    enabled: open,
    sinceIso: startedAt,
  });

  // Timeout de sécurité
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [open, startedAt]);

  // Fin de job → toast + refetch + fermeture
  useEffect(() => {
    if (!open || !job || finishedRef.current) return;
    const openedAt = openedAtRef.current ?? 0;
    const jobUpdatedAt = job.completed_at || job.updated_at;
    // Ignore un job déjà terminé AVANT l'ouverture (statut résiduel).
    if (
      (job.status === "done" || job.status === "failed" || job.status === "cancelled") &&
      jobUpdatedAt &&
      new Date(jobUpdatedAt).getTime() < openedAt - 2000
    ) {
      return;
    }
    if (job.status === "done") {
      finishedRef.current = true;
      if (sessionId) qc.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      toast({ title: "Rapport mis à jour." });
      onOpenChange(false);
    } else if (job.status === "failed") {
      finishedRef.current = true;
      toast({
        title: "Échec de la régénération",
        description: job.last_error || "Réessayez dans un instant.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  }, [job, open, sessionId, qc, toast, onOpenChange]);

  // Timeout → fermer avec info
  useEffect(() => {
    if (!open || !timedOut || finishedRef.current) return;
    finishedRef.current = true;
    toast({
      title: "Régénération plus longue que prévu",
      description: "Elle se poursuit en arrière-plan. Rafraîchissez la page dans une minute.",
    });
    onOpenChange(false);
  }, [timedOut, open, onOpenChange, toast]);

  const stage = useMemo(() => {
    if (!job) return { label: "Envoi de la demande…", detail: "Préparation du job." };
    if (job.status === "processing") {
      return { label: "Analyse en cours…", detail: "L'IA relit l'entretien et reconstruit la matrice." };
    }
    if (job.status === "queued") {
      return { label: "En file d'attente…", detail: "Le worker prend la main dans quelques secondes." };
    }
    return { label: "Finalisation…", detail: "Presque terminé." };
  }, [job]);

  // Progression estimée : asymptotique vers 95% sur ~60s, puis rampe lente jusqu'à 99%.
  const progress = useMemo(() => {
    const openedAt = openedAtRef.current ?? now;
    const elapsed = Math.max(0, now - openedAt) / 1000; // secondes
    // 1 - exp(-t/T) donne 63% à T=25s, ~95% à 75s
    const base = 1 - Math.exp(-elapsed / 25);
    const pct = Math.min(99, Math.round(base * 95 + Math.min(4, elapsed / 30)));
    return pct;
  }, [now]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Empêche la fermeture par échap / clic extérieur : on force le passage
        // par le bouton "Continuer en arrière-plan".
        if (!next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Régénération du rapport en cours
          </DialogTitle>
          <DialogDescription>Cela prend en général 30 à 60 secondes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{stage.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
              {job?.attempts && job.attempts > 1 ? (
                <p className="mt-1 text-xs text-muted-foreground">Tentative {job.attempts}.</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Progress value={progress} className="h-2" />
            <p className="text-right text-xs tabular-nums text-muted-foreground">{progress}%</p>
          </div>
        </div>


        <DialogFooter className="sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fermer et continuer en arrière-plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
