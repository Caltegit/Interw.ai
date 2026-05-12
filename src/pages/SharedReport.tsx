import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Play, FileText, Brain, Mic } from "lucide-react";
import { useProjectAverages } from "@/hooks/queries/useProjectAverages";
import { VirtualizedMessageList } from "@/components/session/VirtualizedMessageList";

import { SessionVideoNavigator, SessionVideoClip, SessionVideoNavigatorHandle } from "@/components/session/SessionVideoNavigator";
import { DecisionBanner, RecruiterDecision } from "@/components/session/DecisionBanner";
import { FitBreakdownCard } from "@/components/session/FitBreakdownCard";
import { SignalsCard } from "@/components/session/SignalsCard";
import { CommunicationProfileCard } from "@/components/session/CommunicationProfileCard";
import { ParaverbalProfileCard } from "@/components/session/ParaverbalProfileCard";
import { QuestionAnswerRow } from "@/components/session/QuestionAnswerRow";
import { DeepAnalysisAccordion } from "@/components/session/DeepAnalysisAccordion";
import { BigFiveBadge } from "@/components/session/BigFiveBadge";
import { PersonalityRadar } from "@/components/session/PersonalityRadar";
import { SoftSkillsCard } from "@/components/session/SoftSkillsCard";
import { ProjectComparisonCard } from "@/components/session/ProjectComparisonCard";

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")}`;
};

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("decision");
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);

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
          "id, candidate_name, candidate_email, created_at, duration_seconds, video_recording_url, project_id, projects(id, title, job_title, ai_persona_name, questions(id, content, order_index))",
        )
        .eq("id", reportData.session_id)
        .single();

      const { data: msgs } = await supabase
        .from("session_messages")
        .select("id, role, content, timestamp, video_segment_url, audio_segment_url, question_id, is_follow_up, transcription_status")
        .eq("session_id", reportData.session_id)
        .order("timestamp");

      setReport(reportData);
      setSession(sessionData);
      setMessages(msgs ?? []);
      setLoading(false);
    };

    loadReport();
  }, [token]);

  const project = session?.projects;
  const { data: projectAverages } = useProjectAverages(session?.project_id);

  const candidateVideos = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && m.video_segment_url),
    [messages],
  );
  const candidateMainVideos = useMemo(
    () => candidateVideos.filter((m: any) => !m.is_follow_up),
    [candidateVideos],
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
  }, [candidateVideos, project]);

  const stats = (report?.stats as Record<string, any>) ?? {};
  const questionEvaluations = (report?.question_evaluations as Record<string, any>) ?? {};
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};

  const verdictHeadline = stats.verdict_headline || report?.executive_summary_short || null;
  const fitScore =
    typeof stats.fit_score === "number" ? stats.fit_score : (report ? Number(report.overall_score) : null);

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
      const idx = messages.findIndex((m: any) => m.id === messageId);
      if (idx === -1) return;
      setActiveTab("transcript");
      setActiveMessageIndex(idx);
      setTimeout(() => {
        const el = document.querySelector(`[data-index="${idx}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    },
    [messages],
  );

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

  if (!session) return <p className="p-8">Session introuvable.</p>;

  const rankLabel =
    projectAverages && projectAverages.count >= 3 && fitScore !== null && projectAverages.overallScore !== null
      ? `Moyenne projet : ${projectAverages.overallScore}/100 · ${fitScore - projectAverages.overallScore >= 0 ? "+" : ""}${fitScore - projectAverages.overallScore} pts`
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <DecisionBanner
        readOnly
        candidateName={session.candidate_name}
        jobTitle={project?.job_title}
        durationLabel={formatDuration(session.duration_seconds)}
        videoAnswersCount={candidateVideos.length}
        fitScore={fitScore}
        recommendation={report?.recommendation ?? null}
        headline={verdictHeadline}
        rankLabel={rankLabel}
        decision={"none" as RecruiterDecision}
        onDecisionChange={() => {}}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_510px]">
        <div className="order-2 lg:order-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="decision" className="gap-1">
                <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Reco IA</span>
              </TabsTrigger>
              <TabsTrigger value="bigfive" className="gap-1">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Big Five</span>
                <BigFiveBadge profile={report?.personality_profile} size={22} />
              </TabsTrigger>
              <TabsTrigger value="answers" className="gap-1">
                <Play className="h-4 w-4" /> <span className="hidden sm:inline">Réponses</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-1">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">À l'oral</span>
                <ParaverbalBadge analysis={report?.paraverbal_analysis} size={22} />
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

            <TabsContent value="voice" className="mt-4 space-y-4">
              {report && (report as any).paraverbal_analysis?.profile ? (
                <ParaverbalProfileCard
                  analysis={(report as any).paraverbal_analysis}
                  onGoToMessage={goToMessage}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Analyse vocale non disponible pour cette session.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div id="session-video-panel" className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          {sessionClips.length > 0 && <SessionVideoNavigator ref={videoNavRef} clips={sessionClips} />}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Rapport partagé via un lien sécurisé · Généré par Interw.ai
      </p>
    </div>
  );
}
