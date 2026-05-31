import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Copy, KeyRound, Share2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string | null;
  shareExpiresAt: string | null;
  isGenerating?: boolean;
  onGenerate: () => Promise<void> | void;
}

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function ShareReportDialog({
  open,
  onOpenChange,
  shareUrl,
  shareExpiresAt,
  isGenerating,
  onGenerate,
}: ShareReportDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Lien copié" });
    setTimeout(() => setCopied(false), 2000);
  };

  const expiryLabel = formatExpiry(shareExpiresAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Partager ce rapport
          </DialogTitle>
          <DialogDescription>
            Toute personne disposant de ce lien pourra consulter le rapport.
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" size="sm" onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            {expiryLabel && (
              <p className="text-xs text-muted-foreground">
                Lien valable jusqu'au <strong>{expiryLabel}</strong> (48 h).
              </p>
            )}
          </div>
        ) : (
          <div>
            <Button onClick={() => onGenerate()} disabled={isGenerating} className="w-full">
              <Share2 className="h-4 w-4" />
              {isGenerating ? "Génération…" : "Générer le lien de partage"}
            </Button>
          </div>
        )}

        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs space-y-2">
          <div className="flex items-start gap-2 text-warning-foreground">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Validité limitée à 48 h</p>
              <p className="text-muted-foreground">
                Le lien expirera automatiquement passé ce délai.
              </p>
              <p className="text-muted-foreground mt-1 flex items-start gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <span><span className="font-semibold text-foreground">Lien à usage unique</span> : il se verrouille sur le premier navigateur qui l'ouvre et expire automatiquement.</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-warning-foreground border-t border-warning/20 pt-2">
            <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Conformité RGPD</p>
              <p className="text-muted-foreground">
                Ne rendez jamais cette session publique. Réservez ce lien aux personnes strictement
                impliquées dans la décision de recrutement (équipe RH, manager). Le candidat n'a pas
                consenti à une diffusion plus large.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
