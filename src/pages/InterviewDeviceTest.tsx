import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  ChevronDown,
  Settings2,
  HelpCircle,
  Globe,
} from "lucide-react";
import { detectBrowserCompat, type BrowserCompatResult } from "@/lib/browserCompat";
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
import { measureMicLevel, MIC_THRESHOLDS } from "@/lib/micLevel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIC_TEST_PHRASE = "Bonjour, je suis prêt pour l'entretien.";

type Status = "idle" | "testing" | "ok" | "warning" | "error";
type SpeedQuality = "good" | "limited" | "weak";

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

// ============== STATUS BADGE ==============
function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const map: Record<Status, { text: string; cls: string }> = {
    idle: { text: label ?? "À tester", cls: "bg-muted text-muted-foreground" },
    testing: { text: "Vérification…", cls: "bg-primary/10 text-primary" },
    ok: { text: label ?? "OK", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    warning: { text: label ?? "À vérifier", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    error: { text: label ?? "Problème", cls: "bg-destructive/15 text-destructive" },
  };
  const v = map[status];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium", v.cls)}>{v.text}</span>;
}

// ============== STATUS ICON ==============
function StatusIcon({ status, fallback: Fallback }: { status: Status; fallback: React.ComponentType<{ className?: string }> }) {
  const baseCircle = "flex h-9 w-9 items-center justify-center rounded-full shrink-0";
  if (status === "ok") return <div className={cn(baseCircle, "bg-emerald-500/15")}><CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>;
  if (status === "warning") return <div className={cn(baseCircle, "bg-amber-500/15")}><AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>;
  if (status === "error") return <div className={cn(baseCircle, "bg-destructive/15")}><AlertCircle className="h-5 w-5 text-destructive" /></div>;
  if (status === "testing") return <div className={cn(baseCircle, "bg-primary/10")}><Loader2 className="h-5 w-5 text-primary animate-spin" /></div>;
  return <div className={cn(baseCircle, "bg-muted")}><Fallback className="h-5 w-5 text-muted-foreground" /></div>;
}

// ============== TEST CARD (compact + accordion) ==============
interface TestCardProps {
  status: Status;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  forceExpanded?: boolean;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

function TestCard({ status, title, icon, forceExpanded, children, fullWidth }: TestCardProps) {
  const [userOpen, setUserOpen] = useState(false);
  const shouldOpen = forceExpanded || userOpen || status === "error" || status === "warning" || status === "testing";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all animate-fade-in",
        status === "error" && "border-destructive/40 shadow-sm",
        status === "warning" && "border-amber-500/40",
        status === "ok" && "hover:shadow-md",
        fullWidth && "sm:col-span-2",
      )}
    >
      <button
        type="button"
        onClick={() => setUserOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <StatusIcon status={status} fallback={icon} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
        </div>
        <StatusBadge status={status} />
        {children && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", shouldOpen && "rotate-180")} />
        )}
      </button>
      {children && shouldOpen && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/60 animate-accordion-down">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function InterviewDeviceTest() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [preSessionMessage, setPreSessionMessage] = useState<string | null>(null);

  const browserCompat = useRef<BrowserCompatResult>(detectBrowserCompat());
  const browserStatus: Status =
    browserCompat.current.level === "ok"
      ? "ok"
      : browserCompat.current.level === "warning"
      ? "warning"
      : "error";
  const browserBlocking = browserCompat.current.level === "blocked";
  const attemptIdRef = useRef<string | null>(null);
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

  const [devices, setDevices] = useState<DeviceLists>({ audio: [], video: [] });
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(getStoredDeviceId("audio"));
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(getStoredDeviceId("video"));

  const [micRetries, setMicRetries] = useState(0);
  const [camRetries, setCamRetries] = useState(0);
  const [soundRetries, setSoundRetries] = useState(0);
  // Compte à rebours visuel pendant le test guidé du micro (en s).
  const [micCountdown, setMicCountdown] = useState<number | null>(null);
  // Confirmation avant de contourner les vérifications avec un micro en erreur.
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Parcours guidé pas-à-pas : une étape visible à la fois.
  type Step = "browser" | "mic" | "sound" | "stt" | "network" | "recap";
  const [currentStep, setCurrentStep] = useState<Step>("browser");
  const stepAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const wasReadyRef = useRef(false);

  const refreshDevices = useCallback(async () => {
    setDevices(await listInputDevices());
  }, []);

  // ================== TESTS ==================
  // Test micro guidé : capture 6 s avec phrase à lire, mesure pic RMS +
  // durée cumulée au-dessus du seuil, vérifie aussi MediaRecorder.
  const testMicAndRecorder = useCallback(async (deviceId?: string | null) => {
    setMicStatus("testing");
    setRecorderStatus("testing");
    setMicError(null);
    setMicWarning(null);
    setMicLevel(0);
    setMicCountdown(Math.round(MIC_THRESHOLDS.TEST_DURATION_MS / 1000));

    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let levelCtx: AudioContext | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    const acquireStream = async (id?: string | null) => {
      const constraints: MediaStreamConstraints = id
        ? { audio: { deviceId: { exact: id } } }
        : { audio: true };
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Le périphérique mémorisé n'est plus disponible → on retombe sur le défaut.
        if (id && (err as { name?: string }).name === "OverconstrainedError") {
          setStoredDeviceId("audio", null);
          setSelectedAudioId(null);
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        throw err;
      }
    };

    try {
      stream = await acquireStream(deviceId);

      // Vérification immédiate : la piste est-elle vraiment exploitable ?
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || audioTrack.readyState !== "live" || audioTrack.muted) {
        setMicStatus("error");
        setMicError(
          audioTrack?.muted
            ? "Votre système a coupé le micro. Vérifiez qu'il n'est pas désactivé puis réessayez."
            : "Aucun micro actif détecté. Branchez-en un et réessayez.",
        );
        setRecorderStatus("error");
        setMicRetries((n) => n + 1);
        return;
      }

      // Vu-mètre en temps réel pendant la phase de capture (cosmétique).
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      levelCtx = new Ctor();
      if (levelCtx.state === "suspended") {
        try { await levelCtx.resume(); } catch { /* ignore */ }
      }
      const source = levelCtx.createMediaStreamSource(stream);
      const analyser = levelCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setMicLevel(Math.min(1, rms * 4));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      animFrameRef.current = raf;

      // Compte à rebours visuel synchronisé sur la durée de mesure.
      countdownTimer = setInterval(() => {
        setMicCountdown((c) => (c !== null && c > 1 ? c - 1 : 0));
      }, 1000);

      // Test MediaRecorder en parallèle (vérifie qu'on peut bien encoder).
      const recorder = new MediaRecorder(stream);
      const recorderPromise = new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), MIC_THRESHOLDS.TEST_DURATION_MS - 500);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) { clearTimeout(timer); resolve(true); }
        };
        try { recorder.start(500); } catch { clearTimeout(timer); resolve(false); }
      });

      // Mesure réelle du niveau (peak + durée active) via l'utilitaire commun.
      const [measurement, recorderOk] = await Promise.all([
        measureMicLevel(stream, MIC_THRESHOLDS.TEST_DURATION_MS, MIC_THRESHOLDS.ACTIVE_RMS),
        recorderPromise,
      ]);

      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
      if (raf) cancelAnimationFrame(raf);
      animFrameRef.current = null;
      if (countdownTimer) clearInterval(countdownTimer);
      setMicCountdown(null);
      setMicLevel(0);
      setRecorderStatus(recorderOk ? "ok" : "error");

      const peakOk = measurement.peak >= MIC_THRESHOLDS.TEST_PEAK_MIN;
      const activeOk = measurement.activeMs >= MIC_THRESHOLDS.TEST_ACTIVE_MS_MIN;

      if (!peakOk && !activeOk) {
        // Échec franc : rien d'audible → erreur, pas warning. Bloque la suite.
        setMicStatus("error");
        setMicError("Nous n'avons rien entendu. Vérifiez votre micro, ou choisissez-en un autre, puis relancez le test.");
        setMicRetries((n) => n + 1);
      } else if (!activeOk) {
        // Voix détectée par à-coups : on prévient mais on n'érige pas en blocage.
        setMicStatus("warning");
        setMicWarning("Votre voix paraît faible. Rapprochez-vous du micro et relancez si besoin.");
      } else {
        setMicStatus("ok");
      }
      await refreshDevices();
    } catch (err) {
      setMicError(classifyMediaError(err, "mic").message);
      setMicStatus("error");
      setRecorderStatus("error");
      setMicRetries((n) => n + 1);
    } finally {
      if (countdownTimer) clearInterval(countdownTimer);
      setMicCountdown(null);
      stream?.getTracks().forEach((t) => t.stop());
      try { await levelCtx?.close(); } catch { /* ignore */ }
    }
  }, [refreshDevices]);

  const testCam = useCallback(async (deviceId?: string | null) => {
    setCamStatus("testing");
    setCamError(null);
    try {
      const constraints: MediaStreamConstraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
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
      setCamError(classifyMediaError(err, "cam").message);
      setCamStatus("error");
      setCamRetries((n) => n + 1);
    }
  }, [refreshDevices]);

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

  const testStt = useCallback(async () => {
    setSttStatus("testing");
    setSttError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const blockMsg = "La reconnaissance vocale n'a pas démarré. Utilisez Chrome (Android, Mac, PC) ou Safari (iPhone) pour réaliser l'entretien.";
    if (!SR) { setSttError(blockMsg); setSttStatus("error"); return; }
    try {
      const recognition = new SR();
      recognition.lang = "fr-FR";
      recognition.interimResults = true;
      recognition.continuous = false;
      const ok = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (v: boolean) => {
          if (settled) return; settled = true;
          try { recognition.onstart = null; recognition.onerror = null; recognition.onend = null; } catch { /* ignore */ }
          try { recognition.stop(); } catch { /* ignore */ }
          resolve(v);
        };
        recognition.onstart = () => finish(true);
        recognition.onerror = (e: any) => {
          if (e?.error === "no-speech" || e?.error === "aborted") return finish(true);
          finish(false);
        };
        setTimeout(() => finish(false), 2500);
        try { recognition.start(); } catch { finish(false); }
      });
      if (ok) setSttStatus("ok");
      else { setSttError(blockMsg); setSttStatus("error"); }
    } catch {
      setSttError(blockMsg);
      setSttStatus("error");
    }
  }, []);

  const finishNetwork = useCallback((kbps: number) => {
    setNetKbps(kbps);
    let q: SpeedQuality;
    if (kbps >= 800) q = "good"; else if (kbps >= 250) q = "limited"; else q = "weak";
    setNetQuality(q);
    setNetStatus("ok");
  }, []);

  const testNetwork = useCallback(async () => {
    setNetStatus("testing");
    setNetKbps(null);
    setNetQuality(null);

    // Garde-fou navigateur : si le navigateur signale une connexion 4G/5G/wifi rapide,
    // on considère « ok » sans bloquer l'utilisateur sur une mesure incertaine.
    const conn: any = (navigator as any).connection;
    const effectiveType: string | undefined = conn?.effectiveType;

    // Timeout de sécurité : au-delà de 4s on ne bloque pas le candidat.
    const safetyTimer = setTimeout(() => {
      setNetKbps((prev) => {
        if (prev !== null) return prev;
        // Aucune mesure aboutie : on présume « bon » plutôt que de bloquer.
        if (effectiveType === "2g" || effectiveType === "slow-2g") {
          setNetQuality("weak");
        } else if (effectiveType === "3g") {
          setNetQuality("limited");
        } else {
          setNetQuality("good");
        }
        setNetStatus("ok");
        return 0;
      });
    }, 4000);

    try {
      // On télécharge 2 fois en parallèle un asset déjà servi par l'app
      // pour disposer d'une mesure stable. On garde le meilleur essai.
      const measure = async (i: number): Promise<number | null> => {
        try {
          const r = await fetch(`/placeholder.svg?cb=${Date.now()}-${i}`, { cache: "no-store" });
          const t0 = performance.now();
          const blob = await r.blob();
          const ms = performance.now() - t0;
          if (blob.size < 200 || ms < 2) return null;
          return Math.round((blob.size * 8) / ms);
        } catch {
          return null;
        }
      };
      const results = await Promise.all([measure(1), measure(2), measure(3)]);
      clearTimeout(safetyTimer);
      const valid = results.filter((v): v is number => v !== null);
      if (valid.length === 0) {
        // Aucun échantillon valide : on s'appuie sur le navigateur.
        if (effectiveType === "2g" || effectiveType === "slow-2g") {
          setNetQuality("weak");
        } else if (effectiveType === "3g") {
          setNetQuality("limited");
        } else {
          setNetQuality("good");
        }
        setNetKbps(0);
        setNetStatus("ok");
        return;
      }
      // On prend le meilleur (les pics sont plus représentatifs du débit réel
      // qu'une mesure perturbée par un GC ou un autre onglet).
      finishNetwork(Math.max(...valid));
    } catch {
      clearTimeout(safetyTimer);
      // Même en cas d'erreur fetch, on ne bloque pas.
      setNetQuality("good");
      setNetKbps(0);
      setNetStatus("ok");
    }
  }, [finishNetwork]);

  // ================== LIFECYCLE ==================
  useEffect(() => {
    if (browserBlocking) return;
    let cancelled = false;
    (async () => {
      const perms = await queryPermissions();
      if (cancelled) return;
      if (perms.mic === "denied") {
        setMicStatus("error"); setRecorderStatus("error");
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
  }, [browserBlocking]);

  useEffect(() => {
    if (browserBlocking) return;
    const handler = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
  }, [browserBlocking, refreshDevices]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("projects").select("pre_session_message").eq("slug", slug).maybeSingle();
      const d = data as { pre_session_message?: string | null } | null;
      if (d?.pre_session_message?.trim()) setPreSessionMessage(d.pre_session_message.trim());
    })();
  }, [slug]);

  // Journal de la tentative (user-agent + compatibilité navigateur)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase
          .from("sessions")
          .select("id")
          .eq("token", token)
          .maybeSingle();
        if (cancelled || !sess?.id) return;
        const c = browserCompat.current;
        const { data: inserted } = await supabase
          .from("session_attempts")
          .insert({
            session_id: sess.id,
            user_agent: c.userAgent,
            browser: c.browser,
            browser_version: c.browserVersion ?? null,
            os: c.os,
            device_type: c.deviceType,
            is_in_app_webview: c.isInAppWebview,
            webview_host: c.webviewHost ?? null,
            compat_level: c.level,
            block_reason: c.reason ?? null,
            has_get_user_media: c.hasGetUserMedia,
            has_media_recorder: c.hasMediaRecorder,
            has_audio_context: c.hasAudioContext,
            screen_w: window.screen?.width ?? null,
            screen_h: window.screen?.height ?? null,
            viewport_w: window.innerWidth ?? null,
            viewport_h: window.innerHeight ?? null,
            language: navigator.language ?? null,
          })
          .select("id")
          .maybeSingle();
        if (!cancelled && inserted?.id) attemptIdRef.current = inserted.id;
      } catch { /* silencieux : ne doit jamais bloquer le candidat */ }
    })();
    return () => { cancelled = true; };
  }, [token]);


  // ================== HANDLERS ==================
  const handleAudioDeviceChange = (id: string) => { setSelectedAudioId(id); setStoredDeviceId("audio", id); void testMicAndRecorder(id); };
  const handleVideoDeviceChange = (id: string) => { setSelectedVideoId(id); setStoredDeviceId("video", id); void testCam(id); };

  const handleContinue = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    // Journaliser un éventuel bypass pour que les RH puissent identifier les
    // candidats qui forcent le passage malgré un micro défaillant.
    if (attemptIdRef.current && (micStatus === "error" || micStatus === "warning" || browserStatus !== "ok")) {
      try {
        void supabase.rpc("mark_attempt_proceeded", { _attempt_id: attemptIdRef.current });
      } catch { /* silencieux */ }
    }
    navigate(`/session/${slug}/start/${token}`);
  }, [navigate, slug, token, micStatus, browserStatus]);

  // Le bouton « Passer » ou « Continuer quand même » ouvre une confirmation
  // explicite quand le micro est en erreur — c'est la cause N°1 de sessions
  // ratées (candidat passe outre, l'IA n'entend rien).
  const requestContinueWithCheck = useCallback(() => {
    if (micStatus === "error") {
      setShowSkipConfirm(true);
    } else {
      handleContinue();
    }
  }, [micStatus, handleContinue]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); } catch { /* ignore */ }
  };

  // ================== ÉTAT GLOBAL ==================
  const networkBlocking = netStatus === "ok" && netQuality === "weak";
  const networkStatusComputed: Status = useMemo(() => {
    if (netStatus === "testing") return "testing";
    if (netStatus === "error") return "error";
    if (netQuality === "weak") return "error";
    if (netQuality === "limited") return "warning";
    if (netQuality === "good") return "ok";
    return "idle";
  }, [netStatus, netQuality]);

  const allTests: Status[] = [browserStatus, camStatus, micStatus, soundStatus, sttStatus, networkStatusComputed];
  const verifiedCount = allTests.filter((s) => s === "ok" || s === "warning").length;

  const canContinue =
    !browserBlocking &&
    (micStatus === "ok" || micStatus === "warning") &&
    camStatus === "ok" &&
    soundStatus === "ok" &&
    recorderStatus === "ok" &&
    sttStatus === "ok" &&
    !networkBlocking;

  // Quand toutes les vérifications sont vertes : transition automatique vers l'écran suivant
  useEffect(() => {
    if (canContinue && !wasReadyRef.current) {
      wasReadyRef.current = true;
      ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      try { navigator.vibrate?.(15); } catch { /* ignore */ }
      const t = setTimeout(() => { handleContinue(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [canContinue]);

  const showSkipPrimary =
    !canContinue && !browserBlocking && sttStatus !== "error" && (
      micRetries >= 2 || camRetries >= 2 || soundRetries >= 2 ||
      (micStatus === "warning" && camStatus === "ok" && soundStatus === "ok" && recorderStatus === "ok")
    );

  // (L'écran 100% bloquant a été remplacé par la carte « Navigateur » dans la liste des tests.)

  // ================== UI PRINCIPALE ==================
  // La caméra n'est plus un segment de progression : elle est visible en permanence
  // dans le bandeau d'en-tête, son statut s'y lit directement.
  const progressTests: Status[] = [browserStatus, micStatus, soundStatus, sttStatus, networkStatusComputed];
  const progressVerified = progressTests.filter((s) => s === "ok" || s === "warning").length;

  // ================== STEP MACHINE ==================
  // Ordre des étapes : on saute STT sauf s'il est en erreur (alors étape bloquante).
  const stepOrder: Step[] = useMemo(() => {
    const base: Step[] = ["browser", "mic", "sound", "network", "recap"];
    if (sttStatus === "error") {
      // Intercaler STT juste avant le récap pour bloquer si la reco vocale a échoué.
      const i = base.indexOf("network");
      return [...base.slice(0, i + 1), "stt", ...base.slice(i + 1)];
    }
    return base;
  }, [sttStatus]);

  const stepStatus = (s: Step): Status => {
    switch (s) {
      case "browser": return browserStatus;
      case "mic": return micStatus;
      case "sound": return soundStatus;
      case "stt": return sttStatus;
      case "network": return networkStatusComputed;
      case "recap": return "idle";
    }
  };

  const goToNextStep = useCallback(() => {
    const i = stepOrder.indexOf(currentStep);
    if (i >= 0 && i < stepOrder.length - 1) setCurrentStep(stepOrder[i + 1]);
  }, [currentStep, stepOrder]);

  // Auto-avance : dès que l'étape courante passe en « ok », on enchaîne après 800 ms.
  useEffect(() => {
    if (stepAdvanceTimer.current) {
      clearTimeout(stepAdvanceTimer.current);
      stepAdvanceTimer.current = null;
    }
    if (currentStep === "recap") return;
    const st = stepStatus(currentStep);
    if (st === "ok") {
      stepAdvanceTimer.current = setTimeout(() => {
        goToNextStep();
      }, 800);
    }
    return () => {
      if (stepAdvanceTimer.current) {
        clearTimeout(stepAdvanceTimer.current);
        stepAdvanceTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, browserStatus, micStatus, soundStatus, sttStatus, networkStatusComputed]);

  const stepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length - 1; // hors récap
  const stepNumber = Math.min(stepIndex + 1, totalSteps);
  const stepLabels: Record<Step, string> = {
    browser: "Navigateur",
    mic: "Micro",
    sound: "Son",
    stt: "Reconnaissance vocale",
    network: "Connexion",
    recap: "Récapitulatif",
  };
  const stepIcons: Record<Step, React.ComponentType<{ className?: string }>> = {
    browser: Globe, mic: Mic, sound: Volume2, stt: MessageSquare, network: Wifi, recap: CheckCircle,
  };
  // L'étape micro/son/réseau peut être passée (best-effort) si elle est en erreur.
  const canSkipCurrent = currentStep === "mic" || currentStep === "sound" || currentStep === "network";


  return (
    <CandidateLayout>
      <div className="w-full max-w-2xl space-y-5 pb-28 sm:pb-8">
        {/* Header */}
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Vérification technique</h1>
              <p className="text-sm text-muted-foreground">Quelques secondes pour s'assurer que tout fonctionne.</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <button
                type="button"
                onClick={requestContinueWithCheck}
                className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Passer
              </button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {progressVerified}/{progressTests.length}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5" aria-label="Progression des tests">
            {progressTests.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-500",
                  s === "ok" && "bg-emerald-500",
                  s === "warning" && "bg-amber-500",
                  s === "error" && "bg-destructive",
                  s === "testing" && "bg-primary/60 animate-pulse",
                  s === "idle" && "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {/* Bandeau caméra (vignette) */}
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-3 animate-fade-in">
          <div
            className={cn(
              "relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-2xl bg-black",
              camStatus === "error" && "bg-amber-500/10 ring-2 ring-amber-500/40",
            )}
          >
            {(camStatus === "ok" || camStatus === "testing") && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            )}
            {camStatus === "testing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
            {camStatus === "error" && (
              <button
                type="button"
                onClick={() => testCam(selectedVideoId)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-amber-700 dark:text-amber-400"
              >
                <Video className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight text-center px-1">Activer la caméra</span>
              </button>
            )}
            {camStatus === "ok" && (
              <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium">
              {camStatus === "ok" && "Vous êtes bien cadré"}
              {camStatus === "testing" && "Activation de la caméra…"}
              {camStatus === "error" && "Caméra non disponible"}
              {camStatus === "idle" && "Caméra"}
            </p>
            {camStatus === "error" && camError && (
              <p className="text-xs text-muted-foreground line-clamp-2">{camError}</p>
            )}
            {camStatus === "ok" && devices.video.length > 1 && (
              <DeviceSelector
                devices={devices.video}
                value={selectedVideoId}
                onChange={handleVideoDeviceChange}
                placeholder="Changer de caméra"
              />
            )}
            {camStatus === "ok" && devices.video.length <= 1 && (
              <p className="text-xs text-muted-foreground">L'image que verra votre interlocuteur.</p>
            )}
          </div>
        </div>

        {/* Indicateur d'étape : « Étape X/Y — Nom » */}
        {currentStep !== "recap" && (
          <div className="flex items-center justify-between text-xs text-muted-foreground animate-fade-in">
            <span>
              Étape <span className="font-semibold text-foreground tabular-nums">{stepNumber}</span>
              <span> / {totalSteps}</span>
              <span className="mx-2">·</span>
              <span className="text-foreground">{stepLabels[currentStep]}</span>
            </span>
            {canSkipCurrent && stepStatus(currentStep) !== "ok" && (
              <button
                type="button"
                onClick={goToNextStep}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Passer cette étape
              </button>
            )}
          </div>
        )}

        {/* Étape courante : une seule carte affichée à la fois */}
        <div className="min-h-[180px]">
          {currentStep === "browser" && (
            <TestCard
              key="step-browser"
              status={browserStatus}
              title="Navigateur compatible"
              icon={Globe}
              fullWidth
              forceExpanded
            >
              {browserCompat.current.level === "ok" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {browserCompat.current.browser}
                  {browserCompat.current.browserVersion ? ` ${browserCompat.current.browserVersion.split(".")[0]}` : ""}
                  {` sur ${browserCompat.current.os}`}
                </p>
              )}
              {browserCompat.current.level === "warning" && browserCompat.current.reason && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{browserCompat.current.reason}</p>
              )}
              {browserCompat.current.level === "blocked" && (
                <div className="space-y-3">
                  <p className="text-xs text-destructive">{browserCompat.current.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Pour réaliser l'entretien, ouvrez ce lien dans <strong>Safari</strong> (iPhone) ou{" "}
                    <strong>Chrome</strong> (Android et ordinateur).
                  </p>
                  <Button onClick={copyLink} variant="outline" size="sm" className="w-full">
                    {linkCopied ? (<><Check className="mr-2 h-4 w-4" />Lien copié</>) : (<><Copy className="mr-2 h-4 w-4" />Copier le lien de l'entretien</>)}
                  </Button>
                </div>
              )}
            </TestCard>
          )}

          {currentStep === "mic" && (
            <TestCard
              key="step-mic"
              status={micStatus}
              title="Micro et enregistrement"
              icon={Mic}
              fullWidth
              forceExpanded
            >
              {micStatus === "idle" && (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "hsl(var(--l-fg) / 0.65)" }}>
                    Cliquez puis lisez cette phrase à voix haute&nbsp;:
                  </p>
                  <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm font-medium text-foreground italic text-center">
                    « {MIC_TEST_PHRASE} »
                  </p>
                  <button
                    type="button"
                    onClick={() => testMicAndRecorder(selectedAudioId)}
                    className="candidate-btn-primary inline-flex items-center justify-center gap-2 w-full h-10 rounded-md text-sm font-medium transition-colors"
                  >
                    <Mic className="h-4 w-4" /> Tester mon micro
                  </button>
                </div>
              )}
              {micStatus === "testing" && (
                <div className="space-y-3">
                  <p className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground italic text-center">
                    « {MIC_TEST_PHRASE} »
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs" style={{ color: "hsl(var(--l-fg) / 0.65)" }}>
                      Lisez la phrase à voix haute…
                    </p>
                    {micCountdown !== null && (
                      <span className="text-xs font-mono tabular-nums text-primary">
                        {micCountdown}s
                      </span>
                    )}
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: "hsl(var(--l-fg) / 0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{ width: `${micLevel * 100}%`, background: "hsl(var(--l-accent))" }}
                    />
                  </div>
                </div>
              )}
              {micStatus === "error" && micError && <p className="text-xs text-destructive">{micError}</p>}
              {micStatus === "warning" && micWarning && (
                <p className="text-xs" style={{ color: "hsl(38 92% 60%)" }}>{micWarning}</p>
              )}
              {recorderStatus === "error" && micStatus !== "error" && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> L'enregistrement audio n'est pas pris en charge.
                </p>
              )}
              {(micStatus === "error" || micStatus === "warning") && (
                <button
                  type="button"
                  onClick={() => testMicAndRecorder(selectedAudioId)}
                  className="candidate-btn-secondary inline-flex items-center justify-center gap-2 w-full h-10 rounded-md text-sm font-medium transition-colors"
                >
                  <Mic className="h-4 w-4" /> Réessayer
                </button>
              )}
              {devices.audio.length > 1 && (
                <DeviceSelector
                  devices={devices.audio}
                  value={selectedAudioId}
                  onChange={handleAudioDeviceChange}
                  placeholder="Choisir un micro"
                  disabled={micStatus === "testing"}
                />
              )}
            </TestCard>
          )}

          {currentStep === "sound" && (
            <TestCard
              key="step-sound"
              status={soundStatus}
              title="Son"
              icon={Volume2}
              fullWidth
              forceExpanded
            >
              {soundStatus === "idle" && !soundAwaitingConfirm && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Touchez le bouton et vérifiez que vous entendez bien un bip.</p>
                  <Button size="sm" onClick={testSound} className="w-full">
                    <Volume2 className="mr-2 h-4 w-4" /> Tester le son
                  </Button>
                </div>
              )}
              {soundAwaitingConfirm && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">Avez-vous entendu le bip ?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => confirmSoundHeard(false)}>Non</Button>
                    <Button size="sm" className="flex-1" onClick={() => confirmSoundHeard(true)}>Oui, j'ai entendu</Button>
                  </div>
                </div>
              )}
              {soundStatus === "error" && soundError && (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{soundError}</p>
                  <Button variant="outline" size="sm" onClick={testSound} className="w-full">Réessayer</Button>
                </div>
              )}
            </TestCard>
          )}

          {currentStep === "stt" && (
            <TestCard
              key="step-stt"
              status={sttStatus}
              title="Reconnaissance vocale"
              icon={MessageSquare}
              fullWidth
              forceExpanded
            >
              {sttStatus === "error" && sttError && (
                <div className="space-y-3">
                  <p className="text-xs text-destructive">{sttError}</p>
                  <Button onClick={copyLink} variant="outline" size="sm" className="w-full">
                    {linkCopied ? (<><Check className="mr-2 h-4 w-4" />Lien copié</>) : (<><Copy className="mr-2 h-4 w-4" />Copier le lien de l'entretien</>)}
                  </Button>
                </div>
              )}
            </TestCard>
          )}

          {currentStep === "network" && (
            <TestCard
              key="step-network"
              status={networkStatusComputed}
              title="Connexion"
              icon={Wifi}
              fullWidth
              forceExpanded
            >
              {netStatus === "testing" && <p className="text-xs text-muted-foreground">Mesure du débit en cours…</p>}
              {netStatus === "ok" && netQuality === "good" && (
                <p
                  className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
                  title={netKbps && netKbps > 0 ? `${netKbps >= 1000 ? `${(netKbps / 1000).toFixed(1)} Mb/s` : `${netKbps} kb/s`}` : undefined}
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Connexion stable
                </p>
              )}
              {netStatus === "ok" && netQuality === "limited" && netKbps !== null && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Connexion limitée — la session reste possible
                  {netKbps > 0 && ` (${netKbps >= 1000 ? `${(netKbps / 1000).toFixed(1)} Mb/s` : `${netKbps} kb/s`})`}
                </p>
              )}
              {networkBlocking && (
                <p className="text-xs text-destructive">
                  Connexion trop faible. Rapprochez-vous de votre Wi-Fi ou passez en 4G, puis refaites le test.
                </p>
              )}
              {(netStatus === "ok" || netStatus === "error") && netQuality !== "good" && (
                <Button variant="ghost" size="sm" onClick={testNetwork} className="w-full">Refaire le test</Button>
              )}
            </TestCard>
          )}

          {currentStep === "recap" && (
            <div key="step-recap" className="space-y-3 animate-fade-in">
              <div className="rounded-xl border bg-card p-4 space-y-2.5">
                <p className="text-sm font-medium mb-2">Récapitulatif</p>
                {([
                  ["browser", browserStatus] as const,
                  ["mic", micStatus] as const,
                  ["sound", soundStatus] as const,
                  ["stt", sttStatus] as const,
                  ["network", networkStatusComputed] as const,
                ]).map(([key, st]) => {
                  const Icon = stepIcons[key as Step];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <StatusIcon status={st} fallback={Icon} />
                      <p className="flex-1 text-sm">{stepLabels[key as Step]}</p>
                      <StatusBadge status={st} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* Message pré-session */}
        {preSessionMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-fade-in">
            <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{preSessionMessage}</p>
          </div>
        )}

        {/* Aide */}
        <div className="flex justify-center">
          <Sheet>
            <SheetTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> Besoin d'aide ?
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Besoin d'aide ?</SheetTitle>
                <SheetDescription>Quelques pistes pour résoudre les problèmes courants.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Caméra ou micro refusés</p>
                  <p className="text-muted-foreground text-xs">
                    Cliquez sur l'icône cadenas dans la barre d'adresse, autorisez l'accès, puis rechargez la page.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Aucun son sur iPhone</p>
                  <p className="text-muted-foreground text-xs">
                    Vérifiez le bouton silencieux (côté gauche), montez le volume, débranchez les écouteurs.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Micro déjà utilisé</p>
                  <p className="text-muted-foreground text-xs">
                    Fermez Zoom, Teams, ou tout autre onglet qui pourrait utiliser votre micro ou caméra.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Navigateurs recommandés</p>
                  <p className="text-muted-foreground text-xs">Chrome ou Edge (Android, Mac, PC), Safari (iPhone). Firefox et les navigateurs intégrés (LinkedIn, Gmail, Outlook…) ne sont pas pris en charge.</p>
                </div>
                <Button onClick={copyLink} variant="outline" className="w-full">
                  {linkCopied ? (<><Check className="mr-2 h-4 w-4" />Lien copié</>) : (<><Copy className="mr-2 h-4 w-4" />Copier le lien pour ouvrir sur un autre appareil</>)}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* CTA sous les tests, centré */}
        <div ref={ctaRef} className="mt-8 flex flex-col items-center gap-3">
          <Button
            className={cn(
              "h-14 px-10 text-lg font-semibold rounded-2xl transition-all",
              canContinue
                ? "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 hover:scale-[1.02]"
                : "",
            )}
            disabled={!canContinue}
            onClick={handleContinue}
          >
            {canContinue ? (
              <><Sparkles className="mr-2 h-5 w-5" />C'est parti<ArrowRight className="ml-2 h-5 w-5" /></>
            ) : (
              <><ArrowRight className="mr-2 h-5 w-5" />Commencer la session</>
            )}
          </Button>
          {showSkipPrimary && (
            <Button onClick={requestContinueWithCheck} variant="outline" size="sm">
              Continuer quand même
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation explicite avant de contourner un micro défaillant */}
      <Dialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continuer sans micro fonctionnel&nbsp;?</DialogTitle>
            <DialogDescription>
              Votre micro n'a pas été détecté. Sans son, vos réponses ne pourront pas être analysées et la session risque d'échouer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSkipConfirm(false);
                void testMicAndRecorder(selectedAudioId);
              }}
            >
              Refaire le test
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowSkipConfirm(false);
                handleContinue();
              }}
            >
              Je continue quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CandidateLayout>
  );
}
