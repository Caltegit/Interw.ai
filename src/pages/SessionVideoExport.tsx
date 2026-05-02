import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import JSZip from "jszip";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Download, Loader2, AlertCircle } from "lucide-react";

type Phase = "loading" | "downloading" | "converting" | "zipping" | "ready" | "error";

interface SegmentInfo {
  url: string;
  questionId: string | null;
  questionNumber: number | null;
  questionText: string;
  isFollowUp: boolean;
  timestamp: string;
}

function sanitizeName(s: string | null | undefined, fallback: string) {
  if (!s) return fallback;
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || fallback
  );
}

function extFromContentType(ct: string | null, url: string): string {
  if (ct) {
    if (ct.includes("mp4")) return "mp4";
    if (ct.includes("webm")) return "webm";
    if (ct.includes("quicktime") || ct.includes("mov")) return "mov";
    if (ct.includes("ogg")) return "ogv";
  }
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".mov")) return "mov";
  if (lower.endsWith(".ogv")) return "ogv";
  return "webm";
}

async function convertToMp4(ffmpeg: FFmpeg, inputName: string, outputName: string) {
  const attempts: string[][] = [
    [
      "-i", inputName,
      "-c:v", "mpeg4",
      "-q:v", "5",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputName,
    ],
    [
      "-i", inputName,
      "-c:v", "mpeg4",
      "-q:v", "5",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      outputName,
    ],
  ];

  let lastError: unknown = null;

  for (const args of attempts) {
    try {
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile(outputName);
      return out instanceof Uint8Array ? out : new Uint8Array();
    } catch (error) {
      lastError = error;
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Conversion MP4 impossible");
}

export default function SessionVideoExport() {
  const { id } = useParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Préparation…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("entretien.zip");
  const [candidateName, setCandidateName] = useState<string>("");
  const [fileCount, setFileCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!id || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const objectUrls: string[] = [];

    (async () => {
      try {
        // 1. Auth
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          throw new Error("Vous devez être connecté pour télécharger les vidéos.");
        }

        setStatusLabel("Récupération des informations de la session…");

        // 2. Session + projet + questions
        const { data: session, error: sessErr } = await supabase
          .from("sessions")
          .select(
            "id, candidate_name, candidate_email, created_at, duration_seconds, projects(id, title, job_title, questions(id, content, order_index))",
          )
          .eq("id", id)
          .single();
        if (sessErr || !session) throw new Error("Session introuvable.");

        setCandidateName(session.candidate_name ?? "");

        // 3. Segments
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

        // 4. Téléchargement segment par segment (0 → 60 %)
        setPhase("downloading");
        const followUpCounter = new Map<string, number>();
        type DownloadedSegment = {
          baseName: string;
          ext: string;
          data: Uint8Array;
          question: string;
        };
        const downloaded: DownloadedSegment[] = [];
        const missing: string[] = [];

        for (let i = 0; i < segments.length; i++) {
          if (cancelled) return;
          const seg = segments[i];
          const seq = String(i + 1).padStart(2, "0");
          const questionLabel = seg.questionNumber
            ? `question-${seg.questionNumber}`
            : "question";

          let suffix = "";
          if (seg.isFollowUp) {
            const key = seg.questionId || `idx-${i}`;
            const k = (followUpCounter.get(key) ?? 0) + 1;
            followUpCounter.set(key, k);
            suffix = `-relance-${k}`;
          }
          const baseName = `${seq}-${questionLabel}${suffix}`;

          setStatusLabel(
            `Téléchargement du segment ${i + 1} sur ${segments.length}…`,
          );

          try {
            const res = await fetch(seg.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const total = Number(res.headers.get("Content-Length") || 0);
            const ext = extFromContentType(
              res.headers.get("Content-Type"),
              seg.url,
            );

            const reader = res.body?.getReader();
            let data: Uint8Array;
            if (!reader) {
              data = new Uint8Array(await res.arrayBuffer());
            } else {
              const chunks: Uint8Array[] = [];
              let received = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  chunks.push(value);
                  received += value.length;
                  const segShare = 60 / segments.length;
                  const segProgress = total > 0 ? received / total : 0;
                  const overall =
                    i * segShare + Math.min(segProgress, 1) * segShare;
                  setProgress(overall);
                }
              }
              data = new Uint8Array(received);
              let offset = 0;
              for (const c of chunks) {
                data.set(c, offset);
                offset += c.length;
              }
            }

            downloaded.push({ baseName, ext, data, question: seg.questionText });
            setProgress(((i + 1) / segments.length) * 60);
          } catch (err: any) {
            console.warn(`[export] segment ${baseName} failed`, err);
            missing.push(baseName);
          }
        }

        if (downloaded.length === 0) {
          throw new Error("Aucun segment n'a pu être téléchargé.");
        }

        // 5. Conversion en MP4 (60 → 85 %)
        const zip = new JSZip();
        const fileEntries: { name: string; question: string }[] = [];

        const needsConvert = downloaded.some((d) => d.ext !== "mp4");
        let ffmpeg: FFmpeg | null = null;
        let ffmpegUnavailable = false;

        // @ffmpeg/core@0.12.6 est en mode single-thread : il ne nécessite PAS
        // SharedArrayBuffer (donc pas de COOP/COEP). On essaie toujours de
        // charger ; en cas d'échec réseau/wasm on retombe sur le format source.
        if (needsConvert) {
          setPhase("converting");
          setStatusLabel("Préparation du convertisseur vidéo…");
          try {
            ffmpeg = new FFmpeg();
            ffmpeg.on("log", ({ message }) => {
              console.debug("[ffmpeg]", message);
            });
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
            await ffmpeg.load({
              coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
              wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
            console.info("[export] ffmpeg loaded (single-thread)");
          } catch (err) {
            console.warn("[export] ffmpeg load failed, fallback to original format", err);
            ffmpeg = null;
            ffmpegUnavailable = true;
          }
        }

        for (let i = 0; i < downloaded.length; i++) {
          if (cancelled) return;
          const d = downloaded[i];
          const finalName = `${d.baseName}.mp4`;

          if (d.ext === "mp4" || !ffmpeg) {
            // Déjà en MP4 ou pas de conversion possible : on garde tel quel
            const name = d.ext === "mp4" ? `${d.baseName}.mp4` : `${d.baseName}.${d.ext}`;
            zip.file(name, d.data);
            fileEntries.push({ name, question: d.question });
          } else {
            setStatusLabel(
              `Conversion en MP4 ${i + 1} sur ${downloaded.length}…`,
            );
            try {
              const inputName = `in-${i}.${d.ext}`;
              const outputName = `out-${i}.mp4`;
              await ffmpeg.writeFile(inputName, d.data);
              const outData = await convertToMp4(ffmpeg, inputName, outputName);
              zip.file(finalName, outData);
              fileEntries.push({ name: finalName, question: d.question });
              await ffmpeg.deleteFile(inputName).catch(() => {});
              await ffmpeg.deleteFile(outputName).catch(() => {});
            } catch (err: any) {
              console.warn(`[export] conversion ${d.baseName} failed`, err);
              // Fallback : on garde le fichier original
              const name = `${d.baseName}.${d.ext}`;
              zip.file(name, d.data);
              fileEntries.push({ name, question: d.question });
            }
          }

          setProgress(60 + ((i + 1) / downloaded.length) * 25);
        }

        // 6. README
        const safeName = sanitizeName(session.candidate_name, "candidat");
        const dateStr = new Date(session.created_at ?? Date.now())
          .toISOString()
          .slice(0, 10);
        const durationMin = session.duration_seconds
          ? Math.round((session.duration_seconds as number) / 60)
          : null;

        const readme: string[] = [];
        readme.push(`Entretien — ${session.candidate_name ?? ""}`);
        readme.push("");
        readme.push(`Candidat : ${session.candidate_name ?? ""}`);
        if (session.candidate_email)
          readme.push(`Courriel : ${session.candidate_email}`);
        if ((session as any).projects?.title)
          readme.push(`Projet   : ${(session as any).projects.title}`);
        if ((session as any).projects?.job_title)
          readme.push(`Poste    : ${(session as any).projects.job_title}`);
        readme.push(`Date     : ${dateStr}`);
        if (durationMin !== null) readme.push(`Durée    : ${durationMin} min`);
        readme.push("");
        readme.push("Contenu de l'archive :");
        fileEntries.forEach((f) => readme.push(`  ${f.name} — ${f.question}`));
        if (missing.length > 0) {
          readme.push("");
          readme.push("Segments indisponibles au moment de la génération :");
          missing.forEach((n) => readme.push(`  ${n}`));
        }
        readme.push("");
        if (ffmpegUnavailable) {
          readme.push(
            "Format : WebM (VP8/VP9). Lisible avec VLC, Chrome, Firefox, Edge. Pour QuickTime/iOS, convertissez en MP4 (ex. HandBrake). Seules les réponses du candidat sont enregistrées.",
          );
        } else {
          readme.push(
            "Format : MP4 (H.264 / AAC). Lisible avec VLC, QuickTime, Chrome, Firefox, Edge ou n'importe quel lecteur vidéo standard. Seules les réponses du candidat sont enregistrées.",
          );
        }
        zip.file("README.txt", readme.join("\n"));

        // 7. Création du ZIP (85 → 100 %)
        if (cancelled) return;
        setPhase("zipping");
        setStatusLabel("Création de l'archive ZIP…");

        const zipBlob = await zip.generateAsync(
          { type: "blob", compression: "STORE" },
          (meta) => {
            setProgress(85 + meta.percent * 0.15);
          },
        );

        if (cancelled) return;

        const finalName = `entretien-${safeName}-${dateStr}.zip`;
        setFilename(finalName);
        setFileCount(fileEntries.length);

        const url = URL.createObjectURL(zipBlob);
        objectUrls.push(url);
        setDownloadUrl(url);
        setProgress(100);
        setPhase("ready");
        setStatusLabel("Archive prête.");

        // Déclenche automatiquement le téléchargement
        const a = document.createElement("a");
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error("[export]", err);
        if (!cancelled) {
          const detail =
            err?.message || (typeof err === "string" ? err : null) || "Erreur inconnue";
          setErrorMsg(`Une erreur est survenue : ${detail}`);
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
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
                    Le téléchargement a démarré automatiquement. Si rien ne se
                    passe, utilisez le bouton ci-dessous.
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
                <p className="text-xs text-muted-foreground">
                  Merci de garder cet onglet ouvert pendant la préparation.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
