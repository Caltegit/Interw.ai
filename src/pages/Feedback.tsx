import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewFeedbackDialog } from "@/components/feedback/NewFeedbackDialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  status: "open" | "resolved";
  user_id: string;
  organization_id: string | null;
  last_message_at: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

export default function Feedback() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: superLoading } = useSuperAdmin();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || superLoading) return;

    const fetchThreads = async () => {
      const { data } = await supabase
        .from("feedback_threads")
        .select("*")
        .order("last_message_at", { ascending: false });

      const list = (data ?? []) as Thread[];
      setThreads(list);

      if (isSuperAdmin && list.length > 0) {
        const userIds = Array.from(new Set(list.map((t) => t.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };

    fetchThreads();

    const channel = supabase
      .channel("feedback-threads-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback_threads" }, fetchThreads)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isSuperAdmin, superLoading]);

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? "Tous les retours envoyés par les utilisateurs."
              : "Échangez directement avec l'équipe Interw.ai."}
          </p>
        </div>
        {!isSuperAdmin && <NewFeedbackDialog />}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : threads.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Aucun feedback pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const author = profiles[t.user_id];
            return (
              <Link key={t.id} to={`/feedback/${t.id}`}>
                <Card className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{t.subject}</h3>
                        <Badge variant={t.status === "open" ? "default" : "secondary"}>
                          {t.status === "open" ? "Ouvert" : "Résolu"}
                        </Badge>
                      </div>
                      {isSuperAdmin && author && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {author.full_name || author.email}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
