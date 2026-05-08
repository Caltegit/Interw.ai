import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
}

export function OrganizationSwitcher() {
  const { user, profile } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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

  const activeId = profile?.organization_id ?? null;
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
  const Logo = active?.logo_url ? (
    <img src={active.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
  ) : (
    <Building2 className="h-4 w-4 shrink-0" />
  );

  if (orgs.length === 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        {Logo}
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={switching}
          className="w-full justify-start gap-2 h-9 px-2"
        >
          {Logo}
          {!collapsed && (
            <>
              <span className="truncate flex-1 text-left">{label}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className="gap-2"
          >
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="truncate flex-1">{org.name}</span>
            {org.id === activeId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
