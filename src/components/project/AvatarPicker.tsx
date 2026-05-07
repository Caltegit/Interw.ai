import { useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarUploadDialog } from "./AvatarUploadDialog";
import woman1 from "@/assets/avatars/woman-1.jpg";
import woman2 from "@/assets/avatars/woman-2.jpg";
import woman3 from "@/assets/avatars/woman-3.jpg";
import woman4 from "@/assets/avatars/woman-4.jpg";
import woman5 from "@/assets/avatars/woman-5.jpg";
import woman6 from "@/assets/avatars/woman-6.jpg";
import man1 from "@/assets/avatars/man-1.jpg";
import man2 from "@/assets/avatars/man-2.jpg";
import man3 from "@/assets/avatars/man-3.jpg";
import man4 from "@/assets/avatars/man-4.jpg";
import man5 from "@/assets/avatars/man-5.jpg";
import man6 from "@/assets/avatars/man-6.jpg";

const PHOTO_AVATARS = [
  { url: woman1, name: "Camille" },
  { url: woman2, name: "Isabelle" },
  { url: woman3, name: "Léa" },
  { url: woman4, name: "Catherine" },
  { url: woman5, name: "Mei" },
  { url: woman6, name: "Charlotte" },
  { url: man1, name: "Antoine" },
  { url: man2, name: "Karim" },
  { url: man3, name: "Hugo" },
  { url: man4, name: "Philippe" },
  { url: man5, name: "Marc" },
  { url: man6, name: "Tom" },
];

interface Props {
  value: string | null;
  onSelectPreset: (url: string) => void;
  onUpload: (file: File) => void;
  onClear: () => void;
  uploadOnly?: boolean;
}

export function AvatarPicker({ value, onSelectPreset, onUpload, onClear, uploadOnly = false }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const isPhoto = value && PHOTO_AVATARS.some((a) => a.url === value);
  const isCustom = value && !isPhoto;

  return (
    <div className="space-y-3">
      {/* Selected preview + clear */}
      <div className="flex items-center gap-4">
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
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Upload className="h-4 w-4" />
            Télécharger
          </button>
          <p className="mt-1 text-xs text-muted-foreground">Recadrage et aperçu inclus</p>
        </div>
      </div>

      <AvatarUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUpload={onUpload} />

      {!uploadOnly && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Photos</p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {PHOTO_AVATARS.map((avatar) => {
              const selected = value === avatar.url;
              return (
                <button
                  key={avatar.name}
                  type="button"
                  onClick={() => onSelectPreset(avatar.url)}
                  className={cn(
                    "relative aspect-square rounded-full border-2 bg-muted overflow-hidden transition-all hover:scale-105",
                    selected
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary/50",
                  )}
                  aria-label={`Photo ${avatar.name}`}
                  title={avatar.name}
                >
                  <img
                    src={avatar.url}
                    alt=""
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                      <div className="rounded-full bg-primary p-1">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {isCustom && <p className="mt-2 text-xs text-muted-foreground">Photo personnalisée sélectionnée.</p>}
        </div>
      )}
    </div>
  );
}
