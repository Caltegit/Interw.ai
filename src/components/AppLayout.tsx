import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { CopilotProvider } from "@/contexts/CopilotContext";
import { CopilotFloatingButton } from "@/components/copilot/CopilotFloatingButton";
import { CopilotSidePanel } from "@/components/copilot/CopilotSidePanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

export function AppLayout() {
  return (
    <SidebarProvider>
      <CopilotProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <BackButton />
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
          <CopilotSidePanel />
        </div>
        <CopilotFloatingButton />
      </CopilotProvider>
    </SidebarProvider>
  );
}
