import { useRef, useState } from "react";
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
import { Plus, ImagePlus, X } from "lucide-react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function NewFeedbackDialog() {
  const { user } = useAuth();
  const { organizationId } = useOrgRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickImage = (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Format non supporté (JPG, PNG ou WEBP)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setSubject("");
    setMessage("");
    removeImage();
  };

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    setLoading(true);

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("feedback-attachments")
        .upload(path, imageFile, { contentType: imageFile.type });
      if (upErr) {
        toast.error("Échec de l'envoi de l'image");
        setLoading(false);
        return;
      }
      const { data: pub } = supabase.storage.from("feedback-attachments").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

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

    const content = imageUrl ? `${message.trim()}\n\n${imageUrl}` : message.trim();

    const { error: msgErr } = await supabase.from("feedback_messages").insert({
      thread_id: thread.id,
      author_id: user.id,
      author_role: "user",
      content,
    });

    setLoading(false);

    if (msgErr) {
      toast.error("Impossible d'envoyer le message");
      return;
    }

    toast.success("Feedback envoyé");
    setOpen(false);
    reset();
    navigate(`/feedback/${thread.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
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
          <div className="space-y-2">
            <Label>Image (optionnel)</Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="max-h-40 rounded-md border"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <ImagePlus className="h-4 w-4" />
                Ajouter une image
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !subject.trim() || !message.trim()}>
            {loading ? "Envoi…" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
