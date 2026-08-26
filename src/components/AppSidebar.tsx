import { LayoutDashboard, FolderKanban, BookOpen, LogOut, Shield, ChevronDown, ChevronRight, MessageSquare, Mic, Mail, ListChecks, ClipboardList, PlayCircle, MessageCircle, Settings, User, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Postes", url: "/projects", icon: FolderKanban },
];

const librarySubItems = [
  { title: "Sessions", url: "/library/sessions", icon: ClipboardList },
  { title: "Questions", url: "/library/questions", icon: MessageSquare },
  { title: "Critères", url: "/library/criteria", icon: ListChecks },
  { title: "Intros", url: "/library/intros", icon: Mic },
  { title: "Emails", url: "/library/emails", icon: Mail },
];

const bottomItems = [
  { title: "Feedback", url: "/feedback", icon: MessageCircle },
];

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || "").trim();
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  return (email || "?").slice(0, 2).toUpperCase();
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const unreadFeedback = useUnreadFeedback();

  const isLibraryActive = location.pathname.startsWith("/library") || location.pathname === "/question-library";
  const [libraryOpen, setLibraryOpen] = useState(isLibraryActive);

  const visibleLibrarySubItems = isSuperAdmin
    ? librarySubItems
    : librarySubItems.filter((s) => s.url !== "/library/emails");

  const bottomItemsList = bottomItems;


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <OrganizationSwitcher />
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel />
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

              {/* Ressources with sub-items */}
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
                          <span>Ressources</span>
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
                        {visibleLibrarySubItems.map((sub) => (
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

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="h-auto w-full py-2 data-[state=open]:bg-muted group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 shrink-0 group-data-[collapsible=icon]:!m-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(profile?.full_name, profile?.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="ml-2 min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium leading-tight">
                          {profile?.full_name || "Mon compte"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground leading-tight">
                          {profile?.email}
                        </p>
                      </div>
                      <ChevronRight className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "top" : "right"}
                align="end"
                sideOffset={8}
                className="w-60"
              >
                <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(profile?.full_name, profile?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{profile?.full_name || "Mon compte"}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/settings/profil")}>
                  <User className="mr-2 h-4 w-4" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/settings/organisation")}>
                  <Building2 className="mr-2 h-4 w-4" /> Mon organisation
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" /> Super admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate("/admin/system")}>
                      <Settings className="mr-2 h-4 w-4" /> Système
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs text-muted-foreground">Langue</span>
                  <LanguageSwitcher />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

