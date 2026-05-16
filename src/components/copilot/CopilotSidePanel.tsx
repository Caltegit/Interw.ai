import { useCopilot } from "@/contexts/CopilotContext";
import { CopilotPanelContent } from "./CopilotPanelContent";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 400;
const STORAGE_KEY = "copilot:panel-width";

/** Panneau latéral droit ancré (desktop), redimensionnable. */
export function CopilotSidePanel() {
  const { open, visible } = useCopilot();
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) return stored;
    return DEFAULT_WIDTH;
  });
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setWidth((w) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(w));
        } catch {
          /* ignore */
        }
        return w;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
    };
  }, []);

  if (!visible) return null;
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-l bg-background overflow-hidden relative",
        "sticky top-0 h-screen self-start",
        !open && "w-0",
      )}
      style={open ? { width: `${width}px`, transition: draggingRef.current ? "none" : "width 200ms" } : undefined}
      aria-hidden={!open}
    >
      {open && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionner le panneau Copilote"
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
          />
          <CopilotPanelContent inline />
        </>
      )}
    </aside>
  );
}
