import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/queries/useDashboardData";
import { queryKeys } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
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
  const queryClient = useQueryClient();
  const { data } = useDashboardData(user?.id);

  const stats = data?.stats ?? {
    projects: 0,
    projectsThisMonth: 0,
    pending: 0,
    pendingStale: 0,
    completed30d: 0,
    completedTrendPct: null as number | null,
    avgScore30d: 0,
  };
  const topCandidates = data?.topCandidates ?? [];
  const recoDistribution = data?.recoDistribution ?? {};
  const recentSessions = data?.recentSessions ?? [];
  const reportsBySession = data?.reportsBySession ?? {};

  const firstName = (profile?.full_name || "").trim().split(" ")[0] || "";
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

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
