import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrgRoleState {
  isAdmin: boolean;
  isOwner: boolean;
  isMember: boolean;
  role: "admin" | "recruiter" | "viewer" | null;
  loading: boolean;
  organizationId: string | null;
  ownerId: string | null;
}

export function useOrgRole(): OrgRoleState {
  const { user } = useAuth();
  const [state, setState] = useState<OrgRoleState>({
    isAdmin: false,
    isOwner: false,
    isMember: false,
    role: null,
    loading: true,
    organizationId: null,
    ownerId: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ isAdmin: false, isOwner: false, isMember: false, role: null, loading: false, organizationId: null, ownerId: null });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (cancelled) return;

      if (!orgId) {
        setState({ isAdmin: false, isOwner: false, isMember: false, role: null, loading: false, organizationId: null, ownerId: null });
        return;
      }

      const [{ data: roles }, { data: org }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", orgId),
        supabase.from("organizations").select("owner_id").eq("id", orgId).single(),
      ]);

      if (cancelled) return;

      const roleList = (roles || []).map((r: any) => r.role);
      const isAdmin = roleList.includes("admin");
      const role = (isAdmin ? "admin" : roleList[0] || "recruiter") as OrgRoleState["role"];
      const ownerId = (org as any)?.owner_id ?? null;

      setState({
        isAdmin,
        isOwner: ownerId === user.id,
        isMember: true,
        role,
        loading: false,
        organizationId: orgId,
        ownerId,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
