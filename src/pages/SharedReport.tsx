import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreCircle } from "@/components/ScoreCircle";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { SimpleMessageList } from "@/components/session/SimpleMessageList";
import { Video, Play, MessageSquare, Clock } from "lucide-react";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}

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

      // Fallback vidéo principale si absente
      if (sessionData && !sessionData.video_recording_url) {
        const firstCandidateVideo = (msgs ?? []).find(
          (m: any) => m.role === "candidate" && m.video_segment_url,
        );
        if (firstCandidateVideo?.video_segment_url) {
          (sessionData as any)._fallback_video = firstCandidateVideo.video_segment_url;
        }
      }

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
  const videoUrl = session?.video_recording_url || (session as any)?._fallback_video || null;
  const candidateVideos = messages.filter((m: any) => m.role === "candidate" && m.video_segment_url);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold">Rapport de session</h1>
        {session && (
          <>
            <p className="text-lg font-medium">{session.candidate_name}</p>
            <p className="text-muted-foreground">{project?.title}</p>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <span>
                {new Date(session.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {session.duration_seconds ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(session.duration_seconds)}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Colonne gauche */}
        <div className="space-y-4">
          {videoUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4" /> Enregistrement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {report && (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center gap-6">
                <ScoreCircle score={Number(report.overall_score)} />
                <div className="space-y-2">
                  <RecommendationBadge recommendation={report.recommendation} />
                  {report.overall_grade && <Badge variant="outline">{report.overall_grade}</Badge>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite — onglets */}
        <div>
          <Tabs defaultValue="report">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript" className="flex items-center justify-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Transcription ({messages.length})</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center justify-center gap-1">
                <Play className="h-4 w-4" /> <span>Vidéos</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center justify-center gap-1">
                <span>📊</span> <span>Rapport</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucun message enregistré.
                    </div>
                  ) : (
                    <SimpleMessageList messages={messages} aiPersonaName={project?.ai_persona_name} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="mt-4 space-y-4">
              {candidateVideos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-30 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Aucune vidéo par question disponible.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                candidateVideos.map((m: any, i: number) => (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Play className="h-4 w-4 text-primary" /> Question {i + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                        <video
                          src={m.video_segment_url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="report" className="mt-4 space-y-4">
              {report ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Résumé</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{report.executive_summary}</p>
                    </CardContent>
                  </Card>

                  {report.strengths?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Points forts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {(report.strengths as string[]).map((s, i) => (
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
                      <CardHeader>
                        <CardTitle className="text-base">Axes d'amélioration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {(report.areas_for_improvement as string[]).map((s, i) => (
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
                      <CardHeader>
                        <CardTitle className="text-base">Scores par critère</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(criteriaScores).map(([key, val]: [string, any]) => (
                          <div key={key}>
                            <div className="flex justify-between text-sm">
                              <span>{val.label || key}</span>
                              <span className="font-medium">
                                {val.score}/{val.max}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${(val.score / val.max) * 100}%` }}
                              />
                            </div>
                            {val.comment && (
                              <p className="text-xs text-muted-foreground mt-1">{val.comment}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {Object.keys(questionEvaluations).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Évaluations par question</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {Object.entries(questionEvaluations).map(([key, val]: [string, any]) => {
                          const qIndex = parseInt(key);
                          const matchingVideo = candidateVideos[qIndex] || candidateVideos[qIndex - 1];
                          return (
                            <div
                              key={key}
                              className="space-y-2 pb-4 border-b last:border-0 last:pb-0"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-medium flex-1">
                                  {val.question || `Question ${qIndex + 1}`}
                                </p>
                                <Badge variant="outline" className="shrink-0">
                                  {val.score}/10
                                </Badge>
                              </div>
                              {matchingVideo?.video_segment_url && (
                                <div className="rounded-lg overflow-hidden bg-muted aspect-video max-w-sm">
                                  <video
                                    src={matchingVideo.video_segment_url}
                                    controls
                                    preload="metadata"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              {val.comment && (
                                <p className="text-xs text-muted-foreground">{val.comment}</p>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Rapport non encore généré</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Rapport partagé via un lien sécurisé · Généré par Interw.ai
      </p>
    </div>
  );
}
