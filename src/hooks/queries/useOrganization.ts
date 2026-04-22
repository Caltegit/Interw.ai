import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryClient";

export interface OrganizationData {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  owner_id: string | null;
}

export function useOrganization(orgId: string | null | undefined) {
  return useQuery({
    queryKey: orgId ? queryKeys.organization(orgId) : ["organization", "anon"],
    queryFn: async (): Promise<OrganizationData | null> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url, owner_id")
        .eq("id", orgId as string)
        .single();
      if (error) throw error;
      return data as OrganizationData;
    },
    enabled: !!orgId,
  });
}

export function useUpdateOrganization(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!orgId) throw new Error("Organisation introuvable");
      const { error } = await supabase
        .from("organizations")
        .update({ name, slug })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.organization(orgId) });
    },
  });
}
