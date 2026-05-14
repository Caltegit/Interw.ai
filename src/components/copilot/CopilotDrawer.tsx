import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCopilot } from "@/contexts/CopilotContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { CopilotProjectPicker } from "./CopilotProjectPicker";
import { CopilotThreadSwitcher } from "./CopilotThreadSwitcher";
import { CopilotChatWindow } from "./CopilotChatWindow";
import { useCopilotThreads } from "@/hooks/queries/useCopilot";
import { Sparkles } from "lucide-react";

export function CopilotDrawer() {
  const { open, setOpen, activeProjectId } = useCopilot();
  const { user } = useAuth();
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const projectId = activeProjectId ?? pickedProjectId;
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Reset thread sélectionné quand on change de projet
  useEffect(() => {
    setActiveThreadId(null);
  }, [projectId]);

  const { data: threads } = useCopilotThreads(projectId, user?.id ?? null);

  // Auto-sélection du thread le plus récent
  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Copilote IA
          </SheetTitle>
        </SheetHeader>

        {!projectId ? (
          <CopilotProjectPicker onPick={setPickedProjectId} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b px-4 py-2">
              <CopilotThreadSwitcher
                projectId={projectId}
                userId={user?.id ?? null}
                activeThreadId={activeThreadId}
                onSelect={setActiveThreadId}
              />
            </div>
            <div className="flex min-h-0 flex-1">
              <CopilotChatWindow
                projectId={projectId}
                userId={user?.id ?? null}
                threadId={activeThreadId}
                onCreatedThread={setActiveThreadId}
              />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
