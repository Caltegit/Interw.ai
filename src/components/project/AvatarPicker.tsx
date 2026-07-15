import { useState } from "react";
import { Upload, X } from "lucide-react";
import { AvatarUploadDialog } from "./AvatarUploadDialog";

interface Props {
  value: string | null;
  onUpload: (file: File) => void;
  onClear: () => void;
}

export function AvatarPicker({ value, onUpload, onClear }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="Avatar sélectionné"
              className="h-20 w-20 rounded-full border-2 border-primary object-cover bg-muted"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
              aria-label="Retirer l'avatar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground text-xs text-center px-2">
            Aucun avatar
          </div>
        )}
        <div className="flex flex-1 items-start gap-3">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors shrink-0"
            >
              <Upload className="h-4 w-4" />
              Télécharger
            </button>
            <p className="text-xs text-muted-foreground">Recadrage et aperçu inclus</p>
          </div>
          <p className="text-xs text-muted-foreground leading-snug pt-1">
            Importez votre photo pour personnaliser l'expérience !
          </p>
        </div>
      </div>

      <AvatarUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUpload={onUpload} />
    </div>
  );
}
