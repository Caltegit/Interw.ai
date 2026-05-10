import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Loader2, Mail } from "lucide-react";

export interface ShareReportRecipient {
  sessionId: string;
  name: string;
  score: number | null;
  reportId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: ShareReportRecipient[];
  projectTitle: string;
  skippedCount?: number;
}

export function ShareReportsDialog({
  open,
  onOpenChange,
  recipients,
  projectTitle,
  skippedCount = 0,
}: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sorted = [...recipients].sort(
        (a, b) => (b.score ?? -1) - (a.score ?? -1),
      );
      const links = await Promise.all(
        sorted.map(async (r) => {
          const { data: existing } = await supabase
            .from("report_shares")
            .select("share_token")
            .eq("report_id", r.reportId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();
          let token = existing?.share_token ?? null;
          if (!token) {
            const { data: created } = await supabase
              .from("report_shares")
              .insert({ report_id: r.reportId, created_by: user.id })
              .select("share_token")
              .single();
            token = created?.share_token ?? null;
          }
          return { ...r, url: token ? `${window.location.origin}/shared-report/${token}` : null };
        }),
      );
      if (cancelled) return;
      const lines = links.map((r, i) => {
        const score = r.score != null ? `${r.score.toFixed(1)}/10` : "—";
        return `${i + 1}) ${r.name} - Score IA : ${score} - ${r.url ?? "(lien indisponible)"}`;
      });
      const text =
        `Bonjour,\n\nVoici les candidats intéressants à regarder :\n\n` +
        lines.join("\n\n") +
        `\n\nN'hésite pas à me faire un retour.\n\nMerci,`;
      setSubject(`Rapports candidats - ${projectTitle}`);
      setBody(text);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, recipients, projectTitle]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast({ title: "Texte copié" });
    } catch {
      toast({ title: "Échec de la copie", variant: "destructive" });
    }
  };

  const handleMailto = () => {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Partager les rapports</DialogTitle>
          <DialogDescription>
            {recipients.length} rapport(s)
            {skippedCount > 0 ? ` — ${skippedCount} ignoré(s) (rapport non disponible)` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Préparation des liens…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Objet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="font-mono text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={loading}>
            <Copy className="mr-2 h-4 w-4" /> Copier le texte
          </Button>
          <Button onClick={handleMailto} disabled={loading}>
            <Mail className="mr-2 h-4 w-4" /> Ouvrir dans ma messagerie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
