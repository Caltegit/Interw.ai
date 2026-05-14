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
import { Switch } from "@/components/ui/switch";
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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [allowReply, setAllowReply] = useState(true);
  const [replyTo, setReplyTo] = useState("");
  const [fromName, setFromName] = useState("");

  useEffect(() => {
    if (!open) return;
    if (user?.email) setReplyTo(user.email);
    const defaultName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "";
    setFromName(defaultName);
  }, [open, user?.email, profile?.full_name]);

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
        const score = r.score != null ? `${Math.round(r.score)} sur 100` : "—";
        return `${i + 1}) ${r.name} - ${score}\n${r.url ?? "(lien indisponible)"}`;
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

  const handleSend = async () => {
    const emails = recipientEmail
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emails.length === 0 || emails.some((e) => !emailRegex.test(e))) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }
    const replyToTrimmed = replyTo.trim();
    if (allowReply && !emailRegex.test(replyToTrimmed)) {
      toast({ title: "Adresse de réponse invalide", variant: "destructive" });
      return;
    }
    const fromNameTrimmed = fromName.trim().slice(0, 60);
    if (!fromNameTrimmed) {
      toast({ title: "Nom de l'expéditeur requis", variant: "destructive" });
      return;
    }
    setSending(true);
    const stamp = Date.now();
    const results = await Promise.allSettled(
      emails.map((email) =>
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "bulk-candidate-message",
            recipientEmail: email,
            idempotencyKey: `share-reports-${stamp}-${email}`,
            templateData: { subject, body, firstName: "" },
            fromName: fromNameTrimmed,
            ...(allowReply ? { replyTo: replyToTrimmed } : {}),
          },
        }),
      ),
    );
    setSending(false);
    const failed = results.filter(
      (r) => r.status === "rejected" || (r as any).value?.error,
    ).length;
    const ok = results.length - failed;
    if (failed === 0) {
      toast({ title: `Email envoyé à ${ok} destinataire(s)` });
      onOpenChange(false);
    } else {
      toast({
        title: `Envoi partiel : ${ok} succès, ${failed} échec(s)`,
        variant: "destructive",
      });
    }
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
              <Label>Nom de l'expéditeur</Label>
              <Input
                value={fromName}
                onChange={(e) => setFromName(e.target.value.slice(0, 60))}
                placeholder="Votre nom"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Affiché dans la boîte de réception : « {fromName.trim() || "—"} &lt;noreply@interw.ai&gt; ».
              </p>
            </div>
            <div className="space-y-1">
              <Label>Destinataires</Label>
              <Input
                type="text"
                placeholder="prenom.nom@exemple.com, autre@exemple.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Séparez plusieurs adresses par une virgule.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Objet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-reply" className="cursor-pointer">
                  Autoriser une réponse
                </Label>
                <Switch
                  id="allow-reply"
                  checked={allowReply}
                  onCheckedChange={setAllowReply}
                />
              </div>
              {allowReply && (
                <Input
                  type="email"
                  placeholder="prenom.nom@exemple.com"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                />
              )}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Fermer
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={loading || sending}>
            <Copy className="mr-2 h-4 w-4" /> Copier le texte
          </Button>
          <Button onClick={handleSend} disabled={loading || sending || !recipientEmail.trim()}>
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" /> Envoyer</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
