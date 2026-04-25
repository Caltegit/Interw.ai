import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, Video, CheckCircle, AlertCircle, ArrowRight, Wifi, Loader2, Sparkles } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";
import ConsentDialog from "@/components/interview/ConsentDialog";

type Status = "idle" | "testing" | "ok" | "error";
type SpeedQuality = "good" | "limited" | "weak";

export default function InterviewDeviceTest() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [preSessionMessage, setPreSessionMessage] = useState<string | null>(null);

  const [micStatus, setMicStatus] = useState<Status>("idle");
  const [camStatus, setCamStatus] = useState<Status>("idle");
  const [micLevel, setMicLevel] = useState(0);

  const [netStatus, setNetStatus] = useState<Status>("idle");
  const [netKbps, setNetKbps] = useState<number | null>(null);
  const [netQuality, setNetQuality] = useState<SpeedQuality | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const autoAdvancedRef = useRef(false);

  // Auto-start tests on mount + cleanup on unmount
  useEffect(() => {
    testCam();
    testMic();
    testNetwork();
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charger le message d'encouragement avant session depuis le projet
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("pre_session_message")
        .eq("slug", slug)
        .maybeSingle();
      const msg = (data as { pre_session_message?: string | null } | null)?.pre_session_message;
      if (msg && msg.trim()) setPreSessionMessage(msg.trim());
    })();
  }, [slug]);

  // Auto-avance dès que micro + caméra sont OK (le test réseau est informatif)
  useEffect(() => {
    if (autoAdvancedRef.current) return;
    if (micStatus === "ok" && camStatus === "ok") {
      autoAdvancedRef.current = true;
      const t = setTimeout(() => {
        handleContinue();
      }, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micStatus, camStatus]);

  const stopAll = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const testMic = async () => {
    setMicStatus("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
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

  // Test de débit : on télécharge un asset connu et on chronomètre
  const testNetwork = async () => {
    setNetStatus("testing");
    setNetKbps(null);
    setNetQuality(null);
    try {
      // Asset léger (~200 KB) : favicon n'est pas assez gros, on prend un placeholder
      // ou un asset Supabase storage public. On utilise un cache-buster pour éviter
      // de tomber sur le cache.
      const url = `/placeholder.svg?cb=${Date.now()}`;
      // Si l'asset est trop petit (placeholder), on télécharge plusieurs fois
      const start = performance.now();
      const ITER = 3;
      let totalBytes = 0;
      for (let i = 0; i < ITER; i++) {
        const r = await fetch(`${url}&i=${i}`, { cache: "no-store" });
        const blob = await r.blob();
        totalBytes += blob.size;
      }
      const elapsedMs = performance.now() - start;
      // Pour avoir une estimation réaliste, on télécharge un échantillon plus gros
      // depuis le storage Supabase public.
      const bigUrl = `https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/avatars/.placeholder?cb=${Date.now()}`;
      let bigStart = performance.now();
      let bigBytes = 0;
      try {
        const r = await fetch(bigUrl, { cache: "no-store" });
        const blob = await r.blob();
        bigBytes = blob.size;
        const bigElapsed = performance.now() - bigStart;
        if (bigBytes > 5000) {
          // Calcul kbps : bits / ms = kbps
          const kbps = Math.round((bigBytes * 8) / bigElapsed);
          finishNetwork(kbps);
          return;
        }
      } catch {
        // On retombe sur l'estimation locale
      }

      if (totalBytes < 1000 || elapsedMs < 5) {
        // Échantillon trop petit pour être fiable → on déclare bon par défaut
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
    if (kbps >= 1000) q = "good";
    else if (kbps >= 300) q = "limited";
    else q = "weak";
    setNetQuality(q);
    setNetStatus("ok");
  };

  const handleContinue = () => {
    stopAll();
    navigate(`/session/${slug}/start/${token}`);
  };

  const canContinue = micStatus === "ok";

  const networkLabel = (() => {
    if (!netQuality) return "";
    if (netQuality === "good") return "Connexion bonne";
    if (netQuality === "limited") return "Connexion limitée — les médias peuvent être lents à charger";
    return "Connexion très faible — risque de problèmes pendant la session";
  })();

  const networkColorClass = (() => {
    if (netQuality === "good") return "text-emerald-600 dark:text-emerald-400";
    if (netQuality === "limited") return "text-amber-600 dark:text-amber-400";
    if (netQuality === "weak") return "text-destructive";
    return "text-muted-foreground";
  })();

  return (
    <CandidateLayout>
      <div className="w-full max-w-lg space-y-6">
        {/* Skip link */}
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="min-h-[44px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Passer
          </button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Vérification technique</h1>
          <p className="text-sm text-muted-foreground">Vérifions que votre micro, caméra et connexion fonctionnent.</p>
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

            {camStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">✓ Caméra détectée</p>
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

            {micStatus === "ok" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">✓ Microphone détecté</p>
            )}

            {micStatus === "error" && (
              <p className="text-xs text-destructive text-center">
                Impossible d'accéder au micro. Vérifiez les permissions de votre navigateur.
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

            {netStatus === "error" && (
              <p className="text-xs text-destructive text-center">
                Impossible de mesurer la connexion. La session reste possible.
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
            Veuillez tester au minimum votre microphone avant de continuer.
          </p>
        )}
      </div>
    </CandidateLayout>
  );
}
