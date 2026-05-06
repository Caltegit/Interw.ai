import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OrgRoleState {
  // Propriétaire de l'orga (ou co-admin legacy via user_roles).
  // Détient les droits d'invitation et de paramètres.
  isOwner: boolean;
  // Conservé pour compatibilité ascendante (égal à isOwner désormais).
  isAdmin: boolean;
  isMember: boolean;
  loading: boolean;
  organizationId: string | null;
  ownerId: string | null;
}

export function useOrgRole(): OrgRoleState {
  const { user } = useAuth();
  const [state, setState] = useState<OrgRoleState>({
    isOwner: false,
    isAdmin: false,
    isMember: false,
    loading: true,
    organizationId: null,
    ownerId: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ isOwner: false, isAdmin: false, isMember: false, loading: false, organizationId: null, ownerId: null });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (cancelled) return;

      if (!orgId) {
        setState({ isOwner: false, isAdmin: false, isMember: false, loading: false, organizationId: null, ownerId: null });
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

      const ownerId = (org as { owner_id?: string | null } | null)?.owner_id ?? null;
      const isLegacyAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
      const isOwner = ownerId === user.id || isLegacyAdmin;

      setState({
        isOwner,
        isAdmin: isOwner,
        isMember: true,
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
