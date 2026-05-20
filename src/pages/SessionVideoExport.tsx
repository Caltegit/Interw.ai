import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Download, Loader2, AlertCircle, Info } from "lucide-react";

type Phase = "loading" | "downloading" | "converting" | "zipping" | "ready" | "error";

interface SegmentInfo {
  url: string;
  questionId: string | null;
  questionNumber: number | null;
  questionText: string;
  isFollowUp: boolean;
  timestamp: string;
}

// Joue un son inaudible pour empêcher le navigateur de ralentir l'onglet
// quand il passe en arrière-plan.
function startSilentAudio(): () => void {
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx: AudioContext = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001; // quasi inaudible
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    return () => {
      try {
        osc.stop();
      } catch {}
      ctx.close().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

export default function SessionVideoExport() {
  const { id } = useParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Préparation…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("entretien.zip");
  const [candidateName, setCandidateName] = useState<string>("");
  const [fileCount, setFileCount] = useState(0);
  const [failedSegments, setFailedSegments] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    // Reset pour permettre les relances via "Réessayer"
    startedRef.current = true;
    setPhase("loading");
    setProgress(0);
    setStatusLabel("Préparation…");
    setErrorMsg(null);
    setErrorCode(null);
    setErrorDetails(null);
    setDownloadUrl(null);
    setFileCount(0);
    setFailedSegments([]);

    let cancelled = false;
    const objectUrls: string[] = [];
    let worker: Worker | null = null;
    let stopAudio: (() => void) | null = null;
    let wakeLock: any = null;

    const releaseWakeLock = () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch {}
        wakeLock = null;
      }
    };

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    (async () => {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          throw new Error("Vous devez être connecté pour télécharger les vidéos.");
        }

        setStatusLabel("Récupération des informations de la session…");

        const { data: session, error: sessErr } = await supabase
          .from("sessions")
          .select(
            "id, candidate_name, candidate_email, created_at, duration_seconds, projects(id, title, job_title, questions(id, content, order_index))",
          )
          .eq("id", id)
          .single();
        if (sessErr || !session) throw new Error("Session introuvable.");

        setCandidateName(session.candidate_name ?? "");

        const { data: messages, error: msgErr } = await supabase
          .from("session_messages")
          .select("id, role, video_segment_url, question_id, is_follow_up, timestamp")
          .eq("session_id", id)
          .order("timestamp", { ascending: true });
        if (msgErr) throw new Error(msgErr.message);

        const projectQuestions = ((session as any).projects?.questions ?? [])
          .slice()
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const orderById = new Map<string, number>();
        projectQuestions.forEach((q: any, i: number) => {
          if (q?.id) orderById.set(q.id, i + 1);
        });

        const segments: SegmentInfo[] = (messages ?? [])
          .filter((m: any) => !!m.video_segment_url && m.role === "candidate")
          .sort(
            (a: any, b: any) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          )
          .map((m: any) => {
            const qNum = (m.question_id && orderById.get(m.question_id)) || null;
            const projectQ = m.question_id
              ? projectQuestions.find((q: any) => q.id === m.question_id)
              : null;
            return {
              url: m.video_segment_url,
              questionId: m.question_id,
              questionNumber: qNum,
              questionText:
                projectQ?.content || (qNum ? `Question ${qNum}` : "Question"),
              isFollowUp: !!m.is_follow_up,
              timestamp: m.timestamp,
            };
          });

        if (segments.length === 0) {
          throw new Error("Aucun enregistrement vidéo trouvé pour cette session.");
        }

        // Demande la permission de notification (sans bloquer)
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }

        // Garde l'onglet actif et empêche la mise en veille
        stopAudio = startSilentAudio();
        await requestWakeLock();

        setPhase("downloading");

        worker = new Worker(
          new URL("../workers/videoExport.worker.ts", import.meta.url),
          { type: "module" },
        );

        worker.onmessage = (e: MessageEvent<any>) => {
          if (cancelled) return;
          const data = e.data;
          if (data.type === "progress") {
            setProgress(data.value);
          } else if (data.type === "status") {
            setStatusLabel(data.label);
            setPhase(data.phase);
          } else if (data.type === "done") {
            const url = URL.createObjectURL(data.blob);
            objectUrls.push(url);
            setDownloadUrl(url);
            setFilename(data.filename);
            setFileCount(data.fileCount);
            setProgress(100);
            setPhase("ready");
            setStatusLabel("Archive prête.");

            const a = document.createElement("a");
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification("Archive vidéo prête", {
                  body: `${data.fileCount} vidéo(s) prêtes à télécharger.`,
                });
              } catch {}
            }

            stopAudio?.();
            stopAudio = null;
            releaseWakeLock();
            worker?.terminate();
            worker = null;
          } else if (data.type === "error") {
            setErrorMsg(`Une erreur est survenue : ${data.message}`);
            setPhase("error");
            stopAudio?.();
            stopAudio = null;
            releaseWakeLock();
            worker?.terminate();
            worker = null;
          }
        };

        worker.onerror = (err) => {
          if (cancelled) return;
          setErrorMsg(`Erreur du worker : ${err.message}`);
          setPhase("error");
          stopAudio?.();
          stopAudio = null;
          releaseWakeLock();
        };

        worker.postMessage({
          type: "start",
          segments,
          candidateName: session.candidate_name ?? null,
          candidateEmail: session.candidate_email ?? null,
          projectTitle: (session as any).projects?.title ?? null,
          projectJobTitle: (session as any).projects?.job_title ?? null,
          createdAt: session.created_at ?? null,
          durationSeconds: session.duration_seconds ?? null,
        });
      } catch (err: any) {
        if (!cancelled) {
          const detail = err?.message || "Erreur inconnue";
          setErrorMsg(`Une erreur est survenue : ${detail}`);
          setPhase("error");
          stopAudio?.();
          stopAudio = null;
          releaseWakeLock();
        }
      }
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      worker?.terminate();
      stopAudio?.();
      releaseWakeLock();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Téléchargement des vidéos</CardTitle>
          {candidateName && (
            <p className="text-sm text-muted-foreground">
              Entretien de {candidateName}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {phase === "error" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">{errorMsg}</div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.close()}
              >
                Fermer cet onglet
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Progress value={progress} />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {phase === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>{statusLabel}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(progress)} %
                  </span>
                </div>
              </div>

              {phase === "ready" && downloadUrl ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {fileCount} vidéo{fileCount > 1 ? "s" : ""} dans l'archive.
                    Le téléchargement a démarré automatiquement. Sinon, utilisez
                    le bouton ci-dessous.
                  </p>
                  <Button asChild className="w-full">
                    <a href={downloadUrl} download={filename}>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger l'archive
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => window.close()}
                  >
                    Fermer cet onglet
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Vous pouvez changer d'onglet, la préparation continue en
                    arrière-plan. Évitez seulement de mettre l'ordinateur en
                    veille.
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
