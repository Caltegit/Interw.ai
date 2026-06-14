import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { CopilotProvider } from "@/contexts/CopilotContext";
import { CopilotFloatingButton } from "@/components/copilot/CopilotFloatingButton";
import { CopilotSidePanel } from "@/components/copilot/CopilotSidePanel";
import { useEffect, useRef } from "react";

const AUTO_COLLAPSE_THRESHOLD = 1440;

function useAutoCollapseSidebar(copilotOpen: boolean) {
  const { state, setOpen } = useSidebar();
  const autoCollapsedRef = useRef(false);
  const prevCopilotOpenRef = useRef(copilotOpen);
  const prevSidebarStateRef = useRef(state);

  useEffect(() => {
    const wasOpen = prevCopilotOpenRef.current;
    prevCopilotOpenRef.current = copilotOpen;

    // L'utilisateur a touché manuellement à la sidebar pendant que le copilote est ouvert
    if (copilotOpen && wasOpen && state !== prevSidebarStateRef.current) {
      autoCollapsedRef.current = false;
    }
    prevSidebarStateRef.current = state;

    // Ouverture du copilote
    if (copilotOpen && !wasOpen) {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < AUTO_COLLAPSE_THRESHOLD &&
        state === "expanded"
      ) {
        autoCollapsedRef.current = true;
        setOpen(false);
      }
      return;
    }

    // Fermeture du copilote
    if (!copilotOpen && wasOpen && autoCollapsedRef.current) {
      autoCollapsedRef.current = false;
      setOpen(true);
    }
  }, [copilotOpen, state, setOpen]);
}

import { useCopilot } from "@/contexts/CopilotContext";

function AppShell() {
  const { open: copilotOpen } = useCopilot();
  useAutoCollapseSidebar(copilotOpen);
  return (
    <div className="min-h-screen flex w-full">
      <SidebarTrigger
        aria-label="Ouvrir le menu"
        className="md:hidden fixed top-2 left-2 z-40 h-9 w-9 rounded-md bg-background/90 backdrop-blur border shadow-sm"
      />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className={copilotOpen ? "flex-1 px-4 pb-4 pt-1" : "flex-1 px-6 pb-6 pt-1"}>
          <Outlet />
        </main>
      </div>
      <CopilotSidePanel />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <CopilotProvider>
        <AppShell />
        <CopilotFloatingButton />
      </CopilotProvider>
    </SidebarProvider>
  );
}
