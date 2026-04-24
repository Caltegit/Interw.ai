import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  message: z.string().trim().max(1000).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DemoRequestDialog({ open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, message: message || undefined });
    if (!parsed.success) {
      toast({
        title: "Vérifiez votre saisie",
        description: parsed.error.errors[0]?.message ?? "Champs invalides",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `demo-request-${parsed.data.email.toLowerCase()}-${Date.now()}`;
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "demo-request",
          idempotencyKey,
          replyTo: parsed.data.email,
          templateData: {
            email: parsed.data.email,
            message: parsed.data.message ?? "",
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Demande envoyée 🎉",
        description: "Nous revenons vers vous très vite.",
      });
      setEmail("");
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      console.error("Demo request error:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande. Réessayez ou écrivez-nous à hello@interw.ai.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une démo</DialogTitle>
          <DialogDescription>Laissez-nous votre email et nous vous recontactons sous 24h.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-email">Votre email *</Label>
            <Input
              id="demo-email"
              type="email"
              required
              autoFocus
              placeholder="vous@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-message">Message (optionnel)</Label>
            <Textarea
              id="demo-message"
              placeholder="Quelques mots sur votre besoin…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              rows={3}
              maxLength={1000}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi…
              </>
            ) : (
              "Envoyer la demande"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
