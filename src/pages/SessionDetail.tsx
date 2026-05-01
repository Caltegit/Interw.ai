import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Video,
  Download,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSessionDetail,
  useUpdateRecruiterNotes,
  useCreateReportShare,
} from "@/hooks/queries/useSessionDetail";
import { useProjectAverages } from "@/hooks/queries/useProjectAverages";
import { VirtualizedMessageList } from "@/components/session/VirtualizedMessageList";
import { OverviewHeader } from "@/components/session/OverviewHeader";
import { AiAnalysisDisclaimer } from "@/components/session/AiAnalysisDisclaimer";
import { HighlightReelPlayer, HighlightClip } from "@/components/session/HighlightReelPlayer";
import { ExecutiveSummaryCard } from "@/components/session/ExecutiveSummaryCard";
import { PersonalityRadar } from "@/components/session/PersonalityRadar";
import { SoftSkillsCard } from "@/components/session/SoftSkillsCard";
import { RedFlagsCard } from "@/components/session/RedFlagsCard";
import { MotivationScoresCard } from "@/components/session/MotivationScoresCard";
import { FollowupQuestionsCard } from "@/components/session/FollowupQuestionsCard";
import { ProjectComparisonCard } from "@/components/session/ProjectComparisonCard";

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
  const [activeTab, setActiveTab] = useState("synthesis");
  const [copied, setCopied] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);

  const updateNotes = useUpdateRecruiterNotes(id);
  const createShare = useCreateReportShare(id);
  const { data: projectAverages } = useProjectAverages(session?.project_id);

  const goToMessage = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m: any) => m.id === messageId);
      if (idx === -1) return;
      setActiveTab("transcript");
      setActiveMessageIndex(idx);
      // Petit délai pour laisser l'onglet se rendre avant le scroll
      setTimeout(() => {
        const el = document.querySelector(`[data-index="${idx}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    },
    [messages],
  );

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

  const handleDownloadFullVideo = async () => {
    if (downloadingVideo) return;

    const projectQuestionsList = (session?.projects?.questions as any[]) ?? [];
    const sortedProjectQuestions = [...projectQuestionsList].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    const questionOrderById = new Map<string, number>();
    sortedProjectQuestions.forEach((q: any, i: number) => {
      if (q?.id) questionOrderById.set(q.id, i + 1);
    });

    // Segments candidat dans l'ordre chronologique. On ignore les messages IA
    // (ils n'ont de toute façon pas de video_segment_url).
    const segmentMessages = (messages as any[])
      .filter((m: any) => !!m.video_segment_url && m.role === "candidate")
      .sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    if (segmentMessages.length === 0) {
      toast({
        title: "Vidéo indisponible",
        description: "Aucun enregistrement vidéo n'a été trouvé pour cette session.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingVideo(true);
    toast({
      title: "Préparation de l'archive…",
      description: "Chargement du convertisseur vidéo (~30 Mo, mis en cache).",
    });

    // Charge ffmpeg.wasm AVANT de lancer la conversion. Si le chargement
    // échoue, on prévient l'utilisateur et on continue en WebM.
    let ffmpegReady = true;
    try {
      await preloadFFmpeg();
    } catch (err) {
      ffmpegReady = false;
      console.warn("[zip] ffmpeg.wasm load failed", err);
      toast({
        title: "Conversion MP4 indisponible",
        description: "Les vidéos seront livrées au format WebM.",
        variant: "destructive",
      });
    }

    try {
      // Télécharge tous les segments en parallèle, en tolérant les échecs.
      const fetched = await Promise.allSettled(
        segmentMessages.map(async (m: any) => {
          const res = await fetch(m.video_segment_url as string);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        }),
      );

      const zip = new JSZip();
      const followUpCounter = new Map<string, number>();
      const fileEntries: { name: string; question: string }[] = [];
      const missing: string[] = [];
      const notConverted: string[] = [];

      // Conversion séquentielle (ffmpeg.wasm est mono-instance).
      for (let i = 0; i < segmentMessages.length; i++) {
        const m: any = segmentMessages[i];
        const seq = String(i + 1).padStart(2, "0");
        const questionNumber =
          (m.question_id && questionOrderById.get(m.question_id)) || null;
        const questionLabel = questionNumber
          ? `question-${questionNumber}`
          : "question";

        let suffix = "";
        if (m.is_follow_up) {
          const key = m.question_id || `idx-${i}`;
          const k = (followUpCounter.get(key) ?? 0) + 1;
          followUpCounter.set(key, k);
          suffix = `-relance-${k}`;
        }

        const result = fetched[i];
        const projectQ = m.question_id
          ? sortedProjectQuestions.find((q: any) => q.id === m.question_id)
          : null;
        const questionText =
          projectQ?.content ||
          (questionNumber ? `Question ${questionNumber}` : "Question");
        const baseName = `${seq}-${questionLabel}${suffix}`;

        if (result.status !== "fulfilled") {
          missing.push(baseName);
          continue;
        }

        const original = result.value;
        toast({
          title: ffmpegReady
            ? `Conversion en MP4 (${i + 1}/${segmentMessages.length})…`
            : `Ajout du segment (${i + 1}/${segmentMessages.length})…`,
          description: questionText.slice(0, 80),
        });

        let finalBlob: Blob = original;
        let ext: "mp4" | "webm" = "mp4";
        if (ffmpegReady) {
          try {
            finalBlob = await convertToMp4(original);
            ext = "mp4";
          } catch (err) {
            console.warn("[zip] conversion failed, fallback to original", err);
            finalBlob = original;
            ext = original.type.includes("mp4") ? "mp4" : "webm";
            if (ext === "webm") notConverted.push(`${baseName}.webm`);
          }
        } else {
          finalBlob = original;
          ext = original.type.includes("mp4") ? "mp4" : "webm";
          if (ext === "webm") notConverted.push(`${baseName}.webm`);
        }

        const name = `${baseName}.${ext}`;
        zip.file(name, finalBlob);
        fileEntries.push({ name, question: questionText });
      }

      if (fileEntries.length === 0) {
        throw new Error("Aucun segment n'a pu être téléchargé.");
      }

      // README récapitulatif
      const safeName = (session?.candidate_name || "candidat")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "candidat";
      const dateStr = new Date(session?.created_at ?? Date.now())
        .toISOString()
        .slice(0, 10);
      const durationMin = session?.duration_seconds
        ? Math.round((session.duration_seconds as number) / 60)
        : null;

      const readmeLines: string[] = [];
      readmeLines.push(`Entretien — ${session?.candidate_name ?? ""}`);
      readmeLines.push("");
      readmeLines.push(`Candidat : ${session?.candidate_name ?? ""}`);
      if (session?.candidate_email)
        readmeLines.push(`Email    : ${session.candidate_email}`);
      if (session?.projects?.title)
        readmeLines.push(`Projet   : ${session.projects.title}`);
      if (session?.projects?.job_title)
        readmeLines.push(`Poste    : ${session.projects.job_title}`);
      readmeLines.push(`Date     : ${dateStr}`);
      if (durationMin !== null)
        readmeLines.push(`Durée    : ${durationMin} min`);
      readmeLines.push("");
      readmeLines.push("Contenu de l'archive :");
      fileEntries.forEach((f) => {
        readmeLines.push(`  ${f.name} — ${f.question}`);
      });
      if (missing.length > 0) {
        readmeLines.push("");
        readmeLines.push("Segments indisponibles au moment du téléchargement :");
        missing.forEach((n) => readmeLines.push(`  ${n}`));
      }
      if (notConverted.length > 0) {
        readmeLines.push("");
        readmeLines.push("Fichiers restés au format WebM (conversion MP4 échouée) :");
        notConverted.forEach((n) => readmeLines.push(`  ${n}`));
        readmeLines.push("Lisibles avec VLC, Chrome, Firefox ou Edge.");
      }
      readmeLines.push("");
      readmeLines.push(
        "Format : MP4 H.264 / AAC, lisible partout (QuickTime, VLC, " +
          "PowerPoint, WhatsApp, Teams…). " +
          "Note : seules les réponses du candidat sont enregistrées en vidéo. " +
          "La voix de l'assistant IA n'est pas incluse.",
      );
      zip.file("README.txt", readmeLines.join("\n"));

      // STORE : pas de compression (la vidéo est déjà compressée).
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });

      const filename = `entretien-${safeName}-${dateStr}.zip`;
      const objectUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      const warns: string[] = [];
      if (missing.length > 0) warns.push(`${missing.length} indisponible(s)`);
      if (notConverted.length > 0) warns.push(`${notConverted.length} en WebM`);
      if (warns.length > 0) {
        toast({
          title: "Archive téléchargée",
          description: `${warns.join(", ")} — voir README.txt.`,
        });
      } else {
        toast({ title: "Archive téléchargée (MP4)." });
      }
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible de préparer l'archive.",
        variant: "destructive",
      });
    } finally {
      setDownloadingVideo(false);
    }
  };

  const candidateVideos = useMemo(
    () => messages.filter((m: any) => m.role === "candidate" && m.video_segment_url),
    [messages],
  );

  const questionEvaluations = (report?.question_evaluations as Record<string, any>) ?? {};
  const criteriaScores = (report?.criteria_scores as Record<string, any>) ?? {};

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
          {(candidateVideos.length > 0 || session.video_recording_url) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadFullVideo}
              disabled={downloadingVideo}
            >
              {downloadingVideo ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              {downloadingVideo ? "Préparation…" : "Télécharger la vidéo"}
            </Button>
          )}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              <TabsTrigger value="full-video" className="gap-1">
                <Video className="h-4 w-4" /> <span className="hidden sm:inline">Vidéo complète</span>
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

                  {projectAverages && (
                    <ProjectComparisonCard
                      candidateScore={Number(report.overall_score)}
                      averages={projectAverages}
                      candidateCriteria={criteriaScores as any}
                    />
                  )}

                  <Card>
                    <CardHeader><CardTitle className="text-base">Résumé</CardTitle></CardHeader>
                    <CardContent><p className="text-sm leading-relaxed">{report.executive_summary}</p></CardContent>
                  </Card>

                  <PersonalityRadar
                    profile={report.personality_profile as any}
                    onGoToMessage={goToMessage}
                    projectAverages={projectAverages?.bigFive}
                  />
                  <SoftSkillsCard skills={report.soft_skills as any} onGoToMessage={goToMessage} />
                  <MotivationScoresCard scores={report.motivation_scores as any} />
                  <RedFlagsCard flags={report.red_flags as any} onGoToMessage={goToMessage} />
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

            <TabsContent value="full-video" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <FullVideoPlayer
                    items={questionItems}
                    fallbackUrl={session.video_recording_url}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Best-of</CardTitle>
            </CardHeader>
            <CardContent>
              <HighlightReelPlayer
                clips={(report?.highlight_clips as unknown as HighlightClip[]) ?? []}
              />
            </CardContent>
          </Card>

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

interface FullVideoItem {
  index: number;
  video: { id: string; video_segment_url?: string | null };
  questionText: string;
}

function FullVideoPlayer({
  items,
  fallbackUrl,
}: {
  items: FullVideoItem[];
  fallbackUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const validItems = items.filter((it) => !!it.video.video_segment_url);

  if (validItems.length === 0) {
    if (fallbackUrl) {
      return (
        <video
          src={fallbackUrl}
          controls
          preload="metadata"
          className="w-full rounded-lg bg-black aspect-video object-contain"
        />
      );
    }
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Vidéo complète indisponible pour cette session.
      </p>
    );
  }

  const safeIndex = Math.min(currentIndex, validItems.length - 1);
  const current = validItems[safeIndex];

  const playSegment = (i: number) => {
    setCurrentIndex(i);
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.load();
      v.play().catch(() => {});
    });
  };

  const handleEnded = () => {
    if (safeIndex + 1 < validItems.length) {
      playSegment(safeIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        key={current.video.id}
        src={current.video.video_segment_url ?? undefined}
        controls
        autoPlay={safeIndex > 0}
        preload="metadata"
        onEnded={handleEnded}
        className="w-full rounded-lg bg-black aspect-video object-contain"
      />
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Accès rapide par question
        </p>
        <ul className="space-y-1">
          {validItems.map((it, i) => {
            const isActive = i === safeIndex;
            return (
              <li key={it.video.id}>
                <button
                  type="button"
                  onClick={() => playSegment(i)}
                  className={`w-full rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-primary bg-muted font-medium"
                      : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  <span className="text-muted-foreground">Q{it.index + 1}</span>{" "}
                  · {it.questionText}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
