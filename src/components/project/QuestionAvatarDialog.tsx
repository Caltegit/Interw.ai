import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { AvatarPicker } from "./AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuestionAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Avatar actuellement défini sur la question (null = utilise celui du projet) */
  currentAvatarUrl: string | null;
  /** Avatar du projet, utilisé en repli */
  projectAvatarUrl: string | null;
  /** Renvoie l'URL retenue pour cette question (null = utiliser l'avatar du projet) */
  onConfirm: (url: string | null) => void;
}

export function QuestionAvatarDialog({
  open,
  onOpenChange,
  currentAvatarUrl,
  projectAvatarUrl,
  onConfirm,
}: QuestionAvatarDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setValue(currentAvatarUrl);
  }, [open, currentAvatarUrl]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `question-avatars/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      setValue(urlData.publicUrl);
    } catch (err) {
      toast({
        title: "Échec du téléversement",
        description: err instanceof Error ? err.message : "Réessayez.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToProject = () => {
    setValue(null);
  };

  const handleValidate = () => {
    onConfirm(value);
    onOpenChange(false);
  };

  // Pour l'aperçu dans AvatarPicker, on montre l'avatar effectif
  const displayValue = value ?? projectAvatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avatar de la question</DialogTitle>
          <DialogDescription>
            Choisissez un avatar spécifique à cette question. Sans choix, l'avatar du projet est utilisé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {value !== null && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Avatar personnalisé pour cette question</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleResetToProject}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Utiliser celui du projet
              </Button>
            </div>
          )}

          <AvatarPicker
            value={displayValue}
            onSelectPreset={(url) => setValue(url)}
            onUpload={handleUpload}
            onClear={() => setValue(null)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleValidate} disabled={uploading}>
            {uploading ? "Téléversement…" : "Valider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
