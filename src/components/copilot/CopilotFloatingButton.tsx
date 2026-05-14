import { Sparkles } from "lucide-react";
import { useCopilot } from "@/contexts/CopilotContext";
import { CopilotDrawer } from "./CopilotDrawer";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function CopilotFloatingButton() {
  const { open, toggle, visible } = useCopilot();
  const { user } = useAuth();

  if (!visible || !user) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Ouvrir le copilote IA"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
          "transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "scale-95",
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <CopilotDrawer />
    </>
  );
}
