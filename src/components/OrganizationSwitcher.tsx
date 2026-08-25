import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
}

function OrgLogo({ org, className = "size-8" }: { org: Org | null; className?: string }) {
  if (org?.logo_url) {
    return (
      <img
        src={org.logo_url}
        alt=""
        className={`${className} shrink-0 rounded-lg object-cover`}
      />
    );
  }
  const initial = org?.name?.trim()?.[0]?.toUpperCase();
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold`}
    >
      {initial ?? <Building2 className="size-4" />}
    </div>
  );
}

export function OrganizationSwitcher() {
  const { user } = useAuth();
  const { organizationId: activeId, isOwner } = useOrgRole();
  const isMobile = useIsMobile();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(id, name, logo_url)")
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      const list = data
        .map((r: any) => r.organizations)
        .filter(Boolean) as Org[];
      list.sort((a, b) => a.name.localeCompare(b.name));
      setOrgs(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const active = orgs.find((o) => o.id === activeId) ?? null;

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeId) return;
    setSwitching(true);
    const { error } = await supabase.rpc("switch_active_organization", { _org_id: orgId });
    if (error) {
      toast.error("Impossible de changer d'organisation");
      setSwitching(false);
      return;
    }
    window.location.reload();
  };

  if (orgs.length === 0) return null;

  const label = active?.name ?? "Organisation";
  const roleLabel = isOwner ? "Propriétaire" : "Membre";

  if (orgs.length === 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
            <OrgLogo org={active} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-semibold">{label}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              disabled={switching}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <OrgLogo org={active} />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{label}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            className="w-[--radix-popper-anchor-width] min-w-56"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organisations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {orgs.map((org) => (
              <DropdownMenuItem key={org.id} onClick={() => handleSwitch(org.id)} className="gap-2">
                <OrgLogo org={org} className="size-6" />
                <span className="truncate flex-1">{org.name}</span>
                {org.id === activeId && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
