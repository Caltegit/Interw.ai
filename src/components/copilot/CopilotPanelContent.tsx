import { useCopilot } from "@/contexts/CopilotContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { CopilotProjectPicker } from "./CopilotProjectPicker";
import { CopilotThreadSwitcher } from "./CopilotThreadSwitcher";
import { CopilotChatWindow } from "./CopilotChatWindow";
import { useCopilotThreads, type CopilotMode } from "@/hooks/queries/useCopilot";
import { Sparkles, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface Props {
  /** Si true, rendu en colonne ancrée (desktop). Sinon en bloc plein. */
  inline?: boolean;
}

export function CopilotPanelContent({ inline = false }: Props) {
  const { setOpen, activeProjectId, mode, setMode, pickedProjectId, setPickedProjectId, activeThreadId, setActiveThreadId } = useCopilot();
  const { user } = useAuth();
  const projectId = activeProjectId ?? pickedProjectId;

  const { data: threads } = useCopilotThreads(projectId, user?.id ?? null, mode);

  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId, setActiveThreadId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Copilote IA
        </div>
        {inline && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
            aria-label="Fermer le copilote"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

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
    </div>
  );
}
