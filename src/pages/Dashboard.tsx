import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderKanban,
  Users,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Trophy,
  BarChart3,
  BookOpen,
  LayoutTemplate,
  AlertTriangle,
} from "lucide-react";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const RECO_LABELS: Record<string, string> = {
  strong_yes: "Fortement recommandé",
  yes: "Recommandé",
  maybe: "À étudier",
  no: "Non retenu",
};
const RECO_ORDER = ["strong_yes", "yes", "maybe", "no"];
const RECO_COLORS: Record<string, string> = {
  strong_yes: "bg-success",
  yes: "bg-success/70",
  maybe: "bg-warning",
  no: "bg-destructive",
};

const QUOTES: { text: string; author: string }[] = [
  { text: "Le talent gagne des matchs, mais l'esprit d'équipe gagne des championnats.", author: "Michael Jordan" },
  { text: "Embauchez des gens plus intelligents que vous, puis laissez-les faire leur travail.", author: "Steve Jobs" },
  { text: "La meilleure façon de prédire l'avenir, c'est de le créer.", author: "Peter Drucker" },
  { text: "L'attention est la forme la plus rare et la plus pure de la générosité.", author: "Simone Weil" },
  { text: "Les gens oublieront ce que vous avez dit, mais jamais ce que vous leur avez fait ressentir.", author: "Maya Angelou" },
  { text: "Choisis un travail que tu aimes, et tu n'auras pas à travailler un seul jour de ta vie.", author: "Confucius" },
  { text: "La perfection est atteinte quand il n'y a plus rien à retrancher.", author: "Antoine de Saint-Exupéry" },
  { text: "Pour être irremplaçable, il faut être différent.", author: "Coco Chanel" },
  { text: "Se réunir est un début, rester ensemble est un progrès, travailler ensemble est la réussite.", author: "Henry Ford" },
  { text: "La culture mange la stratégie au petit-déjeuner.", author: "Peter Drucker" },
  { text: "Ne dites pas aux gens comment faire les choses, dites-leur quoi faire et laissez-les vous surprendre.", author: "George S. Patton" },
  { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
  { text: "Il faut toute une vie pour apprendre à écouter.", author: "Plutarque" },
  { text: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", author: "Antoine de Saint-Exupéry" },
  { text: "Un leader est celui qui connaît le chemin, suit le chemin et montre le chemin.", author: "John C. Maxwell" },
  { text: "La diversité est une invitation, l'inclusion une décision.", author: "Vernā Myers" },
  { text: "Le doute est le commencement de la sagesse.", author: "Aristote" },
  { text: "Faites ce que vous pouvez, avec ce que vous avez, là où vous êtes.", author: "Theodore Roosevelt" },
  { text: "L'expérience est le nom que chacun donne à ses erreurs.", author: "Oscar Wilde" },
  { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Mahatma Gandhi" },
];

function scoreColor(score: number) {
  if (score >= 65) return "bg-success/15 text-success border-success/30";
  if (score >= 45) return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    projects: 0,
    projectsThisMonth: 0,
    pending: 0,
    pendingStale: 0,
    completed30d: 0,
    completedTrendPct: 0 as number | null,
    avgScore30d: 0,
  });
  const [topCandidates, setTopCandidates] = useState<any[]>([]);
  const [recoDistribution, setRecoDistribution] = useState<Record<string, number>>({});
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [reportsBySession, setReportsBySession] = useState<Record<string, { score: number; recommendation: string | null }>>({});
  const [stalePending, setStalePending] = useState<any[]>([]);

  const firstName = (profile?.full_name || "").trim().split(" ")[0] || "";
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const now = new Date();
      const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        { count: projectCount },
        { count: projectsThisMonthCount },
        { data: sessions },
      ] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("sessions")
          .select("*, projects!inner(title, job_title)")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Sessions étendues pour stats 30j / pending stale
      const { data: pendingAll } = await supabase
        .from("sessions")
        .select("id, candidate_name, candidate_email, created_at, project_id, projects!inner(title)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      const pendingCount = pendingAll?.length ?? 0;
      const staleList = (pendingAll ?? []).filter((s) => new Date(s.created_at) < since7);

      // Reports 60j pour calcul tendance + score moyen + top + distribution
      const { data: reports } = await supabase
        .from("reports")
        .select("overall_score, recommendation, generated_at, session_id, sessions!inner(candidate_name, project_id, projects!inner(title))")
        .gte("generated_at", since60.toISOString())
        .order("overall_score", { ascending: false });

      const reports30 = (reports ?? []).filter((r) => new Date(r.generated_at) >= since30);
      const reportsPrev = (reports ?? []).filter(
        (r) => new Date(r.generated_at) < since30 && new Date(r.generated_at) >= since60,
      );

      const avgScore30d =
        reports30.length > 0
          ? reports30.reduce((s, r) => s + Number(r.overall_score), 0) / reports30.length
          : 0;

      const completed30d = reports30.length;
      const completedPrev = reportsPrev.length;
      const completedTrendPct =
        completedPrev > 0
          ? Math.round(((completed30d - completedPrev) / completedPrev) * 100)
          : null;

      // Distribution des recommandations
      const dist: Record<string, number> = {};
      RECO_ORDER.forEach((k) => (dist[k] = 0));
      reports30.forEach((r) => {
        if (r.recommendation && dist[r.recommendation] !== undefined) {
          dist[r.recommendation]++;
        }
      });

      const top = [...reports30]
        .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
        .slice(0, 5);

      setStats({
        projects: projectCount ?? 0,
        projectsThisMonth: projectsThisMonthCount ?? 0,
        pending: pendingCount,
        pendingStale: staleList.length,
        completed30d,
        completedTrendPct,
        avgScore30d: Math.round(avgScore30d),
      });
      setTopCandidates(top);
      setRecoDistribution(dist);
      setRecentSessions(sessions ?? []);
      setStalePending(staleList);

      // Fetch reports for the recent sessions to enrich the table
      const recentIds = (sessions ?? []).map((s) => s.id);
      if (recentIds.length > 0) {
        const { data: recentReports } = await supabase
          .from("reports")
          .select("session_id, overall_score, recommendation")
          .in("session_id", recentIds);
        const map: Record<string, { score: number; recommendation: string | null }> = {};
        (recentReports ?? []).forEach((r) => {
          map[r.session_id] = {
            score: Math.round(Number(r.overall_score)),
            recommendation: r.recommendation,
          };
        });
        setReportsBySession(map);
      }
    };

    loadData();
  }, [user]);

  const totalReco = Object.values(recoDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête + actions rapides */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour{firstName ? ` ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm italic text-muted-foreground mt-1">« {quote.text} »</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">— {quote.author}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/projects/new">
              <Plus className="h-4 w-4" />
              Nouveau projet
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/question-library">
              <BookOpen className="h-4 w-4" />
              Bibliothèque
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projets actifs</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
            {stats.projectsThisMonth > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{stats.projectsThisMonth} ce mois
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            {stats.pendingStale > 0 && (
              <p className="text-xs text-warning mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.pendingStale} depuis plus de 7 jours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Complétés (30j)</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed30d}</div>
            {stats.completedTrendPct !== null && (
              <p
                className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  stats.completedTrendPct >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {stats.completedTrendPct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stats.completedTrendPct >= 0 ? "+" : ""}
                {stats.completedTrendPct}% vs période précédente
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score moyen (30j)</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore30d}%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  stats.avgScore30d >= 65
                    ? "bg-success"
                    : stats.avgScore30d >= 45
                    ? "bg-warning"
                    : "bg-destructive",
                )}
                style={{ width: `${stats.avgScore30d}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte candidats inactifs */}
      {stats.pendingStale > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span>
                <strong>{stats.pendingStale}</strong> candidat{stats.pendingStale > 1 ? "s" : ""} n'
                {stats.pendingStale > 1 ? "ont" : "a"} pas démarré depuis plus de 7 jours
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>
              Voir la liste
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top candidats + Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Meilleurs candidats (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rapport sur les 30 derniers jours.</p>
            ) : (
              <ul className="space-y-3">
                {topCandidates.map((r) => {
                  const score = Math.round(Number(r.overall_score));
                  const candidateName = (r.sessions as any)?.candidate_name ?? "—";
                  const projectTitle = (r.sessions as any)?.projects?.title ?? "";
                  return (
                    <li key={r.session_id}>
                      <Link
                        to={`/sessions/${r.session_id}`}
                        className="flex items-center justify-between gap-3 rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{candidateName}</div>
                          <div className="text-xs text-muted-foreground truncate">{projectTitle}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-xs font-semibold",
                              scoreColor(score),
                            )}
                          >
                            {score}%
                          </span>
                          <RecommendationBadge recommendation={r.recommendation} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Recommandations (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalReco === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune recommandation sur la période.</p>
            ) : (
              <ul className="space-y-3">
                {RECO_ORDER.map((key) => {
                  const count = recoDistribution[key] ?? 0;
                  const pct = totalReco > 0 ? (count / totalReco) * 100 : 0;
                  return (
                    <li key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{RECO_LABELS[key]}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full transition-all", RECO_COLORS[key])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Derniers entretiens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers entretiens</CardTitle>
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
                    <th className="pb-2 font-medium">Projet</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Score</th>
                    <th className="pb-2 font-medium">Recommandation</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session) => {
                    const isCompleted = session.status === "completed";
                    const onRowClick = () => {
                      if (isCompleted) navigate(`/sessions/${session.id}`);
                    };
                    return (
                      <tr
                        key={session.id}
                        onClick={onRowClick}
                        className={cn(
                          "border-b last:border-0",
                          isCompleted && "cursor-pointer hover:bg-muted/40 transition-colors",
                        )}
                      >
                        <td className="py-3">{session.candidate_name}</td>
                        <td className="py-3">{(session.projects as any)?.title}</td>
                        <td className="py-3">
                          <SessionStatusBadge status={session.status} />
                        </td>
                        <td className="py-3">
                          {reportsBySession[session.id] ? (
                            <span
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-xs font-semibold",
                                scoreColor(reportsBySession[session.id].score),
                              )}
                            >
                              {reportsBySession[session.id].score}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {reportsBySession[session.id]?.recommendation ? (
                            <RecommendationBadge
                              recommendation={reportsBySession[session.id].recommendation}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cet entretien ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action supprimera l'entretien de {session.candidate_name} et
                                  toutes les données associées. Irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    const { data: reports } = await supabase
                                      .from("reports")
                                      .select("id")
                                      .eq("session_id", session.id);
                                    if (reports && reports.length > 0) {
                                      await supabase
                                        .from("report_shares")
                                        .delete()
                                        .in("report_id", reports.map((r) => r.id));
                                    }
                                    await supabase
                                      .from("session_messages")
                                      .delete()
                                      .eq("session_id", session.id);
                                    await supabase.from("reports").delete().eq("session_id", session.id);
                                    await supabase
                                      .from("transcripts")
                                      .delete()
                                      .eq("session_id", session.id);
                                    await supabase.from("sessions").delete().eq("id", session.id);
                                    setRecentSessions((prev) =>
                                      prev.filter((s) => s.id !== session.id),
                                    );
                                    toast({ title: "Entretien supprimé" });
                                  }}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
