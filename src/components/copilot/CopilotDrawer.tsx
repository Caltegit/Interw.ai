import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCopilot } from "@/contexts/CopilotContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { CopilotProjectPicker } from "./CopilotProjectPicker";
import { CopilotThreadSwitcher } from "./CopilotThreadSwitcher";
import { CopilotChatWindow } from "./CopilotChatWindow";
import { useCopilotThreads, type CopilotMode } from "@/hooks/queries/useCopilot";
import { Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CopilotDrawer() {
  const { open, setOpen, activeProjectId } = useCopilot();
  const { user } = useAuth();
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const projectId = activeProjectId ?? pickedProjectId;
  const [mode, setMode] = useState<CopilotMode>("analysis");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Reset thread quand projet ou mode change
  useEffect(() => {
    setActiveThreadId(null);
  }, [projectId, mode]);

  const { data: threads } = useCopilotThreads(projectId, user?.id ?? null, mode);

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
              <Tabs value={mode} onValueChange={(v) => setMode(v as CopilotMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="analysis">Analyser les candidats</TabsTrigger>
                  <TabsTrigger value="design">Concevoir l'entretien</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="border-b px-4 py-2">
              <CopilotThreadSwitcher
                projectId={projectId}
                userId={user?.id ?? null}
                mode={mode}
                activeThreadId={activeThreadId}
                onSelect={setActiveThreadId}
              />
            </div>
            <div className="flex min-h-0 flex-1">
              <CopilotChatWindow
                projectId={projectId}
                userId={user?.id ?? null}
                mode={mode}
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
