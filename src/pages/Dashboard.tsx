import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Users, CheckCircle, TrendingUp } from "lucide-react";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, pending: 0, completed: 0, avgScore: 0 });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { data: sessions } = await supabase
        .from("sessions")
        .select("*, projects!inner(title, job_title)")
        .order("created_at", { ascending: false })
        .limit(10);

      const pendingCount = sessions?.filter((s) => s.status === "pending").length ?? 0;
      const completedSessions = sessions?.filter((s) => s.status === "completed") ?? [];

      // Get avg score from reports
      let avgScore = 0;
      if (completedSessions.length > 0) {
        const sessionIds = completedSessions.map((s) => s.id);
        const { data: reports } = await supabase
          .from("reports")
          .select("overall_score")
          .in("session_id", sessionIds);
        if (reports && reports.length > 0) {
          avgScore = reports.reduce((sum, r) => sum + Number(r.overall_score), 0) / reports.length;
        }
      }

      setStats({
        projects: projectCount ?? 0,
        pending: pendingCount,
        completed: completedSessions.length,
        avgScore: Math.round(avgScore),
      });
      setRecentSessions(sessions ?? []);
    };

    loadData();
  }, [user]);

  const statCards = [
    { label: "Projets actifs", value: stats.projects, icon: FolderKanban, color: "text-primary" },
    { label: "En attente", value: stats.pending, icon: Users, color: "text-warning" },
    { label: "Complétés", value: stats.completed, icon: CheckCircle, color: "text-success" },
    { label: "Score moyen", value: stats.avgScore ? `${stats.avgScore}%` : "—", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune session pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                   <tr className="border-b text-left text-muted-foreground">
                     <th className="pb-2 font-medium">Candidat</th>
                     <th className="pb-2 font-medium">Poste</th>
                     <th className="pb-2 font-medium">Statut</th>
                     <th className="pb-2 font-medium">Date</th>
                     <th className="pb-2 font-medium"></th>
                   </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="border-b last:border-0">
                      <td className="py-3">{session.candidate_name}</td>
                      <td className="py-3">{(session.projects as any)?.job_title}</td>
                      <td className="py-3">
                        <SessionStatusBadge status={session.status} />
                      </td>
                       <td className="py-3 text-muted-foreground">
                         {new Date(session.created_at).toLocaleDateString("fr-FR")}
                       </td>
                       <td className="py-3">
                         {session.status === "completed" && (
                           <Button variant="ghost" size="sm" asChild>
                             <Link to={`/sessions/${session.id}`}>Voir</Link>
                           </Button>
                         )}
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
