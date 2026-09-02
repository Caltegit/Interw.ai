import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const userId = session?.user?.id;

  // Un utilisateur sans organisation (et sans rôle, ex. super admin) est renvoyé
  // vers l'étape d'accueil pour créer la sienne.
  const { data: needsOnboarding, isLoading: orgLoading } = useQuery({
    queryKey: ["needs-onboarding", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (profile?.organization_id) return false;
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!);
      return (count ?? 0) === 0;
    },
  });

  if (loading || (session && orgLoading)) {
    return <Spinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding && location.pathname !== "/bienvenue") {
    return <Navigate to="/bienvenue" replace />;
  }

  return <>{children}</>;
}
