import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/** Sélecteur compact FR / EN. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("inline-flex items-center gap-1 text-xs", className)}>
      {(["fr", "en"] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setLanguage(lng)}
          aria-pressed={language === lng}
          className={cn(
            "rounded px-1.5 py-0.5 uppercase transition-colors",
            language === lng
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
