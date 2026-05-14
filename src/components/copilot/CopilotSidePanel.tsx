import { useCopilot } from "@/contexts/CopilotContext";
import { CopilotPanelContent } from "./CopilotPanelContent";
import { cn } from "@/lib/utils";

/** Panneau latéral droit ancré (desktop). */
export function CopilotSidePanel() {
  const { open, visible } = useCopilot();
  if (!visible) return null;
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-l bg-background transition-[width] duration-200 overflow-hidden",
        "sticky top-0 h-screen self-start",
        open
          ? "w-[360px] xl:w-[400px] 2xl:w-[30vw] min-[1920px]:w-[33vw] min-w-[320px] max-w-[640px]"
          : "w-0",
      )}
      aria-hidden={!open}
    >
      {open && <CopilotPanelContent inline />}
    </aside>
  );
}
