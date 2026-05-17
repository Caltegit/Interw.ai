import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  initialLinkedinUrl?: string | null;
  initialCvUrl?: string | null;
  initialCvFilename?: string | null;
  onSaved?: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = [".pdf", ".doc", ".docx"];

export function CandidateLinksDialog({
  open,
  onOpenChange,
  sessionId,
  initialLinkedinUrl,
  initialCvUrl,
  initialCvFilename,
  onSaved,
}: Props) {
  const [linkedin, setLinkedin] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeCv, setRemoveCv] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLinkedin(initialLinkedinUrl ?? "");
      setCvUrl(initialCvUrl ?? null);
      setCvFilename(initialCvFilename ?? null);
      setPendingFile(null);
      setRemoveCv(false);
    }
  }, [open, initialLinkedinUrl, initialCvUrl, initialCvFilename]);

  const validateFile = (file: File): string | null => {
    const lower = file.name.toLowerCase();
    if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
      return "Format non supporté. Utilisez PDF, DOC ou DOCX.";
    }
    if (file.size > MAX_SIZE) {
      return "Fichier trop volumineux (max 10 Mo).";
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setPendingFile(file);
    setRemoveCv(false);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (linkedin.trim() && !/^https?:\/\//i.test(linkedin.trim())) {
      toast.error("L'URL LinkedIn doit commencer par http:// ou https://");
      return;
    }

    setSaving(true);
    try {
      let newCvUrl: string | null = cvUrl;
      let newCvFilename: string | null = cvFilename;

      if (removeCv) {
        newCvUrl = null;
        newCvFilename = null;
      }

      if (pendingFile) {
        const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${sessionId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("candidate-cvs")
          .upload(path, pendingFile, { upsert: false, contentType: pendingFile.type });
        if (upErr) throw upErr;
        newCvUrl = path;
        newCvFilename = pendingFile.name;
      }

      const { error: updErr } = await supabase
        .from("sessions")
        .update({
          candidate_linkedin_url: linkedin.trim() || null,
          candidate_cv_url: newCvUrl,
          candidate_cv_filename: newCvFilename,
        })
        .eq("id", sessionId);
      if (updErr) throw updErr;

      toast.success("Informations enregistrées");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const currentCvLabel = pendingFile?.name ?? (removeCv ? null : cvFilename);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>LinkedIn et CV du candidat</DialogTitle>
          <DialogDescription>
            Ajoutez le profil LinkedIn et déposez le CV du candidat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="linkedin-url">Profil LinkedIn</Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>CV</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-center text-muted-foreground">
                Glissez un fichier ici ou cliquez pour parcourir
              </span>
              <span className="text-xs text-muted-foreground">PDF, DOC, DOCX — 10 Mo max</span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            {currentCvLabel && (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{currentCvLabel}</span>
                  {pendingFile && (
                    <span className="shrink-0 text-xs text-muted-foreground">(à enregistrer)</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pendingFile) {
                      setPendingFile(null);
                    } else {
                      setRemoveCv(true);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
