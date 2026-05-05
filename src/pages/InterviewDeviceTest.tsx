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
import { cn } from "@/lib/utils";

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
    if (re.test(ua)) return { supported: false, reason: `Vous utilisez le navigateur intégré à ${name}. Il ne permet pas l'accès au micro et à la caméra.` };
  }
  if (/FxiOS/i.test(ua)) return { supported: false, reason: "Firefox sur iPhone ne permet pas l'enregistrement audio. Utilisez Safari." };
  if (typeof window !== "undefined") {
    if (!("MediaRecorder" in window)) return { supported: false, reason: "Votre navigateur ne prend pas en charge l'enregistrement audio." };
    if (!navigator.mediaDevices?.getUserMedia) return { supported: false, reason: "Votre navigateur ne permet pas l'accès au micro et à la caméra." };
    if (!("AudioContext" in window) && !("webkitAudioContext" in window)) return { supported: false, reason: "Votre navigateur ne prend pas en charge l'audio Web." };
  }
  return { supported: true };
}

const MIC_LEVEL_THRESHOLD = 0.05;

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

  const [devices, setDevices] = useState<DeviceLists>({ audio: [], video: [] });
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(getStoredDeviceId("audio"));
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(getStoredDeviceId("video"));

  const [micRetries, setMicRetries] = useState(0);
  const [camRetries, setCamRetries] = useState(0);
  const [soundRetries, setSoundRetries] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const wasReadyRef = useRef(false);

  const refreshDevices = useCallback(async () => {
    setDevices(await listInputDevices());
  }, []);

  // ================== TESTS ==================
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
      const constraints: MediaStreamConstraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
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
      const recorder = new MediaRecorder(stream);
      const recorderPromise = new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 2500);
        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) { clearTimeout(timer); resolve(true); } };
        try { recorder.start(250); } catch { clearTimeout(timer); resolve(false); }
      });
      const [recorderOk] = await Promise.all([recorderPromise, new Promise((r) => setTimeout(r, 3000))]);
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
      await refreshDevices();
    } catch (err) {
      setMicError(classifyMediaError(err, "mic").message);
      setMicStatus("error");
      setRecorderStatus("error");
      setMicRetries((n) => n + 1);
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      try { await audioCtx?.close(); } catch { /* ignore */ }
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
    const fallbackMsg = "La transcription en direct ne fonctionnera pas sur ce navigateur. L'entretien reste possible : vos réponses sont enregistrées et transcrites après coup.";
    if (!SR) { setSttError(fallbackMsg); setSttStatus("warning"); return; }
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
      else { setSttError(fallbackMsg); setSttStatus("warning"); }
    } catch {
      setSttError(fallbackMsg);
      setSttStatus("warning");
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
    if (browserBlocked) return;
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
  }, [browserBlocked]);

  useEffect(() => {
    if (browserBlocked) return;
    const handler = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
  }, [browserBlocked, refreshDevices]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("projects").select("pre_session_message").eq("slug", slug).maybeSingle();
      const d = data as { pre_session_message?: string | null } | null;
      if (d?.pre_session_message?.trim()) setPreSessionMessage(d.pre_session_message.trim());
    })();
  }, [slug]);

  // ================== HANDLERS ==================
  const handleAudioDeviceChange = (id: string) => { setSelectedAudioId(id); setStoredDeviceId("audio", id); void testMicAndRecorder(id); };
  const handleVideoDeviceChange = (id: string) => { setSelectedVideoId(id); setStoredDeviceId("video", id); void testCam(id); };

  const handleContinue = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    navigate(`/session/${slug}/start/${token}`);
  };

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

  const allTests: Status[] = [camStatus, micStatus, soundStatus, sttStatus, networkStatusComputed];
  const verifiedCount = allTests.filter((s) => s === "ok" || s === "warning").length;

  const canContinue =
    (micStatus === "ok" || micStatus === "warning") &&
    camStatus === "ok" &&
    soundStatus === "ok" &&
    recorderStatus === "ok" &&
    !networkBlocking;

  // Effet « célébration » + scroll quand tout est ok
  useEffect(() => {
    if (canContinue && !wasReadyRef.current) {
      wasReadyRef.current = true;
      ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      try { navigator.vibrate?.(15); } catch { /* ignore */ }
    }
  }, [canContinue]);

  const showSkipPrimary =
    !canContinue && (
      micRetries >= 2 || camRetries >= 2 || soundRetries >= 2 ||
      (micStatus === "warning" && camStatus === "ok" && soundStatus === "ok" && recorderStatus === "ok")
    );

  // ================== ÉCRAN BLOQUANT ==================
  if (browserBlocked) {
    return (
      <CandidateLayout>
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <h1 className="text-lg font-semibold">Navigateur non compatible</h1>
            </div>
            <p className="text-sm text-foreground">{browserSupport.current.reason}</p>
            <p className="text-sm text-muted-foreground">
              Pour réaliser l'entretien, ouvrez ce lien dans <strong>Safari</strong> (iPhone) ou{" "}
              <strong>Chrome</strong> (Android et ordinateur).
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={copyLink} variant="outline" className="w-full">
                {linkCopied ? (<><Check className="mr-2 h-4 w-4" />Lien copié</>) : (<><Copy className="mr-2 h-4 w-4" />Copier le lien de l'entretien</>)}
              </Button>
              <button onClick={() => setBrowserBlocked(false)} className="text-xs text-muted-foreground hover:text-foreground underline mt-2">
                Continuer quand même
              </button>
            </div>
          </div>
        </div>
      </CandidateLayout>
    );
  }

  // ================== UI PRINCIPALE ==================
  // La caméra n'est plus un segment de progression : elle est visible en permanence
  // dans le bandeau d'en-tête, son statut s'y lit directement.
  const progressTests: Status[] = [micStatus, soundStatus, sttStatus, networkStatusComputed];
  const progressVerified = progressTests.filter((s) => s === "ok" || s === "warning").length;

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
            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {progressVerified}/{progressTests.length}
            </span>
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

        {/* Liste verticale des tests */}
        <div className="space-y-2.5">
          {/* Micro */}
          <TestCard
            status={micStatus}
            title="Micro et enregistrement"
            icon={Mic}
            fullWidth
          >
            {micStatus === "testing" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Parlez pour tester votre micro…</p>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-100" style={{ width: `${micLevel * 100}%` }} />
                </div>
              </div>
            )}
            {micStatus === "error" && micError && <p className="text-xs text-destructive">{micError}</p>}
            {micStatus === "warning" && micWarning && <p className="text-xs text-amber-600 dark:text-amber-400">{micWarning}</p>}
            {recorderStatus === "error" && micStatus !== "error" && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> L'enregistrement audio n'est pas pris en charge.
              </p>
            )}
            {(micStatus === "error" || micStatus === "warning") && (
              <Button variant="outline" size="sm" onClick={() => testMicAndRecorder(selectedAudioId)} className="w-full">
                Réessayer
              </Button>
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

          {/* Son */}
          <TestCard
            status={soundStatus}
            title="Son"
            icon={Volume2}
            fullWidth
            forceExpanded={soundAwaitingConfirm || soundStatus === "idle"}
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

          {/* Reconnaissance vocale */}
          <TestCard
            status={sttStatus}
            title="Reconnaissance vocale"
            icon={MessageSquare}
            fullWidth
          >
            {sttStatus === "warning" && sttError && <p className="text-xs text-amber-600 dark:text-amber-400">{sttError}</p>}
          </TestCard>

          {/* Réseau */}
          <TestCard
            status={networkStatusComputed}
            title="Connexion"
            icon={Wifi}
            fullWidth
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
                  <p className="text-muted-foreground text-xs">Safari (iPhone), Chrome (Android, Mac, PC).</p>
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
            <Button onClick={handleContinue} variant="outline" size="sm">
              Continuer quand même
            </Button>
          )}
        </div>
      </div>
    </CandidateLayout>
  );
}
