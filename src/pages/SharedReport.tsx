import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewHeader } from "@/components/session/OverviewHeader";
import { SessionStatsCard } from "@/components/session/SessionStatsCard";
import { HighlightReelPlayer, HighlightClip } from "@/components/session/HighlightReelPlayer";
import { SimpleMessageList } from "@/components/session/SimpleMessageList";
import { Play, MessageSquare, FileText, Trophy } from "lucide-react";

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadReport = async () => {
      const { data: share, error: shareError } = await supabase
        .from("report_shares")
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

      const { data: sessionData } = await supabase
        .from("sessions")
        .select(
          "id, candidate_name, candidate_email, created_at, duration_seconds, video_recording_url, project_id, projects(title, job_title, ai_persona_name)",
        )
        .eq("id", reportData.session_id)
        .single();

      const { data: msgs } = await supabase
        .from("session_messages")
        .select("id, role, content, timestamp, video_segment_url, audio_segment_url, question_id, is_follow_up")
        .eq("session_id", reportData.session_id)
        .order("timestamp");

      setReport(reportData);
      setSession(sessionData);
      setProject((sessionData as any)?.projects ?? null);
      setMessages(msgs ?? []);
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
  const questionEvaluations = (report?.question_evaluations as Record<string, any>) ?? {};
  const candidateVideos = messages.filter((m: any) => m.role === "candidate" && m.video_segment_url);
  const highlightClips = (report?.highlight_clips as unknown as HighlightClip[]) ?? [];
  const stats = (report?.stats as Record<string, any>) ?? {};

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {session && (
        <OverviewHeader
          candidateName={session.candidate_name}
          candidateEmail={session.candidate_email}
          jobTitle={project?.job_title}
          projectTitle={project?.title}
          createdAt={session.created_at}
          durationSeconds={session.duration_seconds}
          messagesCount={messages.length}
          videoAnswersCount={candidateVideos.length}
          criteriaCount={Object.keys(criteriaScores).length}
          questionsEvaluatedCount={Object.keys(questionEvaluations).length}
          overallScore={report ? Number(report.overall_score) : null}
          overallGrade={report?.overall_grade}
          recommendation={report?.recommendation}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <SessionStatsCard stats={stats} questionEvaluations={questionEvaluations} />
        </div>

        <div>
          <Tabs defaultValue="synthesis">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="synthesis" className="gap-1">
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Synthèse</span>
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-1">
                <Play className="h-4 w-4" /> <span className="hidden sm:inline">Questions</span>
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-1">
                <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Transcription</span>
              </TabsTrigger>
              <TabsTrigger value="best-of" className="gap-1">
                <Trophy className="h-4 w-4" /> <span className="hidden sm:inline">Best-of</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="synthesis" className="mt-4 space-y-4">
              {report ? (
                <>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
                    <CardContent><p className="text-sm leading-relaxed">{report.executive_summary}</p></CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    {report.strengths?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {(report.strengths as string[]).map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="mt-0.5 text-success">✓</span> {s}
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
                          <ul className="space-y-1.5">
                            {(report.areas_for_improvement as string[]).map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="mt-0.5 text-warning">⚠</span> {s}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

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
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${(val.score / val.max) * 100}%` }}
                              />
                            </div>
                            {val.comment && <p className="mt-1 text-xs text-muted-foreground">{val.comment}</p>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Rapport non encore généré.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="questions" className="mt-4 space-y-4">
              {Object.keys(questionEvaluations).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Aucune évaluation par question disponible.
                  </CardContent>
                </Card>
              ) : (
                Object.entries(questionEvaluations).map(([key, val]: [string, any]) => {
                  const qIndex = parseInt(key);
                  const matchingVideo = candidateVideos[qIndex] || candidateVideos[qIndex - 1];
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="flex-1 text-sm">
                            Q{qIndex + 1} — {val.question || `Question ${qIndex + 1}`}
                          </CardTitle>
                          <Badge variant="outline">{val.score}/10</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {matchingVideo?.video_segment_url && (
                          <div className="overflow-hidden rounded-lg bg-muted aspect-video">
                            <video
                              src={matchingVideo.video_segment_url}
                              controls
                              preload="metadata"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        {val.comment && <p className="text-xs text-muted-foreground">{val.comment}</p>}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Aucun message enregistré.
                    </div>
                  ) : (
                    <SimpleMessageList messages={messages} aiPersonaName={project?.ai_persona_name} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="best-of" className="mt-4">
              <HighlightReelPlayer clips={highlightClips} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Rapport partagé via un lien sécurisé · Généré par Interw.ai
      </p>
    </div>
  );
}
