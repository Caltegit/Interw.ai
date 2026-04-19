import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreCircle } from "@/components/ScoreCircle";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { Video } from "lucide-react";

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      // Find share
      const { data: share, error: shareError } = await (supabase.from("report_shares" as any) as any)
        .select("report_id, is_active, expires_at")
        .eq("share_token", token)
        .single();

      if (shareError || !share) {
        setError("Lien de partage introuvable ou expiré.");
        setLoading(false);
        return;
      }

      if (!share.is_active) {
        setError("Ce lien de partage a été désactivé.");
        setLoading(false);
        return;
      }

      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        setError("Ce lien de partage a expiré.");
        setLoading(false);
        return;
      }

      // Load report
      const { data: reportData } = await supabase
        .from("reports")
        .select("*")
        .eq("id", share.report_id)
        .single();

      if (!reportData) {
        setError("Rapport introuvable.");
        setLoading(false);
        return;
      }

      // Load session info
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("candidate_name, candidate_email, created_at, duration_seconds, video_recording_url, projects(title, job_title)")
        .eq("id", reportData.session_id)
        .single();

      // Load candidate video segments if no main recording
      if (sessionData && !sessionData.video_recording_url) {
        const { data: msgs } = await supabase
          .from("session_messages")
          .select("video_segment_url")
          .eq("session_id", reportData.session_id)
          .eq("role", "candidate" as any)
          .not("video_segment_url", "is", null)
          .order("timestamp")
          .limit(1);
        if (msgs?.[0]?.video_segment_url) {
          (sessionData as any)._fallback_video = msgs[0].video_segment_url;
        }
      }

      setReport(reportData);
      setSession(sessionData);
      setLoading(false);
    };

    loadReport();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const project = (session as any)?.projects;
  const videoUrl = session?.video_recording_url || (session as any)?._fallback_video || null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Rapport d'entretien</h1>
        {session && (
          <div>
            <p className="text-lg font-medium">{session.candidate_name}</p>
            <p className="text-muted-foreground">{project?.title}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(session.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {videoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-4 w-4" /> Enregistrement vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden bg-muted aspect-video">
              <video src={videoUrl} controls playsInline className="w-full h-full object-contain" preload="metadata" />
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          <Card>
            <CardContent className="pt-6 flex items-center justify-center gap-6">
              <ScoreCircle score={Number(report.overall_score)} />
              <div className="space-y-2">
                <RecommendationBadge recommendation={report.recommendation} />
                {report.overall_grade && <Badge variant="outline">{report.overall_grade}</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{report.executive_summary}</p></CardContent>
          </Card>

          {report.strengths?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(report.strengths as string[]).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-success mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {report.areas_for_improvement?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Axes d'amélioration</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(report.areas_for_improvement as string[]).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-warning mt-0.5">⚠</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {Object.keys(criteriaScores).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Scores par critère</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(criteriaScores).map(([key, val]: [string, any]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span>{val.label || key}</span>
                      <span className="font-medium">{val.score}/{val.max}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(val.score / val.max) * 100}%` }} />
                    </div>
                    {val.comment && <p className="text-xs text-muted-foreground mt-1">{val.comment}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Ce rapport a été partagé via un lien sécurisé. • Généré par Interw.ai
      </p>
    </div>
  );
}
