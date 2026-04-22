import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUpdateProfile(userId: string | undefined) {
  return useMutation({
    mutationFn: async ({ fullName }: { fullName: string }) => {
      if (!userId) throw new Error("Utilisateur introuvable");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", userId);
      if (error) throw error;
    },
  });
}
