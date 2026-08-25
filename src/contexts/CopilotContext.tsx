import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { useLocation, useParams, matchPath } from "react-router-dom";
import type { CopilotMode } from "@/hooks/queries/useCopilot";
import { useSessionContext } from "@/hooks/queries/useSessionContext";

export type CopilotContextKind =
  | "projects-list"
  | "project-detail"
  | "compare"
  | "stats"
  | "project-edit"
  | "public-page"
  | "session"
  | "library"
  | "generic";

export interface CopilotOpenContext {
  kind: CopilotContextKind;
  projectId?: string;
  sessionId?: string;
}

interface CopilotContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  openCopilot: () => void;
  /** Poste actif détecté via la route (poste ou session), ou null. */
  activeProjectId: string | null;
  /** Session active détectée via la route, ou null. */
  activeSessionId: string | null;
  /** Nom du candidat de la session active, si connu. */
  activeCandidateName: string | null;
  /** Contexte capturé au moment de l'ouverture du copilote. */
  openedContext: CopilotOpenContext | null;
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
  "/projects/:id/stats",
];

const RESERVED_PROJECT_IDS = new Set(["new", "archives"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectContext(pathname: string): CopilotOpenContext {
  const session = matchPath({ path: "/sessions/:id", end: false }, pathname);
  if (session && !pathname.endsWith("/export")) {
    return { kind: "session", sessionId: session.params.id };
  }
  const compare = matchPath({ path: "/projects/:id/compare", end: false }, pathname);
  if (compare) return { kind: "compare", projectId: compare.params.id };
  const stats = matchPath({ path: "/projects/:id/stats", end: false }, pathname);
  if (stats) return { kind: "stats", projectId: stats.params.id };
  const pub = matchPath({ path: "/projects/:id/public-page", end: false }, pathname);
  if (pub) return { kind: "public-page", projectId: pub.params.id };
  const edit = matchPath({ path: "/projects/:id/edit", end: false }, pathname);
  if (edit) return { kind: "project-edit", projectId: edit.params.id };
  if (pathname === "/projects/new") return { kind: "project-edit" };
  const detail = matchPath({ path: "/projects/:id", end: true }, pathname);
  if (detail) return { kind: "project-detail", projectId: detail.params.id };
  if (pathname === "/projects" || pathname === "/dashboard" || pathname === "/projects/archives") {
    return { kind: "projects-list" };
  }
  if (pathname.startsWith("/library")) return { kind: "library" };
  return { kind: "generic" };
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [mode, setMode] = useState<CopilotMode>("analysis");
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [openedContext, setOpenedContext] = useState<CopilotOpenContext | null>(null);
  const location = useLocation();
  const params = useParams();

  const sessionMatch = useMemo(
    () => matchPath({ path: "/sessions/:id", end: false }, location.pathname),
    [location.pathname],
  );
  const routeSessionId = sessionMatch?.params?.id ?? null;
  const activeSessionId =
    routeSessionId && !location.pathname.endsWith("/export") ? routeSessionId : null;

  const { data: sessionCtx } = useSessionContext(activeSessionId);

  const projectFromRoute = useMemo<string | null>(() => {
    for (const pattern of PROJECT_ROUTE_PATTERNS) {
      const match = matchPath({ path: pattern, end: false }, location.pathname);
      const id = match?.params?.id;
      if (id && !RESERVED_PROJECT_IDS.has(id) && UUID_RE.test(id)) return id;
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

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    if (!v) setOpenedContext(null);
  }, []);

  const openCopilot = useCallback(() => {
    const ctx = detectContext(location.pathname);
    setOpenedContext(ctx);
    if (ctx.kind === "project-edit") setMode("design");
    else if (ctx.kind === "session") setMode("analysis");
    setOpenState(true);
  }, [location.pathname]);

  const toggle = useCallback(() => {
    if (open) {
      setOpenState(false);
      setOpenedContext(null);
    } else {
      openCopilot();
    }
  }, [open, openCopilot]);

  useEffect(() => {
    if (!visible && open) {
      setOpenState(false);
      setOpenedContext(null);
    }
  }, [visible, open]);

  // Réinitialise le poste sélectionné si la route impose un poste invalide
  useEffect(() => {
    if (location.pathname === "/projects/new" && pickedProjectId !== null) {
      setPickedProjectId(null);
    }
  }, [location.pathname, pickedProjectId]);

  // Reset thread quand poste/session effectif ou mode change
  const effectiveProjectId = activeProjectId ?? pickedProjectId;
  useEffect(() => {
    setActiveThreadId(null);
  }, [effectiveProjectId, activeSessionId, mode]);

  const value = useMemo<CopilotContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      openCopilot,
      activeProjectId,
      activeSessionId,
      activeCandidateName,
      openedContext,
      visible,
      mode,
      setMode,
      pickedProjectId,
      setPickedProjectId,
      activeThreadId,
      setActiveThreadId,
    }),
    [open, setOpen, toggle, openCopilot, activeProjectId, activeSessionId, activeCandidateName, openedContext, visible, mode, pickedProjectId, activeThreadId],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot doit être utilisé dans <CopilotProvider>");
  return ctx;
}

