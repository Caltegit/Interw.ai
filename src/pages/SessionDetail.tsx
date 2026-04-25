import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import {
  ArrowLeft,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Play,
  FileText,
  Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSessionDetail,
  useUpdateRecruiterNotes,
  useCreateReportShare,
} from "@/hooks/queries/useSessionDetail";
import { VirtualizedMessageList } from "@/components/session/VirtualizedMessageList";
import { OverviewHeader } from "@/components/session/OverviewHeader";
import { SessionStatsCard } from "@/components/session/SessionStatsCard";
import { HighlightReelPlayer, HighlightClip } from "@/components/session/HighlightReelPlayer";
import { AiAnalysisDisclaimer } from "@/components/session/AiAnalysisDisclaimer";
import { ExecutiveSummaryCard } from "@/components/session/ExecutiveSummaryCard";
import { PersonalityRadar } from "@/components/session/PersonalityRadar";
import { SoftSkillsCard } from "@/components/session/SoftSkillsCard";
import { RedFlagsCard } from "@/components/session/RedFlagsCard";
import { MotivationScoresCard } from "@/components/session/MotivationScoresCard";
import { FollowupQuestionsCard } from "@/components/session/FollowupQuestionsCard";

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

  useEffect(() => {
    if (report?.id && !notesInitialized) {
      setRecruiterNotes(report.recruiter_notes ?? "");
      setNotesInitialized(true);
    }
  }, [report?.id, report?.recruiter_notes, notesInitialized]);

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
      toast({ title: "Lien de partage créé et copié." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié." });
  };

  const candidateVideos = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && m.video_segment_url),
    [messages],
  );

  const questionEvaluations = (report?.question_evaluations as Record<string, any>) ?? {};
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const rawHighlightClips = (report?.highlight_clips as unknown as HighlightClip[]) ?? [];
  const stats = (report?.stats as Record<string, any>) ?? {};

  const project = session?.projects;
  const projectQuestions = (project?.questions as any[]) ?? [];

  // Construit la vue "Questions" à partir des vidéos candidat (réponses principales,
  // hors follow-ups). Joint l'évaluation IA via question_id quand disponible,
  // sinon retombe sur l'index. Les vidéos sont toujours affichées, même sans IA.
  const questionItems = useMemo(() => {
    const mainAnswers = candidateVideos.filter((m: any) => !m.is_follow_up);
    const evalByQuestionId = new Map<string, any>();
    const evalByIndex = new Map<number, any>();
    Object.entries(questionEvaluations).forEach(([key, val]: [string, any]) => {
      const idx = parseInt(key);
      if (!Number.isNaN(idx)) evalByIndex.set(idx, val);
      if (val?.question_id) evalByQuestionId.set(val.question_id, val);
    });

    return mainAnswers.map((video: any, idx: number) => {
      const evalEntry =
        (video.question_id && evalByQuestionId.get(video.question_id)) ||
        evalByIndex.get(idx);
      const projectQ = video.question_id
        ? projectQuestions.find((q: any) => q.id === video.question_id)
        : projectQuestions[idx];
      return {
        index: idx,
        video,
        questionText: evalEntry?.question || projectQ?.content || `Question ${idx + 1}`,
        score: typeof evalEntry?.score === "number" ? evalEntry.score : null,
        comment: evalEntry?.comment ?? "",
      };
    });
  }, [candidateVideos, questionEvaluations, projectQuestions]);

  // Best-of : si l'IA n'a rien produit, fallback sur les vidéos chronologiques
  // pour ne jamais afficher une page vide quand il y a des enregistrements.
  const highlightClips = useMemo<HighlightClip[]>(() => {
    if (rawHighlightClips.length > 0) return rawHighlightClips;
    return questionItems.slice(0, 3).map((item) => ({
      video_url: item.video.video_segment_url,
      question: item.questionText,
      score: item.score ?? 0,
      question_index: item.index,
      max_seconds: 20,
    }));
  }, [rawHighlightClips, questionItems]);

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  if (!session) return <p>Session introuvable.</p>;

  

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/projects/${session.project_id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <SessionStatusBadge status={session.status} />
          {report &&
            (shareUrl ? (
              <Button variant="outline" size="sm" onClick={copyShareUrl}>
                {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copied ? "Copié" : "Copier le lien de partage"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleShare} disabled={createShare.isPending}>
                <Share2 className="mr-1 h-4 w-4" />
                {createShare.isPending ? "Génération…" : "Partager"}
              </Button>
            ))}
        </div>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <SessionStatsCard stats={stats} questionEvaluations={questionEvaluations} />

          {report && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notes recruteur</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ajoutez vos observations…"
                  value={recruiterNotes}
                  onChange={(e) => setRecruiterNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>
          )}
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
                  {(report.executive_summary_short ||
                    report.personality_profile ||
                    report.soft_skills ||
                    report.red_flags ||
                    report.motivation_scores ||
                    report.followup_questions) && <AiAnalysisDisclaimer />}

                  <ExecutiveSummaryCard summary={report.executive_summary_short ?? ""} />

                  <Card>
                    <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
                    <CardContent><p className="text-sm leading-relaxed">{report.executive_summary}</p></CardContent>
                  </Card>

                  <PersonalityRadar profile={report.personality_profile as any} />
                  <SoftSkillsCard skills={report.soft_skills as any} />
                  <MotivationScoresCard scores={report.motivation_scores as any} />
                  <RedFlagsCard flags={report.red_flags as any} />
                  <FollowupQuestionsCard questions={report.followup_questions as any} />

                  <div className="grid gap-4 md:grid-cols-2">
                    {report.strengths?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">Points forts</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {(report.strengths as string[]).map((s, i) => (
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
                            {(report.areas_for_improvement as string[]).map((s, i) => (
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      Le rapport sera généré automatiquement après l'analyse de la session.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="questions" className="mt-4 space-y-4">
              {questionItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Aucune réponse vidéo enregistrée pour cette session.
                  </CardContent>
                </Card>
              ) : (
                questionItems.map((item) => (
                  <Card key={item.video.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="flex-1 text-sm">
                          Q{item.index + 1} — {item.questionText}
                        </CardTitle>
                        {item.score !== null && (
                          <Badge variant="outline">{item.score}/10</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="overflow-hidden rounded-lg bg-muted aspect-video">
                        <video
                          src={item.video.video_segment_url}
                          controls
                          preload="metadata"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      {item.comment ? (
                        <p className="text-xs text-muted-foreground">{item.comment}</p>
                      ) : item.score === null ? (
                        <p className="text-xs italic text-muted-foreground">
                          Évaluation IA indisponible pour cette question.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
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

            <TabsContent value="best-of" className="mt-4">
              <HighlightReelPlayer clips={highlightClips} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
