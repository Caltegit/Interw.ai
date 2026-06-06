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
import { FileText, FileSignature, Upload, Trash2, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  candidateName?: string | null;
  initialJobTitle?: string | null;
  initialLinkedinUrl?: string | null;
  initialCvUrl?: string | null;
  initialCvFilename?: string | null;
  initialCoverLetterUrl?: string | null;
  initialCoverLetterFilename?: string | null;
  onSaved?: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = [".pdf", ".doc", ".docx"];

type FileSlotProps = {
  label: string;
  icon: React.ReactNode;
  storedUrl: string | null;
  storedFilename: string | null;
  pendingFile: File | null;
  remove: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  storagePrefix: string;
};

function FileSlot({
  label,
  icon,
  storedFilename,
  pendingFile,
  remove,
  onPick,
  onRemove,
}: Omit<FileSlotProps, "storedUrl" | "storagePrefix">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const validate = (file: File): string | null => {
    const lower = file.name.toLowerCase();
    if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
      return "Format non supporté. Utilisez PDF, DOC ou DOCX.";
    }
    if (file.size > MAX_SIZE) {
      return "Fichier trop volumineux (max 10 Mo).";
    }
    return null;
  };

  const handle = useCallback((file: File) => {
    const error = validate(file);
    if (error) {
      toast.error(error);
      return;
    }
    onPick(file);
  }, [onPick]);

  const currentLabel = pendingFile?.name ?? (remove ? null : storedFilename);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handle(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-sm transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
        )}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <span className="text-center text-muted-foreground text-xs">
          Glissez un fichier ou cliquez — PDF, DOC, DOCX, 10 Mo max
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handle(file);
            e.target.value = "";
          }}
        />
      </div>
      {currentLabel && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-primary">{icon}</span>
            <span className="truncate">{currentLabel}</span>
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
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function CandidateLinksDialog({
  open,
  onOpenChange,
  sessionId,
  candidateName,
  initialJobTitle,
  initialLinkedinUrl,
  initialCvUrl,
  initialCvFilename,
  initialCoverLetterUrl,
  initialCoverLetterFilename,
  onSaved,
}: Props) {
  const [jobTitle, setJobTitle] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [cvPending, setCvPending] = useState<File | null>(null);
  const [cvRemove, setCvRemove] = useState(false);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFilename, setCoverFilename] = useState<string | null>(null);
  const [coverPending, setCoverPending] = useState<File | null>(null);
  const [coverRemove, setCoverRemove] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setJobTitle(initialJobTitle ?? "");
      setLinkedin(initialLinkedinUrl ?? "");
      setCvUrl(initialCvUrl ?? null);
      setCvFilename(initialCvFilename ?? null);
      setCvPending(null);
      setCvRemove(false);
      setCoverUrl(initialCoverLetterUrl ?? null);
      setCoverFilename(initialCoverLetterFilename ?? null);
      setCoverPending(null);
      setCoverRemove(false);
    }
  }, [open, initialJobTitle, initialLinkedinUrl, initialCvUrl, initialCvFilename, initialCoverLetterUrl, initialCoverLetterFilename]);

  const uploadOne = async (file: File, prefix: string) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${sessionId}/${prefix}${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("candidate-cvs")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    return path;
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
      if (cvRemove) {
        newCvUrl = null;
        newCvFilename = null;
      }
      if (cvPending) {
        newCvUrl = await uploadOne(cvPending, "");
        newCvFilename = cvPending.name;
      }

      let newCoverUrl: string | null = coverUrl;
      let newCoverFilename: string | null = coverFilename;
      if (coverRemove) {
        newCoverUrl = null;
        newCoverFilename = null;
      }
      if (coverPending) {
        newCoverUrl = await uploadOne(coverPending, "cover-letters/");
        newCoverFilename = coverPending.name;
      }

      const { error: updErr } = await supabase
        .from("sessions")
        .update({
          candidate_job_title: jobTitle.trim() || null,
          candidate_linkedin_url: linkedin.trim() || null,
          candidate_cv_url: newCvUrl,
          candidate_cv_filename: newCvFilename,
          candidate_cover_letter_url: newCoverUrl,
          candidate_cover_letter_filename: newCoverFilename,
        } as never)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Informations candidat</DialogTitle>
          <DialogDescription>
            Renseignez le poste, le profil LinkedIn, le CV et la lettre de motivation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="job-title">Poste</Label>
            <Input
              id="job-title"
              placeholder="Intitulé du poste visé"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={200}
            />
          </div>

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

          <FileSlot
            label="CV"
            icon={<FileText className="h-4 w-4" />}
            storedFilename={cvFilename}
            pendingFile={cvPending}
            remove={cvRemove}
            onPick={(f) => {
              setCvPending(f);
              setCvRemove(false);
            }}
            onRemove={() => {
              if (cvPending) setCvPending(null);
              else setCvRemove(true);
            }}
          />

          <FileSlot
            label="Lettre de motivation"
            icon={<FileSignature className="h-4 w-4" />}
            storedFilename={coverFilename}
            pendingFile={coverPending}
            remove={coverRemove}
            onPick={(f) => {
              setCoverPending(f);
              setCoverRemove(false);
            }}
            onRemove={() => {
              if (coverPending) setCoverPending(null);
              else setCoverRemove(true);
            }}
          />
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
