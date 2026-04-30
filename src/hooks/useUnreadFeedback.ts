import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export function useUnreadFeedback() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    const expectedRole = isSuperAdmin ? "user" : "super_admin";

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("feedback_messages")
        .select("id", { count: "exact", head: true })
        .eq("author_role", expectedRole)
        .is("read_by_recipient_at", null)
        .neq("author_id", user.id);
      setUnread(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`feedback-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_messages" },
        () => fetchUnread(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSuperAdmin]);

  return unread;
}
