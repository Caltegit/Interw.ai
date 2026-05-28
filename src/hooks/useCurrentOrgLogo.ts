import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Récupère le logo_url de l'organisation active de l'utilisateur connecté.
 * Retourne null si pas d'utilisateur, pas d'org, ou pas de logo.
 */
export function useCurrentOrgLogo(): string | null {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLogoUrl(null);
      return;
    }
    (async () => {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (cancelled || !orgId) return;
      const { data } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", orgId as string)
        .maybeSingle();
      if (cancelled) return;
      setLogoUrl((data?.logo_url as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return logoUrl;
}
