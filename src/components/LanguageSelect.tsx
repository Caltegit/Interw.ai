import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import type { AppLanguage } from "@/i18n/detect";

const OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: "fr", label: "🇫🇷 France (Français)" },
  { code: "en", label: "🇺🇸 United States (English)" },
];

/** Sélecteur de langue en pastille, menu ouvrant vers le haut. */
export function LanguageSelect({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = OPTIONS.find((o) => o.code === language) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (code: AppLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(OPTIONS.findIndex((o) => o.code === language));
        return;
      }
      setActiveIndex((i) =>
        e.key === "ArrowDown" ? (i + 1) % OPTIONS.length : (i - 1 + OPTIONS.length) % OPTIONS.length,
      );
    } else if (e.key === "Enter" || e.key === " ") {
      if (open) {
        e.preventDefault();
        choose(OPTIONS[activeIndex].code);
      }
    }
  };

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setActiveIndex(OPTIONS.findIndex((o) => o.code === language));
        }}
        onKeyDown={onButtonKeyDown}
        className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors"
      >
        {current.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="border-border bg-background absolute bottom-full left-0 mb-2 min-w-full overflow-hidden rounded-xl border shadow-lg"
        >
          {OPTIONS.map((o, i) => (
            <button
              key={o.code}
              type="button"
              role="option"
              aria-selected={o.code === language}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(o.code)}
              className={cn(
                "hover:bg-muted block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm transition-colors",
                o.code === language && "bg-muted font-medium",
                activeIndex === i && "bg-muted",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
