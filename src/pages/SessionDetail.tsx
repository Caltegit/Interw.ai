import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { ScoreCircle } from "@/components/ScoreCircle";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { ArrowLeft, Clock, Calendar, Video, MessageSquare, Share2, Copy, Check, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSessionDetail,
  useUpdateRecruiterNotes,
  useCreateReportShare,
} from "@/hooks/queries/useSessionDetail";
import { VirtualizedMessageList } from "@/components/session/VirtualizedMessageList";

export default function SessionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useSessionDetail(id);
  const session = data?.session ?? null;
  const report = data?.report ?? null;
  const messages = data?.messages ?? [];
  const shareUrl = data?.shareUrl ?? null;

  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [notesInitialized, setNotesInitialized] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const updateNotes = useUpdateRecruiterNotes(id);
  const createShare = useCreateReportShare(id);

  // Initialise les notes une seule fois quand le rapport arrive
  useEffect(() => {
    if (report?.id && !notesInitialized) {
      setRecruiterNotes(report.recruiter_notes ?? "");
      setNotesInitialized(true);
    }
  }, [report?.id, report?.recruiter_notes, notesInitialized]);

  // Sauvegarde auto avec debounce
  useEffect(() => {
    if (!report?.id || !notesInitialized) return;
    if ((report.recruiter_notes ?? "") === recruiterNotes) return;
    const timeout = setTimeout(() => {
      updateNotes.mutate({ reportId: report.id, notes: recruiterNotes });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [recruiterNotes, report?.id, report?.recruiter_notes, notesInitialized]);

  const handleShare = async () => {
    if (!report?.id || !user) return;
    try {
      const url = await createShare.mutateAsync({ reportId: report.id, userId: user.id });
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien de partage créé et copié !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié !" });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!session) return <p>Session introuvable</p>;

  const project = session.projects;
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const candidateVideos = messages.filter((m: any) => m.role === "candidate" && m.video_segment_url);
  const primaryVideoUrl = session.video_recording_url || candidateVideos[0]?.video_segment_url || null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link to={`/projects/${session.project_id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{session.candidate_name}</h1>
          <p className="text-muted-foreground">{session.candidate_email} • {project?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <SessionStatusBadge status={session.status} />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(session.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          {session.duration_seconds && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatDuration(session.duration_seconds)}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4" /> Enregistrement vidéo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {primaryVideoUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                    <video src={primaryVideoUrl} controls playsInline className="w-full h-full object-contain" preload="metadata" />
                  </div>
                  {!session.video_recording_url && candidateVideos.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Affichage de la vidéo de réponse par question. Retrouvez toutes les séquences dans l’onglet « Vidéos ».
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mb-2 opacity-30" />
                  <p className="text-sm">Aucune vidéo disponible</p>
                </div>
              )}
            </CardContent>
          </Card>

          {report && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-6">
                  <ScoreCircle score={Number(report.overall_score)} />
                  <div className="space-y-2">
                    <RecommendationBadge recommendation={report.recommendation} />
                    {report.overall_grade && <Badge variant="outline">{report.overall_grade}</Badge>}
                  </div>
                </div>

                {/* Share button */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  {shareUrl ? (
                    <Button variant="outline" size="sm" onClick={copyShareUrl}>
                      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                      {copied ? "Copié !" : "Copier le lien de partage"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleShare} disabled={createShare.isPending}>
                      <Share2 className="mr-1 h-4 w-4" />
                      {createShare.isPending ? "Génération..." : "Partager ce rapport"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Tabs defaultValue="transcript">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="transcript" className="flex items-center justify-center gap-1">
                <MessageSquare className="h-4 w-4" /> <span>Transcription ({messages.length})</span>
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
                      Aucun message enregistré pour cette session.
                    </div>
                  ) : (
                    <VirtualizedMessageList
                      messages={messages}
                      aiPersonaName={project?.ai_persona_name}
                      activeIndex={activeMessageIndex}
                      onSelect={setActiveMessageIndex}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos" className="mt-4 space-y-4">
              {candidateVideos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-30 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">Aucune vidéo par question disponible pour cette session.</p>
                  </CardContent>
                </Card>
              ) : (
                candidateVideos.map((m: any, i: number) => (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Play className="h-4 w-4 text-primary" />
                        Question {i + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                        <video src={m.video_segment_url} controls playsInline preload="metadata" className="w-full h-full object-contain" />
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
                    <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{report.executive_summary}</p></CardContent>
                  </Card>

                  {report.strengths?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
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
                      <CardHeader><CardTitle className="text-base">Axes d'amélioration</CardTitle></CardHeader>
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

                  {/* Évaluations par question avec vidéo */}
                  {report.question_evaluations && Object.keys(report.question_evaluations as Record<string, any>).length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Évaluations par question</CardTitle></CardHeader>
                      <CardContent className="space-y-6">
                        {Object.entries(report.question_evaluations as Record<string, any>).map(([key, val]: [string, any]) => {
                          // Find matching candidate message with video for this question index
                          const qIndex = parseInt(key);
                          const candidateVideos = messages.filter((m: any) => m.role === "candidate" && m.video_segment_url);
                          const matchingVideo = candidateVideos[qIndex] || candidateVideos[qIndex - 1];

                          return (
                            <div key={key} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-medium flex-1">{val.question || `Question ${parseInt(key) + 1}`}</p>
                                <Badge variant="outline" className="shrink-0">{val.score}/10</Badge>
                              </div>
                              {matchingVideo?.video_segment_url && (
                                <div className="rounded-lg overflow-hidden bg-muted aspect-video max-w-sm">
                                  <video src={matchingVideo.video_segment_url} controls preload="metadata" className="w-full h-full object-contain" />
                                </div>
                              )}
                              {val.comment && <p className="text-xs text-muted-foreground">{val.comment}</p>}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader><CardTitle className="text-base">Notes recruteur</CardTitle></CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Ajoutez vos observations personnelles…"
                        value={recruiterNotes}
                        onChange={(e) => setRecruiterNotes(e.target.value)}
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Rapport non encore généré</p>
                    <p className="text-xs text-muted-foreground mt-1">Le rapport sera généré automatiquement après l'analyse de l'session.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
