import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { CopilotProvider } from "@/contexts/CopilotContext";
import { CopilotFloatingButton } from "@/components/copilot/CopilotFloatingButton";
import { CopilotSidePanel } from "@/components/copilot/CopilotSidePanel";

export function AppLayout() {
  return (
    <SidebarProvider>
      <CopilotProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center border-b px-4">
              <SidebarTrigger />
            </header>
            <main className="flex-1 min-h-0 p-6 overflow-auto">
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
