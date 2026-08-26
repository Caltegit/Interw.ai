import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const makeSchema = (invalidEmail: string) =>
  z.object({
    email: z.string().trim().email(invalidEmail).max(255),
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
  const { t } = useTranslation("landing");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = makeSchema(t("demoDialog.invalidEmail")).safeParse({ email, message: message || undefined });
    if (!parsed.success) {
      toast({
        title: t("demoDialog.invalidTitle"),
        description: parsed.error.errors[0]?.message ?? t("demoDialog.invalidFields"),
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
        title: t("demoDialog.successTitle"),
        description: t("demoDialog.successDescription"),
      });
      setEmail("");
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      console.error("Demo request error:", err);
      toast({
        title: t("demoDialog.errorTitle"),
        description: t("demoDialog.errorDescription"),
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
          <DialogTitle>{t("demoDialog.title")}</DialogTitle>
          <DialogDescription>{t("demoDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-email">{t("demoDialog.emailLabel")}</Label>
            <Input
              id="demo-email"
              type="email"
              required
              autoFocus
              placeholder={t("demoDialog.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-message">{t("demoDialog.messageLabel")}</Label>
            <Textarea
              id="demo-message"
              placeholder={t("demoDialog.messagePlaceholder")}
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
                {t("demoDialog.sending")}
              </>
            ) : (
              t("demoDialog.submit")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
