import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenPromptProps {
  onEnter: () => void;
}

/**
 * Discret banner shown at the top of the interview when the candidate
 * has exited fullscreen. Lets them re-enter with a single click.
 */
export default function FullscreenPrompt({ onEnter }: FullscreenPromptProps) {
  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between gap-3 px-3 sm:px-4 py-2 border-b backdrop-blur-md"
      style={{
        background: "hsl(var(--l-bg-elev) / 0.85)",
        borderColor: "hsl(var(--l-border))",
        color: "hsl(var(--l-fg) / 0.85)",
      }}
      role="status"
    >
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <Maximize2 className="h-4 w-4" style={{ color: "hsl(var(--l-accent))" }} />
        <span>Entretien hors plein écran</span>
      </div>
      <Button size="sm" variant="outline" onClick={onEnter} className="h-8">
        Revenir en plein écran
      </Button>
    </div>
  );
}
