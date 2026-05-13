import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, MessageSquare, Play, FileText, Sparkles, Loader2, VideoOff, Trash2, Brain, Mic, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import {
  useSessionDetail,
  useUpdateRecruiterNotes,
  useCreateReportShare,
  useUpdateRecruiterDecision,
  useRegenerateReport,
  type RecruiterDecision,
} from "@/hooks/queries/useSessionDetail";
import { useProjectAverages } from "@/hooks/queries/useProjectAverages";
import { VirtualizedMessageList } from "@/components/session/VirtualizedMessageList";


import { SessionVideoNavigator, SessionVideoClip, SessionVideoNavigatorHandle } from "@/components/session/SessionVideoNavigator";
import { DecisionBanner } from "@/components/session/DecisionBanner";
import { BulkEmailDialog } from "@/components/project/BulkEmailDialog";
import { FitBreakdownCard } from "@/components/session/FitBreakdownCard";
import { SignalsCard } from "@/components/session/SignalsCard";
import { CommunicationProfileCard } from "@/components/session/CommunicationProfileCard";
import { ParaverbalProfileCard } from "@/components/session/ParaverbalProfileCard";
import { QuestionAnswerRow } from "@/components/session/QuestionAnswerRow";
import { DeepAnalysisAccordion } from "@/components/session/DeepAnalysisAccordion";
import { BigFiveBadge } from "@/components/session/BigFiveBadge";
import { ParaverbalBadge } from "@/components/session/ParaverbalBadge";
import { NonverbalProfileCard } from "@/components/session/NonverbalProfileCard";
import { NonverbalTabContent } from "@/components/session/NonverbalTabContent";
import { NonverbalBadge } from "@/components/session/NonverbalBadge";
import { PersonalityRadar } from "@/components/session/PersonalityRadar";
import { SoftSkillsCard } from "@/components/session/SoftSkillsCard";
import { ProjectComparisonCard } from "@/components/session/ProjectComparisonCard";

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")}`;
};

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
  const [activeTab, setActiveTab] = useState("decision");
  const [copied, setCopied] = useState(false);
  const [retranscribing, setRetranscribing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzingVoice, setAnalyzingVoice] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateNotes = useUpdateRecruiterNotes(id);
  const createShare = useCreateReportShare(id);
  const updateDecision = useUpdateRecruiterDecision(id);
  const regenerate = useRegenerateReport(id);
  const { data: projectAverages } = useProjectAverages(session?.project_id);

  const candidateMessagesWithMedia = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && (m.video_segment_url || m.audio_segment_url)),
    [messages],
  );
  const pendingTranscriptionCount = useMemo(
    () => candidateMessagesWithMedia.filter((m: any) => m.transcription_status !== "done").length,
    [candidateMessagesWithMedia],
  );

  const handleRetranscribe = async (force: boolean) => {
    if (!id || retranscribing) return;
    setRetranscribing(true);
    toast({ title: "Re-transcription en cours…", description: "L'IA relit les vidéos. Cela peut prendre une minute." });
    try {
      const { data: result, error } = await supabase.functions.invoke("transcribe-session", {
        body: { session_id: id, force },
      });
      if (error) throw error;
      const r = result as { processed?: number; failed?: number; total?: number };
      toast({
        title: "Re-transcription terminée",
        description: `${r?.processed ?? 0} segment(s) nettoyé(s)${r?.failed ? `, ${r.failed} échec(s)` : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
    } catch (e: any) {
      toast({ title: "Erreur de re-transcription", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setRetranscribing(false);
    }
  };

  const videoNavRef = useRef<SessionVideoNavigatorHandle>(null);

  const goToMessage = useCallback(
    (messageId: string, startSeconds?: number) => {
      const played = videoNavRef.current?.playMessage(messageId, startSeconds);
      if (played) {
        setTimeout(() => {
          document
            .getElementById("session-video-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }
      // Aucun clip vidéo correspondant : informe le recruteur.
      toast({
        title: "Extrait vidéo indisponible",
        description: "Ce moment n'a pas pu être retrouvé dans les enregistrements.",
        variant: "destructive",
      });
    },
    [toast],
  );

  useEffect(() => {
    if (session?.id && !notesInitialized) {
      setRecruiterNotes(session.recruiter_note ?? "");
      setNotesInitialized(true);
    }
  }, [session?.id, session?.recruiter_note, notesInitialized]);

  useEffect(() => {
    if (!session?.id || !notesInitialized) return;
    if ((session.recruiter_note ?? "") === recruiterNotes) return;
    const t = setTimeout(() => {
      updateNotes.mutate({ notes: recruiterNotes });
    }, 1000);
    return () => clearTimeout(t);
  }, [recruiterNotes, session?.id, session?.recruiter_note, notesInitialized]);

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
  };

  const candidateVideos = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && m.video_segment_url),
    [messages],
  );
  const candidateMainVideos = useMemo(
    () => candidateVideos.filter((m: any) => !m.is_follow_up),
    [candidateVideos],
  );

  const sessionClips = useMemo<SessionVideoClip[]>(() => {
    const projectQuestions = ((session?.projects?.questions as any[]) ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const orderById = new Map<string, number>();
    projectQuestions.forEach((q: any, i: number) => {
      if (q?.id) orderById.set(q.id, i + 1);
    });
    return [...candidateVideos]
      .sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map((m: any) => {
        const num = m.question_id ? orderById.get(m.question_id) : null;
        const projectQ = m.question_id
          ? projectQuestions.find((q: any) => q.id === m.question_id)
          : null;
        return {
          url: m.video_segment_url as string,
          questionLabel: num ? `Question ${num}` : "Question",
          questionText: projectQ?.content ?? "",
          isFollowUp: !!m.is_follow_up,
          messageId: m.id as string,
        };
      });
  }, [candidateVideos, session]);

  const stats = (report?.stats as Record<string, any>) ?? {};
  const questionEvaluations = (report?.question_evaluations as Record<string, any>) ?? {};
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const project = session?.projects;

  const verdictHeadline =
    stats.verdict_headline || report?.executive_summary_short || null;
  const fitScore = typeof stats.fit_score === "number" ? stats.fit_score : (report ? Number(report.overall_score) : null);

  // Construit la vue Réponses (fusion vidéos + évaluations)
  const questionItems = useMemo(() => {
    const evalByQuestionId = new Map<string, any>();
    const evalByIndex = new Map<number, any>();
    Object.entries(questionEvaluations).forEach(([key, val]: [string, any]) => {
      const idx = parseInt(key);
      if (!Number.isNaN(idx)) evalByIndex.set(idx, val);
      if (val?.question_id) evalByQuestionId.set(val.question_id, val);
    });
    const projectQuestions = (project?.questions as any[]) ?? [];

    return candidateMainVideos.map((video: any, idx: number) => {
      const evalEntry =
        (video.question_id && evalByQuestionId.get(video.question_id)) ||
        evalByIndex.get(idx);
      const projectQ = video.question_id
        ? projectQuestions.find((q: any) => q.id === video.question_id)
        : projectQuestions[idx];

      // Trouve la réponse texte du candidat liée à cette question (premier message non-follow-up)
      const candidateMsg = messages.find(
        (m: any) =>
          m.role === "candidate" &&
          !m.is_follow_up &&
          (video.question_id ? m.question_id === video.question_id : true),
      );

      return {
        index: idx,
        questionText: evalEntry?.question || projectQ?.content || `Question ${idx + 1}`,
        videoUrl: video.video_segment_url,
        score: typeof evalEntry?.score === "number" ? evalEntry.score : null,
        summary: evalEntry?.summary ?? null,
        comment: evalEntry?.comment ?? null,
        keyQuote: evalEntry?.key_quote ?? null,
        depthLevel: evalEntry?.depth_level ?? null,
        hadFollowup: !!evalEntry?.had_followup,
        followupHelped: !!evalEntry?.followup_helped,
        candidateAnswerText: candidateMsg?.content ?? null,
      };
    });
  }, [candidateMainVideos, questionEvaluations, project, messages]);

  const handleDecision = (d: RecruiterDecision) => {
    if (!user) return;
    updateDecision.mutate({ decision: d, userId: user.id }, {
      onSuccess: () => {
        if (d === "none") toast({ title: "Décision annulée." });
        else if (d === "in_progress") toast({ title: "Candidat en cours." });
        else if (d === "shortlisted") toast({ title: "Candidat retenu." });
        else if (d === "rejected") toast({ title: "Candidat noté Non." });
        else if (d === "second_opinion") toast({ title: "Candidat à discuter." });
        else if (d === "accepted") toast({ title: "Candidat accepté." });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  const handleRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast({ title: "Régénération lancée — patientez quelques instants." }),
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!session) return <p>Session introuvable.</p>;

  const handleDeleteSession = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("delete-session", {
        body: { session_id: id },
      });
      if (error || (result as any)?.error) {
        throw new Error((result as any)?.error || error?.message || "Erreur inconnue");
      }
      toast({ title: "Session supprimée." });
      navigate(`/projects/${session.project_id}`);
    } catch (e: any) {
      toast({ title: "Suppression impossible", description: e.message ?? String(e), variant: "destructive" });
      setDeleting(false);
    }
  };

  // Cas particulier : aucun enregistrement candidat (entretien terminé sans réponse)
  if (candidateMessagesWithMedia.length === 0 && session.status === "completed") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/projects/${session.project_id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <VideoOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Aucun enregistrement disponible</h2>
              <p className="text-sm text-muted-foreground">
                {session.candidate_name} a terminé l'entretien sans qu'aucune réponse vidéo ou audio
                ne soit enregistrée. Aucun rapport ne peut être généré.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer la session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La session, ses messages et son rapport éventuel
                    seront définitivement supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteSession}
                  >
                    {deleting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Suppression…</> : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  const decision = (session.recruiter_decision ?? "none") as RecruiterDecision;
  const rankLabel =
    projectAverages && projectAverages.count >= 3 && fitScore !== null && projectAverages.overallScore !== null
      ? `Moyenne projet : ${projectAverages.overallScore}/100 · ${fitScore - projectAverages.overallScore >= 0 ? "+" : ""}${fitScore - projectAverages.overallScore} pts`
      : null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/projects/${session.project_id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
        </Link>
      </Button>

      <DecisionBanner
        candidateName={session.candidate_name}
        candidateEmail={session.candidate_email}
        jobTitle={project?.job_title}
        durationLabel={formatDuration(session.duration_seconds)}
        videoAnswersCount={candidateVideos.length}
        fitScore={fitScore}
        recommendation={report?.recommendation ?? null}
        headline={verdictHeadline}
        rankLabel={rankLabel}
        decision={decision}
        onDecisionChange={handleDecision}
        isDecisionPending={updateDecision.isPending}
        shareUrl={shareUrl}
        onShare={handleShare}
        onCopyShare={copyShareUrl}
        copied={copied}
        isShareLoading={createShare.isPending}
        canDownloadVideos={candidateVideos.length > 0 || !!session.video_recording_url}
        onDownloadVideos={() => window.open(`/sessions/${id}/export`, "_blank", "noopener")}
        onRegenerate={report ? handleRegenerate : undefined}
        isRegenerating={regenerate.isPending}
        onEmail={session.candidate_email ? () => setEmailOpen(true) : undefined}
        onDelete={() => setDeleteOpen(true)}
        decisionByName={(session as any).decision_by_name ?? null}
        decisionAt={(session as any).recruiter_decision_at ?? null}
      />

      <BulkEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        recipients={[{
          id: session.id,
          candidate_name: session.candidate_name,
          candidate_email: session.candidate_email,
        }]}
        projectTitle={project?.title ?? ""}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La session, ses messages et son rapport éventuel seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleDeleteSession(); }}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Suppression…</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 lg:grid-cols-[1fr_510px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="decision" className="gap-1">
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Reco IA</span>
              </TabsTrigger>
              <TabsTrigger value="bigfive" className="gap-1">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Big Five</span>
                <BigFiveBadge profile={report?.personality_profile} size={22} />
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-1">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">À l'oral</span>
                <ParaverbalBadge analysis={report?.paraverbal_analysis} size={22} />
              </TabsTrigger>
              <TabsTrigger value="attitude" className="gap-1">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Attitude</span>
                <NonverbalBadge analysis={(report as any)?.nonverbal_analysis} size={22} />
              </TabsTrigger>
              <TabsTrigger value="answers" className="gap-1">
                <Play className="h-4 w-4" /> <span className="hidden sm:inline">Réponses</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="decision" className="mt-4 space-y-4">
              {report ? (
                <>
                  <FitBreakdownCard
                    items={stats.fit_breakdown}
                    legacyCriteriaScores={criteriaScores as any}
                    onGoToMessage={goToMessage}
                  />

                  <SignalsCard
                    signals={stats.signals}
                    legacyRedFlags={report.red_flags as any}
                    legacyFollowups={report.followup_questions as any}
                    onGoToMessage={goToMessage}
                  />

                  <CommunicationProfileCard
                    profile={stats.communication_profile}
                    onGoToMessage={goToMessage}
                  />

                  {projectAverages && projectAverages.count >= 3 && (
                    <ProjectComparisonCard
                      candidateScore={fitScore}
                      averages={projectAverages}
                      candidateCriteria={criteriaScores as any}
                    />
                  )}

                  {report.executive_summary && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Bilan global</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {report.executive_summary}
                        </p>
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

            <TabsContent value="bigfive" className="mt-4 space-y-4">
              {report && (report.personality_profile || report.soft_skills) ? (
                <>
                  <PersonalityRadar
                    profile={report.personality_profile}
                    onGoToMessage={goToMessage}
                    projectAverages={projectAverages?.bigFive}
                  />
                  <SoftSkillsCard
                    skills={report.soft_skills as any}
                    onGoToMessage={goToMessage}
                  />
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Analyse Big Five non disponible.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="voice" className="mt-4 space-y-4">
              {report && (report as any).paraverbal_analysis?.profile ? (
                <ParaverbalProfileCard
                  analysis={(report as any).paraverbal_analysis}
                  onGoToMessage={goToMessage}
                />
              ) : (
                <Card>
                  <CardContent className="space-y-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {(report as any)?.paraverbal_analysis?.status === "failed"
                        ? "La dernière analyse vocale a échoué (modèle surchargé). Réessayez."
                        : "Analyse vocale non disponible pour cette session."}
                    </p>
                    {report && id && (
                      <Button
                        size="sm"
                        disabled={analyzingVoice}
                        onClick={async () => {
                          setAnalyzingVoice(true);
                          toast({
                            title: "Analyse vocale lancée",
                            description: "Cela peut prendre 1 à 2 minutes.",
                          });
                          try {
                            const { data, error } = await supabase.functions.invoke(
                              "analyze-paraverbal",
                              { body: { session_id: id, force: true } },
                            );
                            if (error) throw error;
                            if ((data as any)?.skipped) {
                              toast({
                                title: "Analyse non effectuée",
                                description: String((data as any).skipped),
                                variant: "destructive",
                              });
                            } else {
                              toast({ title: "Analyse vocale terminée" });
                              queryClient.invalidateQueries({ queryKey: queryKeys.session(id) });
                            }
                          } catch (e: any) {
                            toast({
                              title: "Erreur de l'analyse vocale",
                              description: e.message ?? String(e),
                              variant: "destructive",
                            });
                          } finally {
                            setAnalyzingVoice(false);
                          }
                        }}
                      >
                        {analyzingVoice ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyse en cours…
                          </>
                        ) : (
                          <>
                            <Mic className="mr-2 h-4 w-4" />
                            Lancer l'analyse vocale
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="attitude" className="mt-4 space-y-4">
              <NonverbalTabContent
                analysis={(report as any)?.nonverbal_analysis}
                sessionId={id!}
                onGoToMessage={goToMessage}
              />
            </TabsContent>

            <TabsContent value="answers" className="mt-4 space-y-3">
              {questionItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Aucune réponse vidéo enregistrée.
                  </CardContent>
                </Card>
              ) : (
                questionItems.map((item, i) => (
                  <QuestionAnswerRow key={item.index} data={item} defaultOpen={i === 0} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div id="session-video-panel" className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {sessionClips.length > 0 && <SessionVideoNavigator ref={videoNavRef} clips={sessionClips} />}

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
                  rows={8}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
