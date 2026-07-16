import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Brain, Mic, User, ScrollText, LayoutDashboard, Target } from "lucide-react";
import { ScoresOverviewCard } from "@/components/session/ScoresOverviewCard";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";

import { SessionVideoNavigator, SessionVideoClip, SessionVideoNavigatorHandle } from "@/components/session/SessionVideoNavigator";
import { DecisionBanner, type RecruiterDecision } from "@/components/session/DecisionBanner";
import { FitBreakdownCard } from "@/components/session/FitBreakdownCard";
import { FitMatrixCard } from "@/components/session/FitMatrixCard";
import { SignalsCard } from "@/components/session/SignalsCard";
import { CommunicationProfileCard } from "@/components/session/CommunicationProfileCard";
import { ParaverbalProfileCard } from "@/components/session/ParaverbalProfileCard";
import { BigFiveBadge } from "@/components/session/BigFiveBadge";
import { FitScoreBadge } from "@/components/session/FitScoreBadge";
import { ParaverbalBadge } from "@/components/session/ParaverbalBadge";
import { NonverbalTabContent } from "@/components/session/NonverbalTabContent";
import { NonverbalBadge } from "@/components/session/NonverbalBadge";
import { PersonalityRadar } from "@/components/session/PersonalityRadar";
import { SoftSkillsCard } from "@/components/session/SoftSkillsCard";
import { ProjectComparisonCard } from "@/components/session/ProjectComparisonCard";
import { AudioHealthBanner, isAudioFailed, type AudioHealth } from "@/components/session/AudioHealthBanner";

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  return `${m} min`;
};

export interface SessionReportViewProps {
  session: any;
  report: any;
  messages: any[];
  projectAverages: any | null | undefined;
  /** ID de la session (pour export vidéo et relances analyses). */
  sessionId?: string;
  /** Mode lecture seule (rapport partagé) : cache toutes les actions et le bouton MP4. */
  readOnly?: boolean;
  copilotOpen?: boolean;
  // Actions recruteur — ignorées si readOnly
  decision?: RecruiterDecision;
  onDecisionChange?: (d: RecruiterDecision) => void;
  isDecisionPending?: boolean;
  shareUrl?: string | null;
  onShare?: () => void;
  onCopyShare?: () => void;
  copied?: boolean;
  isShareLoading?: boolean;
  onDownloadVideos?: () => void;
  canDownloadVideos?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onEmail?: () => void;
  onEditLinks?: () => void;
  onDelete?: () => void;
  onOpenStats?: () => void;
  // Notes recruteur — masqué si readOnly
  recruiterNotes?: string;
  onRecruiterNotesChange?: (v: string) => void;
}

export function SessionReportView({
  session,
  report,
  messages,
  projectAverages,
  sessionId,
  readOnly = false,
  copilotOpen = false,
  decision = "none",
  onDecisionChange,
  isDecisionPending,
  shareUrl,
  onShare,
  onCopyShare,
  copied,
  isShareLoading,
  onDownloadVideos,
  canDownloadVideos,
  onRegenerate,
  isRegenerating,
  onEmail,
  onEditLinks,
  onDelete,
  onOpenStats,
  recruiterNotes,
  onRecruiterNotesChange,
}: SessionReportViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("summary");
  const [analyzingVoice, setAnalyzingVoice] = useState(false);

  const project = session?.projects;

  const candidateVideos = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && m.video_segment_url),
    [messages],
  );

  const transcriptsByMessageId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of messages as any[]) {
      if (m?.id && typeof m?.content === "string") map[m.id] = m.content;
    }
    return map;
  }, [messages]);

  const videoMessageIdByMessageId = useMemo(() => {
    const candidateById = new Map<string, any>();
    const videoIdsByQuestionId = new Map<string, string[]>();
    for (const m of messages as any[]) {
      if (m?.role !== "candidate" || !m?.id) continue;
      candidateById.set(m.id, m);
      if (m?.video_segment_url && m?.question_id) {
        const list = videoIdsByQuestionId.get(m.question_id) ?? [];
        list.push(m.id);
        videoIdsByQuestionId.set(m.question_id, list);
      }
    }
    const map: Record<string, string> = {};
    for (const m of messages as any[]) {
      if (m?.role !== "candidate" || !m?.id) continue;
      if (m.video_segment_url) {
        map[m.id] = m.id;
        continue;
      }
      if (!m.question_id) continue;
      const videoIds = videoIdsByQuestionId.get(m.question_id) ?? [];
      if (videoIds.length === 1) {
        map[m.id] = videoIds[0];
        continue;
      }
      if (videoIds.length > 1) {
        const sameQuestionMessages = (messages as any[])
          .filter((row: any) => row?.role === "candidate" && row?.question_id === m.question_id)
          .sort((a: any, b: any) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime());
        const targetIdx = sameQuestionMessages.findIndex((row: any) => row.id === m.id);
        const resolved = targetIdx >= 0 ? videoIds[Math.min(targetIdx, videoIds.length - 1)] : videoIds[0];
        if (resolved && candidateById.has(resolved)) map[m.id] = resolved;
      }
    }
    return map;
  }, [messages]);
  const resolveVideoMessageId = useCallback(
    (id: string) => videoMessageIdByMessageId[id],
    [videoMessageIdByMessageId],
  );

  const sessionClips = useMemo<SessionVideoClip[]>(() => {
    const projectQuestions = ((project?.questions as any[]) ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const orderById = new Map<string, number>();
    projectQuestions.forEach((q: any, i: number) => {
      if (q?.id) orderById.set(q.id, i + 1);
    });
    return [...candidateVideos]
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((m: any) => {
        const num = m.question_id ? orderById.get(m.question_id) : null;
        const projectQ = m.question_id
          ? projectQuestions.find((q: any) => q.id === m.question_id)
          : null;
        return {
          url: m.video_segment_url as string,
          audioUrl: (m.audio_segment_url as string) ?? null,
          questionLabel: num ? `Question ${num}` : "Question",
          questionText: projectQ?.content ?? "",
          questionTitle: (projectQ?.title as string) ?? null,
          questionHint: (projectQ?.hint_text as string) ?? null,
          isFollowUp: !!m.is_follow_up,
          messageId: m.id as string,
        };
      });
  }, [candidateVideos, project]);

  const questionNumberByMessageId = useMemo<Record<string, number>>(() => {
    const projectQuestions = ((project?.questions as any[]) ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const orderById = new Map<string, number>();
    projectQuestions.forEach((q: any, i: number) => {
      if (q?.id) orderById.set(q.id, i + 1);
    });
    const map: Record<string, number> = {};
    for (const m of messages as any[]) {
      if (m?.id && m?.question_id) {
        const n = orderById.get(m.question_id);
        if (typeof n === "number") map[m.id] = n;
      }
    }
    return map;
  }, [messages, project]);

  const stats = (report?.stats as Record<string, any>) ?? {};
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};
  const verdictHeadline = stats.verdict_headline || report?.executive_summary_short || null;
  const fitScore =
    typeof stats.fit_score === "number"
      ? stats.fit_score
      : report
        ? Number(report.overall_score)
        : null;

  const rankLabel =
    projectAverages && projectAverages.count >= 3 && fitScore !== null && projectAverages.overallScore !== null
      ? `Moyenne projet : ${projectAverages.overallScore}/100 · ${fitScore - projectAverages.overallScore >= 0 ? "+" : ""}${fitScore - projectAverages.overallScore} pts`
      : null;

  const videoNavRef = useRef<SessionVideoNavigatorHandle>(null);
  const hasAutoPlayedRef = useRef(false);

  // Lance automatiquement la première vidéo à l'arrivée sur le rapport (une seule fois).
  // Sans ce verrou, les refetch de session_messages (déclenchés par backfill-report-timestamps)
  // changeraient la référence de sessionClips et ramèneraient le player sur la Q1
  // à chaque fois que l'utilisateur sélectionne une autre question.
  useEffect(() => {
    if (hasAutoPlayedRef.current) return;
    if (sessionClips.length > 0 && videoNavRef.current) {
      const first = sessionClips[0];
      if (first?.messageId) {
        const played = videoNavRef.current.playMessage(first.messageId);
        if (played) hasAutoPlayedRef.current = true;
      }
    }
  }, [sessionClips]);

  const goToMessage = useCallback(
    (messageId: string, startSeconds?: number) => {
      const resolvedMessageId = resolveVideoMessageId(messageId) ?? messageId;
      const played = videoNavRef.current?.playMessage(resolvedMessageId, startSeconds);
      if (played) {
        setTimeout(() => {
          document.getElementById("session-video-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }
      toast({
        title: "Extrait vidéo indisponible",
        description: "Ce moment n'a pas pu être rattaché à un extrait vidéo exploitable.",
        variant: "destructive",
      });
    },
    [resolveVideoMessageId, toast],
  );

  // Sticky mini-vidéo
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [inlineHost, setInlineHost] = useState<HTMLDivElement | null>(null);
  const [pinnedHost, setPinnedHost] = useState<HTMLDivElement | null>(null);
  const [pinnedBar, setPinnedBar] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelEl) return;
    // Hystérésis : on épingle quand le sentinel est sous −24px,
    // on désépingle seulement quand il repasse au-dessus de +24px.
    // Cette zone morte absorbe les micro-reflows causés par le changement
    // d'état lui-même et évite le tremblement sur les pages courtes.
    let ticking = false;
    const PIN_THRESHOLD = -24;
    const UNPIN_THRESHOLD = 24;
    const update = () => {
      ticking = false;
      const top = sentinelEl.getBoundingClientRect().top;
      setIsPinned((prev) => {
        if (prev) return top < UNPIN_THRESHOLD;
        return top < PIN_THRESHOLD;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sentinelEl]);
  const portalHost = isPinned ? (pinnedHost ?? inlineHost) : inlineHost;

  const audioHealth = (report as any)?.audio_health as AudioHealth | null | undefined;
  const audioFailed = isAudioFailed(audioHealth);

  const triggerClass =
    "h-[72px] py-2 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/30 data-[state=active]:font-semibold";
  const labelClass = copilotOpen ? "hidden xl:inline" : "hidden sm:inline";
  const tabsList = (
    <TabsList className="grid w-full grid-cols-6 h-20">
      <TabsTrigger value="summary" className={triggerClass}>
        <LayoutDashboard className="h-12 w-12" strokeWidth={1.5} />
        <span className={labelClass}>Résumé</span>
      </TabsTrigger>
      <TabsTrigger value="decision" className={triggerClass}>
        <FitScoreBadge score={fitScore} size={48} audioFailed={audioFailed} />
        <span className={labelClass}>Fit Poste</span>
      </TabsTrigger>
      <TabsTrigger value="voice" className={triggerClass}>
        <ParaverbalBadge analysis={report?.paraverbal_analysis} size={48} audioFailed={audioFailed} />
        <span className={labelClass}>Orale</span>
      </TabsTrigger>
      <TabsTrigger value="attitude" className={triggerClass}>
        <NonverbalBadge analysis={(report as any)?.nonverbal_analysis} size={48} audioFailed={audioFailed} />
        <span className={labelClass}>Attitude</span>
      </TabsTrigger>
      <TabsTrigger value="bigfive" className={triggerClass}>
        <BigFiveBadge profile={report?.personality_profile} size={48} audioFailed={audioFailed} />
        <span className={labelClass}>Perso</span>
      </TabsTrigger>
      <TabsTrigger value="transcription" className={triggerClass}>
        <ScrollText className="h-12 w-12" strokeWidth={1.5} />
        <span className={labelClass}>Texte</span>
      </TabsTrigger>
    </TabsList>
  );

  return (
    <div className={`flex flex-col ${copilotOpen ? "gap-4" : "gap-6"}`}>
      <div className="gap-4 min-w-0 items-center justify-start flex flex-col -my-[10px]">
        {sessionClips.length > 0 && (
          <SessionVideoNavigator
            ref={videoNavRef}
            clips={sessionClips}
            transcripts={transcriptsByMessageId}
            portalTarget={portalHost}
            compact={isPinned}
            sessionId={readOnly ? undefined : sessionId}
            hideDownload={readOnly}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isPinned && (
            <div ref={setPinnedBar} className="sticky top-0 z-40 -mx-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm md:-mx-6">
              <div className="px-4 py-2">{tabsList}</div>
            </div>
          )}

          {isPinned && (
            <div className="fixed right-4 top-24 z-30">
              <div ref={setPinnedHost} className="w-[220px] overflow-hidden rounded-lg border bg-background shadow-lg" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            <AudioHealthBanner health={audioHealth} />
            <DecisionBanner
              readOnly={readOnly}
              candidateName={session.candidate_name}
              candidateEmail={session.candidate_email}
              candidatePhone={(session as any).candidate_phone ?? null}
              jobTitle={project?.job_title}
              projectTitle={project?.title}
              durationLabel={formatDuration(session.duration_seconds)}
              videoAnswersCount={candidateVideos.length}
              createdAt={session.created_at}
              fitScore={fitScore}
              recommendation={report?.recommendation ?? null}
              headline={verdictHeadline}
              rankLabel={rankLabel}
              decision={decision}
              onDecisionChange={onDecisionChange ?? (() => {})}
              isDecisionPending={isDecisionPending}
              shareUrl={readOnly ? null : shareUrl}
              onShare={readOnly ? undefined : onShare}
              onCopyShare={readOnly ? undefined : onCopyShare}
              copied={copied}
              isShareLoading={isShareLoading}
              canDownloadVideos={readOnly ? false : canDownloadVideos}
              onDownloadVideos={readOnly ? undefined : onDownloadVideos}
              onRegenerate={readOnly ? undefined : onRegenerate}
              isRegenerating={isRegenerating}
              onEmail={readOnly ? undefined : onEmail}
              onEditLinks={readOnly ? undefined : onEditLinks}
              onDelete={readOnly ? undefined : onDelete}
              onOpenStats={readOnly ? undefined : onOpenStats}
              decisionByName={(session as any).decision_by_name ?? null}
              decisionAt={(session as any).recruiter_decision_at ?? null}
              linkedinUrl={(session as any).candidate_linkedin_url ?? null}
              cvUrl={(session as any).candidate_cv_url ?? null}
              cvFilename={(session as any).candidate_cv_filename ?? null}
              coverLetterUrl={(session as any).candidate_cover_letter_url ?? null}
              coverLetterFilename={(session as any).candidate_cover_letter_filename ?? null}
              candidateJobTitle={(session as any).candidate_job_title ?? null}
              audioFailed={audioFailed}
              videoSlotWidth={copilotOpen ? 299 : 368}
              videoSlot={sessionClips.length > 0 ? <div ref={setInlineHost} className="h-full w-full aspect-video lg:aspect-auto lg:min-h-[200px]" /> : undefined}
              notesSlot={
                !readOnly && report ? (
                  <Textarea
                    placeholder="Ajoutez une note…"
                    value={recruiterNotes ?? ""}
                    onChange={(e) => onRecruiterNotesChange?.(e.target.value)}
                    className="flex-1 min-h-[80px] resize-none"
                  />
                ) : undefined
              }
            />

            <div ref={setSentinelEl} aria-hidden className="h-px w-full" />

            {!isPinned && tabsList}
          </div>


          <TabsContent value="summary" className="mt-4 space-y-4">
            {isRegenerating && report && (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Régénération en cours — affichage du rapport précédent.
              </div>
            )}
            {report ? (
              <>
                <ScoresOverviewCard
                  fitScore={fitScore}
                  personalityProfile={report.personality_profile}
                  paraverbalAnalysis={report.paraverbal_analysis}
                  nonverbalAnalysis={(report as any).nonverbal_analysis}
                  audioFailed={audioFailed}
                  projectAverages={projectAverages}
                  onSelectTab={setActiveTab}
                />
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
                <SignalsCard
                  signals={stats.signals}
                  legacyRedFlags={report.red_flags as any}
                  legacyFollowups={report.followup_questions as any}
                  onGoToMessage={goToMessage}
                  questionNumberByMessageId={questionNumberByMessageId}
                />
                <CommunicationProfileCard
                  profile={stats.communication_profile}
                  onGoToMessage={goToMessage}
                  questionNumberByMessageId={questionNumberByMessageId}
                />
                <SoftSkillsCard
                  skills={report.soft_skills as any}
                  onGoToMessage={goToMessage}
                  questionNumberByMessageId={questionNumberByMessageId}
                />
                {projectAverages && projectAverages.count >= 3 && (
                  <ProjectComparisonCard
                    candidateScore={fitScore}
                    averages={projectAverages}
                    candidateCriteria={criteriaScores as any}
                  />
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Rapport non encore généré.</p>
                  {!readOnly && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Le rapport sera généré automatiquement après l'analyse de la session.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="decision" className="mt-4 space-y-4">
            {report ? (
              <>
                <FitBreakdownCard
                  items={stats.fit_breakdown}
                  legacyCriteriaScores={criteriaScores as any}
                  onGoToMessage={goToMessage}
                  questionNumberByMessageId={questionNumberByMessageId}
                />
                <FitMatrixCard
                  matrix={stats.fit_matrix}
                  sessionId={sessionId}
                  questions={project?.questions}
                  readOnly={readOnly}
                  onGoToMessage={goToMessage}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Rapport non encore généré.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bigfive" className="mt-4 space-y-4">
            {report && report.personality_profile ? (
              <PersonalityRadar
                profile={report.personality_profile}
                onGoToMessage={goToMessage}
                projectAverages={projectAverages?.bigFive}
                questionNumberByMessageId={questionNumberByMessageId}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Analyse Perso non disponible.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-4 space-y-4">
            {report && (report as any).paraverbal_analysis?.profile ? (
              <ParaverbalProfileCard
                analysis={(report as any).paraverbal_analysis}
                onGoToMessage={goToMessage}
                questionNumberByMessageId={questionNumberByMessageId}
                transcriptsByMessageId={transcriptsByMessageId}
                resolveVideoMessageId={resolveVideoMessageId}
              />
            ) : (
              <Card>
                <CardContent className="space-y-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {(report as any)?.paraverbal_analysis?.status === "failed"
                      ? "La dernière analyse vocale a échoué (modèle surchargé). Réessayez."
                      : "Analyse vocale non disponible pour cette session."}
                  </p>
                  {!readOnly && report && sessionId && (
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
                            { body: { session_id: sessionId, force: true } },
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
                            queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
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
              sessionId={sessionId}
              onGoToMessage={goToMessage}
              questionNumberByMessageId={questionNumberByMessageId}
              transcriptsByMessageId={transcriptsByMessageId}
              resolveVideoMessageId={resolveVideoMessageId}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="transcription" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-6">
                {sessionClips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun texte disponible.</p>
                ) : (
                  <div className="space-y-6">
                    {sessionClips.map((clip, i) => {
                      const text = clip.messageId ? transcriptsByMessageId[clip.messageId] : "";
                      return (
                        <div key={clip.messageId ?? i} className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <Badge variant="secondary" className="shrink-0">{clip.questionLabel}</Badge>
                            <p className="text-sm font-medium text-foreground">{clip.questionHint?.trim() || clip.questionTitle?.trim() || clip.questionText}</p>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground pl-1">
                            {text || "Texte non disponible."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
