import { FileText, Sparkles, Mic, Video } from "lucide-react";

export type IntroFormat = "text" | "tts" | "audio" | "video";

const FORMATS: { mode: IntroFormat; icon: typeof FileText; title: string; desc: string }[] = [
  { mode: "text", icon: FileText, title: "Texte à lire", desc: "Le candidat lit votre message à l'écran." },
  { mode: "tts", icon: Sparkles, title: "Texte lu par l'IA", desc: "L'IA lit votre texte avec la voix choisie." },
  { mode: "audio", icon: Mic, title: "Audio", desc: "Vous enregistrez ou téléversez un message vocal." },
  { mode: "video", icon: Video, title: "Vidéo", desc: "Vous enregistrez ou téléversez une vidéo de présentation." },
];

interface Props {
  value: IntroFormat;
  onChange: (mode: IntroFormat) => void;
}

export function IntroFormatPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FORMATS.map((f) => {
        const Icon = f.icon;
        const selected = value === f.mode;
        return (
          <button
            key={f.mode}
            type="button"
            onClick={() => onChange(f.mode)}
            className={`text-left rounded-lg border p-4 transition-colors ${
              selected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-medium text-sm">{f.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

export const INTRO_FORMAT_META: Record<IntroFormat, { label: string; icon: typeof FileText }> = {
  text: { label: "Texte", icon: FileText },
  tts: { label: "Texte IA", icon: Sparkles },
  audio: { label: "Audio", icon: Mic },
  video: { label: "Vidéo", icon: Video },
};
