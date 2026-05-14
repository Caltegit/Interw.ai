import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { CopilotProvider } from "@/contexts/CopilotContext";
import { CopilotFloatingButton } from "@/components/copilot/CopilotFloatingButton";

export function AppLayout() {
  return (
    <SidebarProvider>
      <CopilotProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center border-b px-4">
              <SidebarTrigger />
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <CopilotFloatingButton />
      </CopilotProvider>
    </SidebarProvider>
  );
}
