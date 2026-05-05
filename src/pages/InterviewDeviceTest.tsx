import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  Video,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Wifi,
  Loader2,
  Sparkles,
  Volume2,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

type Status = "idle" | "testing" | "ok" | "error";
type SpeedQuality = "good" | "limited" | "weak";

// Joue un bip court via WebAudio (oscillateur). Retourne true si le contexte
// a réellement progressé (donc audible côté matériel) — false si l'autoplay
// est bloqué ou si le mode silencieux iOS coupe la sortie.
async function playBeep(): Promise<boolean> {
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  if (!Ctor) return false;
  const ctx = new Ctor();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") {
      await ctx.close();
      return false;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    const startTime = ctx.currentTime;
    osc.start(startTime);
    osc.stop(startTime + 0.5);
    await new Promise((r) => setTimeout(r, 600));
    const progressed = ctx.currentTime > startTime + 0.3;
    await ctx.close();
    return progressed;
  } catch {
    try { await ctx.close(); } catch { /* ignore */ }
    return false;
  }
}

interface BrowserSupport {
  supported: boolean;
  reason?: string;
}

function detectUnsupportedBrowser(): BrowserSupport {
  if (typeof navigator === "undefined") return { supported: true };
  const ua = navigator.userAgent || "";

  // In-app browsers connus (impossibles à utiliser pour getUserMedia).
  const inApp: Array<[RegExp, string]> = [
    [/Instagram/i, "Instagram"],
    [/FBAN|FBAV|FB_IAB/i, "Facebook"],
    [/Snapchat/i, "Snapchat"],
    [/musical_ly|TikTok|Bytedance/i, "TikTok"],
    [/LinkedInApp/i, "LinkedIn"],
    [/Line\//i, "Line"],
  ];
  for (const [re, name] of inApp) {
    if (re.test(ua)) {
      return {
        supported: false,
        reason: `Vous utilisez le navigateur intégré à ${name}. Il ne permet pas l'accès au micro et à la caméra.`,
      };
    }
  }

  // Firefox iOS n'expose pas MediaRecorder.
  if (/FxiOS/i.test(ua)) {
    return {
      supported: false,
      reason: "Firefox sur iPhone ne permet pas l'enregistrement audio. Utilisez Safari.",
    };
  }

  if (typeof window !== "undefined") {
    if (!("MediaRecorder" in window)) {
      return { supported: false, reason: "Votre navigateur ne prend pas en charge l'enregistrement audio." };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return { supported: false, reason: "Votre navigateur ne permet pas l'accès au micro et à la caméra." };
    }
    if (!("AudioContext" in window) && !("webkitAudioContext" in window)) {
      return { supported: false, reason: "Votre navigateur ne prend pas en charge l'audio Web." };
    }
  }

  return { supported: true };
}

export default function InterviewDeviceTest() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [preSessionMessage, setPreSessionMessage] = useState<string | null>(null);

  const browserSupport = useRef<BrowserSupport>(detectUnsupportedBrowser());
  const [browserBlocked, setBrowserBlocked] = useState(!browserSupport.current.supported);
  const [linkCopied, setLinkCopied] = useState(false);

  const [micStatus, setMicStatus] = useState<Status>("idle");
  const [camStatus, setCamStatus] = useState<Status>("idle");
  const [soundStatus, setSoundStatus] = useState<Status>("idle");
  const [micLevel, setMicLevel] = useState(0);

  const [netStatus, setNetStatus] = useState<Status>("idle");
  const [netKbps, setNetKbps] = useState<number | null>(null);
  const [netQuality, setNetQuality] = useState<SpeedQuality | null>(null);

  const [sttStatus, setSttStatus] = useState<Status>("idle");
  const [sttError, setSttError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-start tests on mount + cleanup on unmount.
  // Le test du son nécessite un geste utilisateur, il n'est pas auto-déclenché.
  useEffect(() => {
    if (browserBlocked) return;
    testCam();
    testMic();
    testNetwork();
    testRecorder();
    testStt();
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserBlocked]);

  // Charger infos projet (message + nom poste + org) pour le consentement
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("pre_session_message")
        .eq("slug", slug)
        .maybeSingle();
      const d = data as { pre_session_message?: string | null } | null;
      if (d?.pre_session_message?.trim()) setPreSessionMessage(d.pre_session_message.trim());
    })();
  }, [slug]);

  const stopAll = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (beepAudioRef.current) {
      beepAudioRef.current.pause();
      beepAudioRef.current.src = "";
      beepAudioRef.current = null;
    }
  };

  const testMic = async () => {
    setMicStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const audioCtx = new Ctor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const poll = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 80, 1);
        setMicLevel(normalized);
        animFrameRef.current = requestAnimationFrame(poll);
      };
      poll();

      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setMicStatus("ok");
        setMicLevel(0);
      }, 3000);
    } catch {
      setMicStatus("error");
    }
  };

  const testCam = async () => {
    setCamStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCamStatus("ok");
    } catch {
      setCamStatus("error");
    }
  };

  // Vérifie que MediaRecorder peut réellement produire un chunk.
  const [recorderStatus, setRecorderStatus] = useState<Status>("idle");
  const testRecorder = async () => {
    setRecorderStatus("testing");
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const gotChunk = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 2500);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            clearTimeout(timer);
            resolve(true);
          }
        };
        try {
          recorder.start(250);
        } catch {
          clearTimeout(timer);
          resolve(false);
        }
      });
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      setRecorderStatus(gotChunk ? "ok" : "error");
    } catch {
      setRecorderStatus("error");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  };

  // Test de lecture audio — déclenché par un clic utilisateur.
  const testSound = async () => {
    setSoundStatus("testing");
    try {
      const ok = await playBeep();
      setSoundStatus(ok ? "ok" : "error");
    } catch {
      setSoundStatus("error");
    }
  };

  // Vérifie que la reconnaissance vocale du navigateur fonctionne réellement.
  // Sans ce test, des navigateurs comme Firefox sur Android ou certaines versions
  // de Safari laissent le candidat bloqué à la première question texte.
  const testStt = async () => {
    setSttStatus("testing");
    setSttError(null);
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSttError(
        "Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome ou Safari récent.",
      );
      setSttStatus("error");
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "fr-FR";
      recognition.interimResults = true;
      recognition.continuous = false;
      const ok = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (value: boolean) => {
          if (settled) return;
          settled = true;
          try { recognition.onstart = null; recognition.onerror = null; recognition.onend = null; } catch { /* ignore */ }
          try { recognition.stop(); } catch { /* ignore */ }
          resolve(value);
        };
        recognition.onstart = () => finish(true);
        recognition.onerror = (e: any) => {
          if (e?.error === "no-speech" || e?.error === "aborted") {
            // bénin : la reconnaissance a bien démarré
            finish(true);
            return;
          }
          if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
            setSttError(
              "Autorisez l'accès au micro pour permettre la reconnaissance vocale.",
            );
          } else {
            setSttError("La reconnaissance vocale n'a pas pu démarrer sur ce navigateur.");
          }
          finish(false);
        };
        setTimeout(() => finish(false), 2500);
        try {
          recognition.start();
        } catch {
          setSttError("La reconnaissance vocale n'a pas pu démarrer sur ce navigateur.");
          finish(false);
        }
      });
      setSttStatus(ok ? "ok" : "error");
    } catch {
      setSttError("La reconnaissance vocale n'est pas disponible sur ce navigateur.");
      setSttStatus("error");
    }
  };

  // Test de débit : on télécharge un asset connu et on chronomètre
  const testNetwork = async () => {
    setNetStatus("testing");
    setNetKbps(null);
    setNetQuality(null);
    try {
      const url = `/placeholder.svg?cb=${Date.now()}`;
      const start = performance.now();
      const ITER = 3;
      let totalBytes = 0;
      for (let i = 0; i < ITER; i++) {
        const r = await fetch(`${url}&i=${i}`, { cache: "no-store" });
        const blob = await r.blob();
        totalBytes += blob.size;
      }
      const elapsedMs = performance.now() - start;
      const bigUrl = `https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/avatars/.placeholder?cb=${Date.now()}`;
      const bigStart = performance.now();
      try {
        const r = await fetch(bigUrl, { cache: "no-store" });
        const blob = await r.blob();
        const bigBytes = blob.size;
        const bigElapsed = performance.now() - bigStart;
        if (bigBytes > 5000) {
          const kbps = Math.round((bigBytes * 8) / bigElapsed);
          finishNetwork(kbps);
          return;
        }
      } catch {
        /* fallback */
      }

      if (totalBytes < 1000 || elapsedMs < 5) {
        finishNetwork(2000);
        return;
      }
      const kbps = Math.round((totalBytes * 8) / elapsedMs);
      finishNetwork(kbps);
    } catch (err) {
      console.warn("[network test] failed", err);
      setNetStatus("error");
    }
  };

  const finishNetwork = (kbps: number) => {
    setNetKbps(kbps);
    let q: SpeedQuality;
    if (kbps >= 600) q = "good";
    else if (kbps >= 300) q = "limited";
    else q = "weak";
    setNetQuality(q);
    setNetStatus("ok");
  };

  const handleContinue = async () => {
    stopAll();
    navigate(`/session/${slug}/start/${token}`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  // Conditions de blocage
  const networkBlocking = netStatus === "ok" && netQuality === "weak";
  const canContinue =
    micStatus === "ok" &&
    camStatus === "ok" &&
    soundStatus === "ok" &&
    recorderStatus === "ok" &&
    sttStatus === "ok" &&
    !networkBlocking;

  const networkLabel = (() => {
    if (!netQuality) return "";
    if (netQuality === "good") return "Connexion bonne";
    if (netQuality === "limited") return "Connexion limitée — la session reste possible";
    return "Connexion trop faible pour réaliser l'entretien";
  })();

  const networkColorClass = (() => {
    if (netQuality === "good") return "text-emerald-600 dark:text-emerald-400";
    if (netQuality === "limited") return "text-amber-600 dark:text-amber-400";
    if (netQuality === "weak") return "text-destructive";
    return "text-muted-foreground";
  })();

  // Écran bloquant — navigateur non supporté
  if (browserBlocked) {
    return (
      <CandidateLayout>
        <div className="w-full max-w-lg space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                <h1 className="text-lg font-semibold">Navigateur non compatible</h1>
              </div>
              <p className="text-sm text-foreground">
                {browserSupport.current.reason}
              </p>
              <p className="text-sm text-muted-foreground">
                Pour réaliser l'entretien, ouvrez ce lien dans <strong>Safari</strong> (iPhone) ou{" "}
                <strong>Chrome</strong> (Android et ordinateur).
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={copyLink} variant="outline" className="w-full">
                  {linkCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Lien copié
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copier le lien de l'entretien
                    </>
                  )}
                </Button>
                <button
                  onClick={() => setBrowserBlocked(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
                >
                  Continuer quand même
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Vérification technique</h1>
          <p className="text-sm text-muted-foreground">
            Vérifions que votre matériel et votre connexion permettent de réaliser l'entretien.
          </p>
        </div>

        {/* Camera test */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {camStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : camStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Video className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Caméra</span>
              </div>
              {camStatus === "error" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testCam}>
                  Réessayer
                </Button>
              )}
            </div>

            {camStatus === "testing" && (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {(camStatus === "ok" || camStatus === "testing") && (
              <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>
            )}

            {camStatus === "error" && (
              <p className="text-xs text-destructive text-center">
                Impossible d'accéder à la caméra. Autorisez l'accès dans les réglages du navigateur.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mic test */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {micStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : micStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Microphone</span>
              </div>
              {micStatus === "error" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testMic}>
                  Réessayer
                </Button>
              )}
            </div>

            {micStatus === "testing" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Parlez pour tester votre micro…</p>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-100"
                    style={{ width: `${micLevel * 100}%` }}
                  />
                </div>
              </div>
            )}

            {micStatus === "error" && (
              <p className="text-xs text-destructive text-center">
                Impossible d'accéder au micro. Vérifiez les permissions du navigateur.
              </p>
            )}

            {/* Sous-test : enregistrement réel */}
            {micStatus === "ok" && (
              <div className="flex items-center gap-2 text-xs">
                {recorderStatus === "ok" ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Enregistrement opérationnel</span>
                  </>
                ) : recorderStatus === "error" ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">
                      L'enregistrement audio n'est pas pris en charge.
                    </span>
                    <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={testRecorder}>
                      Réessayer
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Vérification de l'enregistrement…</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sound playback test */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : soundStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Son</span>
              </div>
              {soundStatus !== "ok" && (
                <Button
                  variant={soundStatus === "error" ? "outline" : "default"}
                  size="sm"
                  className="min-h-[44px] px-4"
                  onClick={testSound}
                  disabled={soundStatus === "testing"}
                >
                  {soundStatus === "testing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : soundStatus === "error" ? (
                    "Réessayer"
                  ) : (
                    "Tester le son"
                  )}
                </Button>
              )}
            </div>

            {soundStatus === "idle" && (
              <p className="text-xs text-muted-foreground">
                Touchez « Tester le son » et vérifiez que vous entendez bien un bip.
              </p>
            )}
            {soundStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Son audible</p>
            )}
            {soundStatus === "error" && (
              <p className="text-xs text-destructive">
                Aucun son détecté. Désactivez le mode silencieux, montez le volume et autorisez le son pour ce site.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Speech recognition test */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sttStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : sttStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : sttStatus === "testing" ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Reconnaissance vocale</span>
              </div>
              {sttStatus === "error" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testStt}>
                  Réessayer
                </Button>
              )}
            </div>

            {sttStatus === "testing" && (
              <p className="text-xs text-muted-foreground text-center">Vérification en cours…</p>
            )}
            {sttStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Votre navigateur permet de transcrire votre voix.
              </p>
            )}
            {sttStatus === "error" && (
              <p className="text-xs text-destructive">
                {sttError ?? "La reconnaissance vocale n'est pas disponible."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Network test */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {netStatus === "ok" && netQuality === "good" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : netStatus === "ok" && netQuality === "limited" ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : netStatus === "ok" && netQuality === "weak" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : netStatus === "testing" ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : netStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Wifi className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Connexion</span>
              </div>
              {(netStatus === "ok" || netStatus === "error") && (
                <Button variant="ghost" size="sm" className="min-h-[44px] px-3" onClick={testNetwork}>
                  Refaire le test
                </Button>
              )}
            </div>

            {netStatus === "testing" && (
              <p className="text-xs text-muted-foreground text-center">Mesure du débit en cours…</p>
            )}

            {netStatus === "ok" && netKbps !== null && (
              <p className={`text-xs text-center ${networkColorClass}`}>
                {networkLabel} ({netKbps >= 1000 ? `${(netKbps / 1000).toFixed(1)} Mb/s` : `${netKbps} kb/s`})
              </p>
            )}

            {networkBlocking && (
              <p className="text-xs text-destructive text-center">
                Rapprochez-vous de votre Wi-Fi ou passez en 4G, puis refaites le test.
              </p>
            )}

            {netStatus === "error" && (
              <p className="text-xs text-destructive text-center">
                Impossible de mesurer la connexion.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pre-session encouragement message */}
        {preSessionMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 animate-fade-in">
            <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{preSessionMessage}</p>
          </div>
        )}

        {/* Continue */}
        <Button size="lg" className="w-full" disabled={!canContinue} onClick={handleContinue}>
          <ArrowRight className="mr-2 h-5 w-5" />
          Commencer la session
        </Button>

        {!canContinue && (
          <p className="text-xs text-center text-muted-foreground">
            Tous les tests doivent être validés pour commencer.
          </p>
        )}

        {/* Lien « Passer » discret en bas */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleContinue}
            className="text-xs text-muted-foreground/70 hover:text-foreground underline"
          >
            Passer les tests
          </button>
        </div>
      </div>
    </CandidateLayout>
  );
}
