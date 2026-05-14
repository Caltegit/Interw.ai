import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { CopilotProvider } from "@/contexts/CopilotContext";
import { CopilotFloatingButton } from "@/components/copilot/CopilotFloatingButton";
import { CopilotSidePanel } from "@/components/copilot/CopilotSidePanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

function BackButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="h-8 gap-1 px-2"
      aria-label="Retour"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm">Retour</span>
    </Button>
  );
}

import { useCopilot } from "@/contexts/CopilotContext";

function AppShell() {
  const { open: copilotOpen } = useCopilot();
  useAutoCollapseSidebar(copilotOpen);
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <BackButton />
        </header>
        <main className={copilotOpen ? "flex-1 p-4" : "flex-1 p-6"}>
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
