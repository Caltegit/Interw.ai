import { useCopilot } from "@/contexts/CopilotContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { CopilotProjectPicker } from "./CopilotProjectPicker";
import { CopilotThreadSwitcher } from "./CopilotThreadSwitcher";
import { CopilotChatWindow } from "./CopilotChatWindow";
import { useCopilotThreads, type CopilotMode } from "@/hooks/queries/useCopilot";
import { Sparkles, X, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface Props {
  /** Si true, rendu en colonne ancrée (desktop). Sinon en bloc plein. */
  inline?: boolean;
}

export function CopilotPanelContent({ inline = false }: Props) {
  const {
    setOpen,
    activeProjectId,
    activeSessionId,
    activeCandidateName,
    openedContext,
    mode,
    setMode,
    pickedProjectId,
    setPickedProjectId,
    activeThreadId,
    setActiveThreadId,
  } = useCopilot();

  const { user } = useAuth();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawProjectId = activeProjectId ?? pickedProjectId;
  const projectId = rawProjectId && UUID_RE.test(rawProjectId) ? rawProjectId : null;
  const sessionScope = activeSessionId ?? null;

  const { data: threads } = useCopilotThreads(projectId, user?.id ?? null, mode, sessionScope);

  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId, setActiveThreadId]);

  // Sur une page session, on attend que le project_id soit résolu pour éviter le picker
  const waitingForSessionProject = !!activeSessionId && !activeProjectId;

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

      {waitingForSessionProject ? (
        <div className="p-4 text-sm text-muted-foreground">Chargement du contexte…</div>
      ) : !projectId ? (
        <CopilotProjectPicker onPick={setPickedProjectId} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {activeSessionId && (
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{activeCandidateName ?? "Candidat"}</span>
              <span className="text-muted-foreground">— conversation sur ce profil</span>
            </div>
          )}
          {!activeSessionId && (
            <div className="border-b px-4 py-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as CopilotMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="analysis">Analyser les candidats</TabsTrigger>
                  <TabsTrigger value="design">Concevoir l'entretien</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <div className="border-b px-4 py-2">
            <CopilotThreadSwitcher
              projectId={projectId}
              userId={user?.id ?? null}
              mode={mode}
              sessionId={sessionScope}
              activeThreadId={activeThreadId}
              onSelect={setActiveThreadId}
            />
          </div>
          <div className="flex min-h-0 flex-1">
            <CopilotChatWindow
              projectId={projectId}
              userId={user?.id ?? null}
              mode={mode}
              sessionId={sessionScope}
              candidateName={activeCandidateName}
              openedContext={openedContext}

              threadId={activeThreadId}
              onCreatedThread={setActiveThreadId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
