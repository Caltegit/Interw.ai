import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useLocation, useParams, matchPath } from "react-router-dom";

interface CopilotContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  /** Projet actif détecté via la route, ou null. */
  activeProjectId: string | null;
  /** True si le bouton flottant doit être visible. */
  visible: boolean;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

const PROJECT_ROUTE_PATTERNS = [
  "/projects/:id",
  "/projects/:id/edit",
  "/projects/:id/public-page",
  "/projects/:id/compare",
];

// Routes où le bouton flottant doit être masqué.
const HIDDEN_PREFIXES = [
  "/admin",
  "/superadmin",
  "/sessions/", // pour /sessions/:id/export plein écran
];

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const params = useParams();

  // Détection projet actif
  const activeProjectId = useMemo<string | null>(() => {
    for (const pattern of PROJECT_ROUTE_PATTERNS) {
      const match = matchPath({ path: pattern, end: false }, location.pathname);
      if (match?.params?.id) return match.params.id;
    }
    // Sur /sessions/:id, le projet est inconnu côté route → null (le drawer demandera de choisir).
    void params;
    return null;
  }, [location.pathname, params]);

  // Visibilité globale
  const visible = useMemo(() => {
    const path = location.pathname;
    if (HIDDEN_PREFIXES.some((p) => path.startsWith(p) && path.endsWith("/export"))) return false;
    if (path.startsWith("/admin") || path.startsWith("/superadmin")) return false;
    return true;
  }, [location.pathname]);

  // Ferme le drawer si on quitte une route protégée
  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  const value = useMemo<CopilotContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      activeProjectId,
      visible,
    }),
    [open, activeProjectId, visible],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot doit être utilisé dans <CopilotProvider>");
  return ctx;
}
