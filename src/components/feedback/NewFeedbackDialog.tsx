import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewFeedbackDialog() {
  const { user } = useAuth();
  const { organizationId } = useOrgRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setLoading(true);

    const { data: thread, error: threadErr } = await supabase
      .from("feedback_threads")
      .insert({ user_id: user.id, organization_id: organizationId, subject: subject.trim() })
      .select()
      .single();

    if (threadErr || !thread) {
      toast.error("Impossible de créer le feedback");
      setLoading(false);
      return;
    }

    const { error: msgErr } = await supabase.from("feedback_messages").insert({
      thread_id: thread.id,
      author_id: user.id,
      author_role: "user",
      content: message.trim(),
    });

    setLoading(false);

    if (msgErr) {
      toast.error("Impossible d'envoyer le message");
      return;
    }

    toast.success("Feedback envoyé");
    setOpen(false);
    setSubject("");
    setMessage("");
    navigate(`/feedback/${thread.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nouveau feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Décrivez en quelques mots"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Détaillez votre retour…"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !subject.trim() || !message.trim()}>
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
