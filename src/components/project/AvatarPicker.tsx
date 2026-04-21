import { Check, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import woman1 from "@/assets/avatars/woman-1.jpg";
import woman2 from "@/assets/avatars/woman-2.jpg";
import woman3 from "@/assets/avatars/woman-3.jpg";
import man1 from "@/assets/avatars/man-1.jpg";
import man2 from "@/assets/avatars/man-2.jpg";
import man3 from "@/assets/avatars/man-3.jpg";

const PRESET_AVATARS = [
  { seed: "Marie", bg: "b6e3f4" },
  { seed: "Thomas", bg: "c0aede" },
  { seed: "Sophie", bg: "ffd5dc" },
  { seed: "Lucas", bg: "ffdfbf" },
  { seed: "Emma", bg: "d1f4d1" },
  { seed: "Antoine", bg: "fde68a" },
  { seed: "Camille", bg: "fecaca" },
  { seed: "Julien", bg: "bae6fd" },
].map((a) => ({
  url: `https://api.dicebear.com/9.x/personas/svg?seed=${a.seed}&backgroundColor=${a.bg}`,
  seed: a.seed,
}));

const PHOTO_AVATARS = [
  { url: woman1, name: "Camille" },
  { url: woman2, name: "Isabelle" },
  { url: woman3, name: "Léa" },
  { url: man1, name: "Antoine" },
  { url: man2, name: "Karim" },
  { url: man3, name: "Hugo" },
];

interface Props {
  value: string | null;
  onSelectPreset: (url: string) => void;
  onUpload: (file: File) => void;
  onClear: () => void;
}

export function AvatarPicker({ value, onSelectPreset, onUpload, onClear }: Props) {
  const isPreset = value && PRESET_AVATARS.some((a) => a.url === value);
  const isPhoto = value && PHOTO_AVATARS.some((a) => a.url === value);
  const isCustom = value && !isPreset && !isPhoto;

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
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors">
            <Upload className="h-4 w-4" />
            Télécharger
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Photo avatars */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Photos réelles
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PHOTO_AVATARS.map((avatar) => {
            const selected = value === avatar.url;
            return (
              <button
                key={avatar.name}
                type="button"
                onClick={() => onSelectPreset(avatar.url)}
                className={cn(
                  "relative aspect-square rounded-full border-2 bg-muted overflow-hidden transition-all hover:scale-105",
                  selected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-primary/50",
                )}
                aria-label={`Photo ${avatar.name}`}
                title={avatar.name}
              >
                <img src={avatar.url} alt="" className="h-full w-full object-cover" loading="lazy" />
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
      </div>

      {/* Preset grid */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Avatars illustrés
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {PRESET_AVATARS.map((avatar) => {
            const selected = value === avatar.url;
            return (
              <button
                key={avatar.seed}
                type="button"
                onClick={() => onSelectPreset(avatar.url)}
                className={cn(
                  "relative aspect-square rounded-full border-2 bg-muted overflow-hidden transition-all hover:scale-105",
                  selected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-primary/50",
                )}
                aria-label={`Avatar ${avatar.seed}`}
              >
                <img src={avatar.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                {selected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                    <div className="rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {isCustom && (
          <p className="mt-2 text-xs text-muted-foreground">Photo personnalisée sélectionnée.</p>
        )}
      </div>
    </div>
  );
}
