import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  Video,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
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
import {
  classifyMediaError,
  queryPermissions,
  listInputDevices,
  getStoredDeviceId,
  setStoredDeviceId,
  type DeviceLists,
} from "@/lib/deviceDiagnostics";
import DeviceSelector from "@/components/interview/DeviceSelector";

type Status = "idle" | "testing" | "ok" | "warning" | "error";
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

const MIC_LEVEL_THRESHOLD = 0.05;

export default function InterviewDeviceTest() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [preSessionMessage, setPreSessionMessage] = useState<string | null>(null);

  const browserSupport = useRef<BrowserSupport>(detectUnsupportedBrowser());
  const [browserBlocked, setBrowserBlocked] = useState(!browserSupport.current.supported);
  const [linkCopied, setLinkCopied] = useState(false);

  const [micStatus, setMicStatus] = useState<Status>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [recorderStatus, setRecorderStatus] = useState<Status>("idle");

  const [camStatus, setCamStatus] = useState<Status>("idle");
  const [camError, setCamError] = useState<string | null>(null);

  const [soundStatus, setSoundStatus] = useState<Status>("idle");
  const [soundAwaitingConfirm, setSoundAwaitingConfirm] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);

  const [netStatus, setNetStatus] = useState<Status>("idle");
  const [netKbps, setNetKbps] = useState<number | null>(null);
  const [netQuality, setNetQuality] = useState<SpeedQuality | null>(null);

  const [sttStatus, setSttStatus] = useState<Status>("idle");
  const [sttError, setSttError] = useState<string | null>(null);

  // Périphériques disponibles + sélection
  const [devices, setDevices] = useState<DeviceLists>({ audio: [], video: [] });
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(getStoredDeviceId("audio"));
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(getStoredDeviceId("video"));

  // Compteurs de retry pour afficher « Continuer quand même » au-delà de 2 échecs
  const [micRetries, setMicRetries] = useState(0);
  const [camRetries, setCamRetries] = useState(0);
  const [soundRetries, setSoundRetries] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const refreshDevices = useCallback(async () => {
    const list = await listInputDevices();
    setDevices(list);
  }, []);

  // ================== MICRO + ENREGISTREMENT (test fusionné) ==================
  const testMicAndRecorder = useCallback(async (deviceId?: string | null) => {
    setMicStatus("testing");
    setRecorderStatus("testing");
    setMicError(null);
    setMicWarning(null);
    setMicLevel(0);

    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let raf: number | null = null;

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Analyser pour la jauge + détection de niveau réel
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtx = new Ctor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let peak = 0;

      const poll = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 80, 1);
        if (normalized > peak) peak = normalized;
        setMicLevel(normalized);
        raf = requestAnimationFrame(poll);
      };
      poll();
      animFrameRef.current = raf;

      // Test simultané du MediaRecorder sur le même flux
      const recorder = new MediaRecorder(stream);
      const recorderPromise = new Promise<boolean>((resolve) => {
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

      const [recorderOk] = await Promise.all([
        recorderPromise,
        new Promise((r) => setTimeout(r, 3000)),
      ]);

      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
      if (raf) cancelAnimationFrame(raf);
      animFrameRef.current = null;

      setMicLevel(0);
      setRecorderStatus(recorderOk ? "ok" : "error");

      if (peak < MIC_LEVEL_THRESHOLD) {
        setMicStatus("warning");
        setMicWarning("Aucun son détecté. Parlez plus fort, ou choisissez un autre micro ci-dessous.");
      } else {
        setMicStatus("ok");
      }

      // Après autorisation, on peut enfin lire les labels des périphériques
      await refreshDevices();
    } catch (err) {
      const cls = classifyMediaError(err, "mic");
      setMicError(cls.message);
      setMicStatus("error");
      setRecorderStatus("error");
      setMicRetries((n) => n + 1);
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      try { await audioCtx?.close(); } catch { /* ignore */ }
    }
  }, [refreshDevices]);

  // ================== CAMÉRA ==================
  const testCam = useCallback(async (deviceId?: string | null) => {
    setCamStatus("testing");
    setCamError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      // Stoppe l'ancien flux avant d'en ouvrir un nouveau
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCamStatus("ok");
      await refreshDevices();
    } catch (err) {
      const cls = classifyMediaError(err, "cam");
      setCamError(cls.message);
      setCamStatus("error");
      setCamRetries((n) => n + 1);
    }
  }, [refreshDevices]);

  // ================== SON ==================
  const testSound = useCallback(async () => {
    setSoundStatus("testing");
    setSoundError(null);
    setSoundAwaitingConfirm(false);
    try {
      const ok = await playBeep();
      if (!ok) {
        setSoundStatus("error");
        setSoundError("Lecture bloquée par le navigateur. Touchez à nouveau pour réessayer.");
        setSoundRetries((n) => n + 1);
        return;
      }
      // Bip joué : on attend la confirmation utilisateur (mode silencieux iOS).
      setSoundAwaitingConfirm(true);
      setSoundStatus("testing");
    } catch {
      setSoundStatus("error");
      setSoundError("Impossible de tester le son.");
      setSoundRetries((n) => n + 1);
    }
  }, []);

  const confirmSoundHeard = (heard: boolean) => {
    setSoundAwaitingConfirm(false);
    if (heard) {
      setSoundStatus("ok");
      setSoundError(null);
    } else {
      setSoundStatus("error");
      setSoundError("Vérifiez le bouton silencieux (côté gauche de l'iPhone), montez le volume, et débranchez vos écouteurs si besoin.");
      setSoundRetries((n) => n + 1);
    }
  };

  // ================== RECONNAISSANCE VOCALE (non bloquant) ==================
  const testStt = useCallback(async () => {
    setSttStatus("testing");
    setSttError(null);
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSttError("La transcription en direct ne fonctionnera pas sur ce navigateur. L'entretien reste possible : vos réponses sont enregistrées et transcrites après coup.");
      setSttStatus("warning");
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
            finish(true);
            return;
          }
          finish(false);
        };
        setTimeout(() => finish(false), 2500);
        try {
          recognition.start();
        } catch {
          finish(false);
        }
      });
      if (ok) {
        setSttStatus("ok");
      } else {
        setSttError("La transcription en direct ne fonctionnera pas sur ce navigateur. L'entretien reste possible : vos réponses sont enregistrées et transcrites après coup.");
        setSttStatus("warning");
      }
    } catch {
      setSttError("La transcription en direct ne fonctionnera pas sur ce navigateur. L'entretien reste possible : vos réponses sont enregistrées et transcrites après coup.");
      setSttStatus("warning");
    }
  }, []);

  // ================== RÉSEAU ==================
  const finishNetwork = useCallback((kbps: number) => {
    setNetKbps(kbps);
    let q: SpeedQuality;
    if (kbps >= 600) q = "good";
    else if (kbps >= 300) q = "limited";
    else q = "weak";
    setNetQuality(q);
    setNetStatus("ok");
  }, []);

  const testNetwork = useCallback(async () => {
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
          finishNetwork(Math.round((bigBytes * 8) / bigElapsed));
          return;
        }
      } catch {
        /* fallback */
      }
      if (totalBytes < 1000 || elapsedMs < 5) {
        finishNetwork(2000);
        return;
      }
      finishNetwork(Math.round((totalBytes * 8) / elapsedMs));
    } catch (err) {
      console.warn("[network test] failed", err);
      setNetStatus("error");
    }
  }, [finishNetwork]);

  // ================== CYCLE DE VIE ==================
  useEffect(() => {
    if (browserBlocked) return;

    let cancelled = false;
    (async () => {
      // Pré-détection des permissions refusées : évite un prompt qui sera silencieusement rejeté
      const perms = await queryPermissions();
      if (cancelled) return;
      if (perms.mic === "denied") {
        setMicStatus("error");
        setRecorderStatus("error");
        setMicError("Accès refusé. Cliquez sur l'icône cadenas dans la barre d'adresse, autorisez le micro, puis rechargez la page.");
      } else {
        await testMicAndRecorder(selectedAudioId);
      }
      if (cancelled) return;
      if (perms.cam === "denied") {
        setCamStatus("error");
        setCamError("Accès refusé. Cliquez sur l'icône cadenas dans la barre d'adresse, autorisez la caméra, puis rechargez la page.");
      } else {
        await testCam(selectedVideoId);
      }
      if (cancelled) return;
      testNetwork();
      testStt();
    })();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserBlocked]);

  // Rafraîchit la liste des devices si l'utilisateur en branche/débranche
  useEffect(() => {
    if (browserBlocked) return;
    const handler = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
  }, [browserBlocked, refreshDevices]);

  // Charger infos projet
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

  // ================== HANDLERS ==================
  const handleAudioDeviceChange = (id: string) => {
    setSelectedAudioId(id);
    setStoredDeviceId("audio", id);
    void testMicAndRecorder(id);
  };

  const handleVideoDeviceChange = (id: string) => {
    setSelectedVideoId(id);
    setStoredDeviceId("video", id);
    void testCam(id);
  };

  const handleContinue = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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

  // ================== ÉTAT GLOBAL ==================
  const networkBlocking = netStatus === "ok" && netQuality === "weak";

  // Le STT et le niveau micro faible sont des warnings non bloquants.
  // L'enregistrement (recorder) est bloquant : sans lui, pas d'entretien possible.
  const blockingErrors: string[] = [];
  if (camStatus === "error") blockingErrors.push("Caméra inaccessible");
  if (micStatus === "error") blockingErrors.push("Micro inaccessible");
  if (recorderStatus === "error" && micStatus !== "error") blockingErrors.push("Enregistrement impossible");
  if (soundStatus === "error" || soundStatus === "idle") blockingErrors.push("Son non testé");
  if (networkBlocking) blockingErrors.push("Connexion trop faible");

  const canContinue =
    (micStatus === "ok" || micStatus === "warning") &&
    camStatus === "ok" &&
    soundStatus === "ok" &&
    recorderStatus === "ok" &&
    !networkBlocking;

  // « Continuer quand même » visible si : warnings non bloquants seulement, ou retries >= 2
  const showSkipPrimary =
    !canContinue && (
      micRetries >= 2 || camRetries >= 2 || soundRetries >= 2 ||
      (micStatus === "warning" && camStatus === "ok" && soundStatus === "ok" && recorderStatus === "ok")
    );

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

  // ================== ÉCRAN BLOQUANT ==================
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
              <p className="text-sm text-foreground">{browserSupport.current.reason}</p>
              <p className="text-sm text-muted-foreground">
                Pour réaliser l'entretien, ouvrez ce lien dans <strong>Safari</strong> (iPhone) ou{" "}
                <strong>Chrome</strong> (Android et ordinateur).
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={copyLink} variant="outline" className="w-full">
                  {linkCopied ? (
                    <><Check className="mr-2 h-4 w-4" />Lien copié</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />Copier le lien de l'entretien</>
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

        {/* Bandeau de bilan */}
        {blockingErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-destructive">
                  {blockingErrors.length === 1 ? "Un problème à régler :" : `${blockingErrors.length} problèmes à régler :`}
                </p>
                <ul className="text-xs text-foreground space-y-0.5">
                  {blockingErrors.map((e) => <li key={e}>• {e}</li>)}
                </ul>
              </div>
            </div>
            <Button onClick={copyLink} variant="outline" size="sm" className="w-full">
              {linkCopied ? (
                <><Check className="mr-2 h-4 w-4" />Lien copié</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" />Copier le lien pour ouvrir sur un autre appareil</>
              )}
            </Button>
          </div>
        )}

        {/* Caméra */}
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
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={() => testCam(selectedVideoId)}>
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

            {camStatus === "error" && camError && (
              <p className="text-xs text-destructive text-center">{camError}</p>
            )}

            <DeviceSelector
              devices={devices.video}
              value={selectedVideoId}
              onChange={handleVideoDeviceChange}
              placeholder="Choisir une caméra"
              disabled={camStatus === "testing"}
            />
          </CardContent>
        </Card>

        {/* Micro + enregistrement (test fusionné) */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {micStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : micStatus === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : micStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Microphone</span>
              </div>
              {(micStatus === "error" || micStatus === "warning") && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={() => testMicAndRecorder(selectedAudioId)}>
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

            {micStatus === "error" && micError && (
              <p className="text-xs text-destructive text-center">{micError}</p>
            )}

            {micStatus === "warning" && micWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">{micWarning}</p>
            )}

            {micStatus === "ok" && recorderStatus === "ok" && (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Enregistrement opérationnel</span>
              </div>
            )}

            {recorderStatus === "error" && micStatus !== "error" && (
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">L'enregistrement audio n'est pas pris en charge.</span>
              </div>
            )}

            <DeviceSelector
              devices={devices.audio}
              value={selectedAudioId}
              onChange={handleAudioDeviceChange}
              placeholder="Choisir un micro"
              disabled={micStatus === "testing"}
            />
          </CardContent>
        </Card>

        {/* Son */}
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
              {soundStatus !== "ok" && !soundAwaitingConfirm && (
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

            {soundStatus === "idle" && !soundAwaitingConfirm && (
              <p className="text-xs text-muted-foreground">
                Touchez « Tester le son » et vérifiez que vous entendez bien un bip.
              </p>
            )}

            {soundAwaitingConfirm && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Avez-vous entendu le bip ?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => confirmSoundHeard(false)}>
                    Non, refaire
                  </Button>
                  <Button size="sm" className="flex-1 min-h-[44px]" onClick={() => confirmSoundHeard(true)}>
                    Oui, j'ai entendu
                  </Button>
                </div>
              </div>
            )}

            {soundStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Son audible</p>
            )}
            {soundStatus === "error" && soundError && (
              <p className="text-xs text-destructive">{soundError}</p>
            )}
          </CardContent>
        </Card>

        {/* Reconnaissance vocale (non bloquant) */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sttStatus === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : sttStatus === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : sttStatus === "testing" ? (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Reconnaissance vocale</span>
              </div>
            </div>

            {sttStatus === "testing" && (
              <p className="text-xs text-muted-foreground text-center">Vérification en cours…</p>
            )}
            {sttStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✓ Votre navigateur permet de transcrire votre voix en direct.
              </p>
            )}
            {sttStatus === "warning" && sttError && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{sttError}</p>
            )}
          </CardContent>
        </Card>

        {/* Connexion */}
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
              <p className="text-xs text-destructive text-center">Impossible de mesurer la connexion.</p>
            )}
          </CardContent>
        </Card>

        {preSessionMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 animate-fade-in">
            <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{preSessionMessage}</p>
          </div>
        )}

        <Button size="lg" className="w-full" disabled={!canContinue} onClick={handleContinue}>
          <ArrowRight className="mr-2 h-5 w-5" />
          Commencer la session
        </Button>

        {!canContinue && (
          <p className="text-xs text-center text-muted-foreground">
            Tous les tests doivent être validés pour commencer.
          </p>
        )}

        {/* Bouton « Continuer quand même » contextuel */}
        {showSkipPrimary ? (
          <Button onClick={handleContinue} variant="outline" size="lg" className="w-full">
            Continuer quand même
          </Button>
        ) : (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleContinue}
              className="text-xs text-muted-foreground/70 hover:text-foreground underline"
            >
              Passer les tests
            </button>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
}
