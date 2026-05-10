import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";

export interface CandidateRecipient {
  id: string;
  candidate_name: string | null;
  candidate_email: string | null;
}

interface CandidateMessageTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES: CandidateMessageTemplate[] = [
  {
    key: "candidate-refusal",
    label: "Refus",
    subject: "Refus",
    body:
      "Bonjour {firstName},\n\nMerci pour l'échange digital, nous avons apprécié découvrir votre profil.\n\nCependant, après analyse de votre candidature, nous ne donnerons pas suite pour ce poste.\n\nCela ne remet évidement pas en cause la qualité de votre profil, l'océan des opportunités est vaste et nous vous souhaitons plein de belles choses pour la suite.\n\nL'équipe de recrutement",
  },
  {
    key: "candidate-new-interview",
    label: "Nouvel entretien",
    subject: "Nouvel entretien",
    body:
      "Bonjour {firstName},\n\nSuite à votre premier échange, nous souhaiterions vous proposer un nouvel entretien.\n\nPouvez-vous nous indiquer vos disponibilités sur les prochains jours ?\n\nÀ bientôt,\n\nL'équipe de recrutement",
  },
  {
    key: "candidate-more-info",
    label: "Infos complémentaires",
    subject: "Infos complémentaires",
    body:
      "Bonjour {firstName},\n\nPour finaliser l'étude de votre candidature, nous aurions besoin de quelques informations complémentaires.\n\nPouvez-vous nous répondre dès que possible ?\n\nÀ bientôt,\n\nL'équipe de recrutement",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: CandidateRecipient[];
  projectTitle: string;
  onSent?: () => void;
}

const firstNameOf = (full?: string | null) => {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
};

export function BulkEmailDialog({ open, onOpenChange, recipients, projectTitle, onSent }: Props) {
  const { toast } = useToast();
  const { organizationId } = useOrgRole();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CandidateMessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedKey, setSelectedKey] = useState<string>(DEFAULT_TEMPLATES[0].key);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [allowReply, setAllowReply] = useState(false);
  const [replyTo, setReplyTo] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  useEffect(() => {
    if (open && user?.email) setReplyTo(user.email);
  }, [open, user?.email]);

  // Charger les overrides de l'orga
  useEffect(() => {
    if (!open || !organizationId) return;
    (async () => {
      const { data } = await supabase
        .from("candidate_message_templates")
        .select("key, subject, body")
        .eq("organization_id", organizationId);
      if (data && data.length > 0) {
        const merged = DEFAULT_TEMPLATES.map((t) => {
          const ov = data.find((d: any) => d.key === t.key);
          return ov ? { ...t, subject: ov.subject, body: ov.body } : t;
        });
        setTemplates(merged);
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    })();
  }, [open, organizationId]);

  // Initialiser / réinitialiser le contenu quand on ouvre / change de template
  useEffect(() => {
    if (!open) return;
    const t = templates.find((x) => x.key === selectedKey) ?? templates[0];
    if (!t) return;
    setSubject(`${t.subject} - ${projectTitle}`);
    setBody(t.body);
    setDirty(false);
    setSaveAsDefault(false);
  }, [open, selectedKey, templates, projectTitle]);

  const validRecipients = recipients.filter((r) => !!r.candidate_email);
  const skipped = recipients.length - validRecipients.length;

  const handleSend = async () => {
    if (validRecipients.length === 0) {
      toast({
        title: "Aucun destinataire",
        description: "Aucun candidat sélectionné n'a d'email.",
        variant: "destructive",
      });
      return;
    }
    const replyToTrimmed = replyTo.trim();
    if (allowReply && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToTrimmed)) {
      toast({ title: "Adresse de réponse invalide", variant: "destructive" });
      return;
    }
    setSending(true);
    const results = await Promise.allSettled(
      validRecipients.map((r) => {
        const firstName = firstNameOf(r.candidate_name);
        const personalizedBody = body.replace(/\{firstName\}/g, firstName).replace(/Bonjour ,/g, "Bonjour,");
        return supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "bulk-candidate-message",
            recipientEmail: r.candidate_email,
            idempotencyKey: `bulk-${selectedKey}-${r.id}-${Date.now()}`,
            templateData: {
              subject,
              body: personalizedBody,
              firstName,
            },
            ...(allowReply ? { replyTo: replyToTrimmed } : {}),
          },
        });
      })
    );
    setSending(false);
    const failed = results.filter(
      (r) => r.status === "rejected" || (r as any).value?.error
    ).length;
    const ok = results.length - failed;
    const successIds = validRecipients
      .filter((_, i) => {
        const r = results[i];
        return r.status === "fulfilled" && !(r as any).value?.error;
      })
      .map((r) => r.id);
    if (successIds.length > 0) {
      await supabase
        .from("sessions")
        .update({ last_candidate_email_key: selectedKey })
        .in("id", successIds);
    }
    if (saveAsDefault && organizationId && ok > 0) {
      const suffix = ` - ${projectTitle}`;
      const rawSubject = subject.endsWith(suffix) ? subject.slice(0, -suffix.length) : subject;
      const { error: saveError } = await supabase
        .from("candidate_message_templates")
        .upsert(
          {
            organization_id: organizationId,
            key: selectedKey,
            subject: rawSubject,
            body,
          },
          { onConflict: "organization_id,key" }
        );
      if (saveError) {
        console.error("save_template_failed", saveError);
      } else {
        setTemplates((prev) =>
          prev.map((t) => (t.key === selectedKey ? { ...t, subject: rawSubject, body } : t))
        );
      }
    }
    if (failed === 0) {
      toast({ title: `Email envoyé à ${ok} candidat(s)` });
    } else {
      toast({
        title: `Envoi partiel : ${ok} succès, ${failed} échec(s)`,
        variant: "destructive",
      });
    }
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer un email aux candidats sélectionnés</DialogTitle>
          <DialogDescription>
            {validRecipients.length} destinataire(s)
            {skipped > 0 ? ` — ${skipped} ignoré(s) (sans email)` : ""} · expéditeur :
            noreply@interw.ai
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Modèle</Label>
            <Select
              value={selectedKey}
              onValueChange={(v) => {
                if (
                  dirty &&
                  !confirm("Vos modifications seront perdues. Continuer ?")
                ) {
                  return;
                }
                setSelectedKey(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Objet</Label>
            <Input
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk-allow-reply" className="cursor-pointer">
                Autoriser une réponse
              </Label>
              <Switch
                id="bulk-allow-reply"
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
            <p className="text-xs text-muted-foreground">
              Utilisez {"{firstName}"} pour insérer le prénom du candidat.
            </p>
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
              rows={10}
            />
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="bulk-save-default"
                checked={saveAsDefault}
                onCheckedChange={(v) => setSaveAsDefault(v === true)}
              />
              <Label htmlFor="bulk-save-default" className="cursor-pointer text-sm font-normal">
                Garder ce texte en mémoire pour les prochains messages
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || validRecipients.length === 0}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Envoyer ({validRecipients.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
