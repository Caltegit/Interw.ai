import { LayoutDashboard, FolderKanban, BookOpen, Settings, LogOut, Shield, ChevronDown, MessageSquare, Mic, Mail, ListChecks } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Entretiens", url: "/projects", icon: FolderKanban },
];

const librarySubItems = [
  { title: "Questions", url: "/library/questions", icon: MessageSquare },
  { title: "Critères", url: "/library/criteria", icon: ListChecks },
  { title: "Intros", url: "/library/intros", icon: Mic },
  { title: "Emails", url: "/library/emails", icon: Mail },
];

const bottomItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const isLibraryActive = location.pathname.startsWith("/library") || location.pathname === "/question-library";
  const [libraryOpen, setLibraryOpen] = useState(isLibraryActive);

  const bottomItemsList = isSuperAdmin
    ? [...bottomItems, { title: "Super Admin", url: "/admin", icon: Shield }]
    : bottomItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-lg font-bold text-primary">Interw.ai</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Bibliothèque with sub-items */}
              <Collapsible open={libraryOpen || collapsed} onOpenChange={setLibraryOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`hover:bg-muted/50 ${isLibraryActive ? "bg-muted text-primary font-medium" : ""}`}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Bibliothèque</span>
                          <ChevronDown
                            className={`ml-auto h-4 w-4 transition-transform ${libraryOpen ? "rotate-180" : ""}`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {librarySubItems.map((sub) => (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={sub.url}
                                className="hover:bg-muted/50"
                                activeClassName="bg-muted text-primary font-medium"
                              >
                                <sub.icon className="mr-2 h-4 w-4" />
                                <span>{sub.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              {bottomItemsList.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && profile && (
          <p className="px-3 text-xs text-muted-foreground truncate">{profile.email}</p>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Déconnexion"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
