import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useLocation, useParams, matchPath } from "react-router-dom";
import type { CopilotMode } from "@/hooks/queries/useCopilot";
import { useSessionContext } from "@/hooks/queries/useSessionContext";

interface CopilotContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  /** Projet actif détecté via la route (projet ou session), ou null. */
  activeProjectId: string | null;
  /** Session active détectée via la route, ou null. */
  activeSessionId: string | null;
  /** Nom du candidat de la session active, si connu. */
  activeCandidateName: string | null;
  /** True si le bouton flottant doit être visible. */
  visible: boolean;
  /** État persistant entre navigations. */
  mode: CopilotMode;
  setMode: (m: CopilotMode) => void;
  pickedProjectId: string | null;
  setPickedProjectId: (v: string | null) => void;
  activeThreadId: string | null;
  setActiveThreadId: (v: string | null) => void;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

const PROJECT_ROUTE_PATTERNS = [
  "/projects/:id",
  "/projects/:id/edit",
  "/projects/:id/public-page",
  "/projects/:id/compare",
];

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CopilotMode>("analysis");
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const location = useLocation();
  const params = useParams();

  const sessionMatch = useMemo(
    () => matchPath({ path: "/sessions/:id", end: false }, location.pathname),
    [location.pathname],
  );
  const routeSessionId = sessionMatch?.params?.id ?? null;
  // Exclure les sous-routes type /sessions/:id/export
  const activeSessionId =
    routeSessionId && !location.pathname.endsWith("/export") ? routeSessionId : null;

  const { data: sessionCtx } = useSessionContext(activeSessionId);

  const projectFromRoute = useMemo<string | null>(() => {
    for (const pattern of PROJECT_ROUTE_PATTERNS) {
      const match = matchPath({ path: pattern, end: false }, location.pathname);
      if (match?.params?.id) return match.params.id;
    }
    void params;
    return null;
  }, [location.pathname, params]);

  const activeProjectId = projectFromRoute ?? sessionCtx?.project_id ?? null;
  const activeCandidateName = sessionCtx?.candidate_name ?? null;

  const visible = useMemo(() => {
    const path = location.pathname;
    if (path.endsWith("/export")) return false;
    if (path.startsWith("/admin") || path.startsWith("/superadmin")) return false;
    return true;
  }, [location.pathname]);

  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  // En page session, on force le mode analyse
  useEffect(() => {
    if (activeSessionId && mode !== "analysis") setMode("analysis");
  }, [activeSessionId, mode]);

  // Reset thread quand projet/session effectif ou mode change
  const effectiveProjectId = activeProjectId ?? pickedProjectId;
  useEffect(() => {
    setActiveThreadId(null);
  }, [effectiveProjectId, activeSessionId, mode]);

  const value = useMemo<CopilotContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      activeProjectId,
      activeSessionId,
      activeCandidateName,
      visible,
      mode,
      setMode,
      pickedProjectId,
      setPickedProjectId,
      activeThreadId,
      setActiveThreadId,
    }),
    [open, activeProjectId, activeSessionId, activeCandidateName, visible, mode, pickedProjectId, activeThreadId],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot doit être utilisé dans <CopilotProvider>");
  return ctx;
}
