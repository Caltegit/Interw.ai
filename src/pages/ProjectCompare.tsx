import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { ArrowLeft } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6"];

interface CandidateReport {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  overallScore: number;
  recommendation: string | null;
  criteriaScores: Record<string, { label: string; score: number; max: number }>;
}

export default function ProjectCompare() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [candidates, setCandidates] = useState<CandidateReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const [pRes, sRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("sessions").select("id, candidate_name, candidate_email").eq("project_id", id).eq("status", "completed" as never),
      ]);

      setProject(pRes.data);

      if (!sRes.data?.length) {
        setLoading(false);
        return;
      }

      const sessionIds = sRes.data.map((s) => s.id);
      const { data: reports } = await supabase
        .from("reports")
        .select("*")
        .in("session_id", sessionIds);

      const candidateReports: CandidateReport[] = (reports ?? []).map((r) => {
        const session = sRes.data!.find((s) => s.id === r.session_id);
        return {
          sessionId: r.session_id,
          candidateName: session?.candidate_name ?? "Inconnu",
          candidateEmail: session?.candidate_email ?? "",
          overallScore: Number(r.overall_score),
          recommendation: r.recommendation,
          criteriaScores: (r.criteria_scores as Record<string, any>) ?? {},
        };
      });

      // Sort by overall score desc
      candidateReports.sort((a, b) => b.overallScore - a.overallScore);
      setCandidates(candidateReports);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!project) return <p>Projet introuvable</p>;

  // Build radar data from criteria
  const criteriaLabels = new Set<string>();
  candidates.forEach((c) =>
    Object.entries(c.criteriaScores).forEach(([, val]) => criteriaLabels.add(val.label || "Critère"))
  );

  const radarData = Array.from(criteriaLabels).map((label) => {
    const entry: Record<string, any> = { criterion: label };
    candidates.forEach((c) => {
      const match = Object.values(c.criteriaScores).find((v) => (v.label || "Critère") === label);
      entry[c.candidateName] = match ? Math.round((match.score / match.max) * 100) : 0;
    });
    return entry;
  });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to={`/projects/${project.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Comparaison des candidats</h1>
        <p className="text-muted-foreground">{project.title}</p>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun candidat avec un rapport généré pour ce projet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Ranking table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium w-10">#</th>
                      <th className="pb-2 font-medium">Candidat</th>
                      <th className="pb-2 font-medium">Score</th>
                      <th className="pb-2 font-medium">Recommandation</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, i) => (
                      <tr key={c.sessionId} className="border-b last:border-0">
                        <td className="py-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <p className="font-medium">{c.candidateName}</p>
                          <p className="text-xs text-muted-foreground">{c.candidateEmail}</p>
                        </td>
                        <td className="py-3">
                          <Badge variant={c.overallScore >= 70 ? "default" : c.overallScore >= 50 ? "secondary" : "destructive"}>
                            {c.overallScore}%
                          </Badge>
                        </td>
                        <td className="py-3">
                          <RecommendationBadge recommendation={c.recommendation} />
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/sessions/${c.sessionId}`}>Détails</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Radar chart */}
          {radarData.length > 0 && candidates.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparaison par critère</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      {candidates.map((c, i) => (
                        <Radar
                          key={c.sessionId}
                          name={c.candidateName}
                          dataKey={c.candidateName}
                          stroke={COLORS[i % COLORS.length]}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Criteria breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail par critère</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Critère</th>
                      {candidates.map((c) => (
                        <th key={c.sessionId} className="pb-2 font-medium">{c.candidateName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(criteriaLabels).map((label) => (
                      <tr key={label} className="border-b last:border-0">
                        <td className="py-2 font-medium">{label}</td>
                        {candidates.map((c) => {
                          const match = Object.values(c.criteriaScores).find((v) => (v.label || "Critère") === label);
                          const pct = match ? Math.round((match.score / match.max) * 100) : 0;
                          return (
                            <td key={c.sessionId} className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-muted">
                                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs">{match ? `${match.score}/${match.max}` : "—"}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
