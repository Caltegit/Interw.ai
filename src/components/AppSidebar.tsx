import { LayoutDashboard, FolderKanban, BookOpen, Settings, LogOut, Shield, ChevronDown, MessageSquare, Mic, Mail, ListChecks, ClipboardList, PlayCircle, MessageCircle, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useUnreadFeedback } from "@/hooks/useUnreadFeedback";
import { Badge } from "@/components/ui/badge";
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
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Sessions", url: "/projects", icon: FolderKanban },
];

const librarySubItems = [
  { title: "Modèles", url: "/library/sessions", icon: ClipboardList },
  { title: "Questions", url: "/library/questions", icon: MessageSquare },
  { title: "Critères", url: "/library/criteria", icon: ListChecks },
  { title: "Intros", url: "/library/intros", icon: Mic },
  { title: "Emails", url: "/library/emails", icon: Mail },
];

const bottomItems = [
  { title: "Feedback", url: "/feedback", icon: MessageCircle },
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const unreadFeedback = useUnreadFeedback();

  const isLibraryActive = location.pathname.startsWith("/library") || location.pathname === "/question-library";
  const [libraryOpen, setLibraryOpen] = useState(isLibraryActive);

  const systemSubItems = [
    { title: "Email", url: "/admin/emails", icon: Mail },
    { title: "Sessions", url: "/admin/sessions-queue", icon: Activity },
  ];
  const isSystemActive = systemSubItems.some((s) => location.pathname.startsWith(s.url));
  const [systemOpen, setSystemOpen] = useState(isSystemActive);

  const bottomItemsList = isSuperAdmin
    ? [
        ...bottomItems,
        { title: "Super Admin", url: "/admin", icon: Shield, showFeedbackBadge: true },
        { title: "Tuto", url: "/admin/tuto", icon: PlayCircle },
      ]
    : bottomItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            {!collapsed ? (
              <span className="text-lg font-bold text-primary">Interw.ai</span>
            ) : <span />}
            <SidebarTrigger className="h-6 w-6" />
          </SidebarGroupLabel>
          <div className="px-2 pb-2">
            <OrganizationSwitcher />
          </div>
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
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/library"
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={() => setLibraryOpen(true)}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Bibliothèques</span>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLibraryOpen((v) => !v);
                              }}
                              className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                              aria-label={libraryOpen ? "Réduire" : "Développer"}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${libraryOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </CollapsibleTrigger>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
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
                      {(item.url === "/feedback" || (item as any).showFeedbackBadge) && unreadFeedback > 0 && !collapsed && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                          {unreadFeedback}
                        </Badge>
                      )}
                      {(item.url === "/feedback" || (item as any).showFeedbackBadge) && unreadFeedback > 0 && collapsed && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Système (super admin) */}
              {isSuperAdmin && (
                <Collapsible open={systemOpen || collapsed} onOpenChange={setSystemOpen}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        type="button"
                        onClick={() => setSystemOpen((v) => !v)}
                        className={`w-full flex items-center hover:bg-muted/50 ${isSystemActive ? "bg-muted text-primary font-medium" : ""}`}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span>Système</span>
                            <CollapsibleTrigger asChild>
                              <span
                                className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                                aria-label={systemOpen ? "Réduire" : "Développer"}
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${systemOpen ? "rotate-180" : ""}`}
                                />
                              </span>
                            </CollapsibleTrigger>
                          </>
                        )}
                      </button>
                    </SidebarMenuButton>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {systemSubItems.map((sub) => (
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
              )}
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
