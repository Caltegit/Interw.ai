import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CriteriaLibraryManager } from "@/components/CriteriaLibraryManager";

export default function CriteriaLibrary() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_organization_id", { _user_id: user.id }).then(({ data }) => {
      if (data) setOrgId(data);
    });
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Bibliothèque de critères</h1>
      <p className="text-muted-foreground">Gérez vos critères d'évaluation réutilisables pour vos projets d'entretien.</p>
      {orgId ? (
        <CriteriaLibraryManager orgId={orgId} />
      ) : (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
