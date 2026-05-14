import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCopilot } from "@/contexts/CopilotContext";
import { CopilotPanelContent } from "./CopilotPanelContent";
import { useIsMobile } from "@/hooks/use-mobile";

/** Version mobile : drawer Sheet plein écran. */
export function CopilotDrawer() {
  const { open, setOpen } = useCopilot();
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        <CopilotPanelContent inline={false} />
      </SheetContent>
    </Sheet>
  );
}
