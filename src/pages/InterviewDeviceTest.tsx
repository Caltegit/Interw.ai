import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import CandidateLayout from "@/components/CandidateLayout";

export default function InterviewDeviceTest() {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [micStatus, setMicStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [camStatus, setCamStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

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
      let maxSeen = 0;

      const poll = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 80, 1);
        setMicLevel(normalized);
        if (normalized > 0.05) maxSeen++;

        animFrameRef.current = requestAnimationFrame(poll);
      };
      poll();

      // After 3 seconds, evaluate
      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setMicStatus(maxSeen > 10 ? "ok" : "ok"); // Accept even if silent - permission is what matters
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

  const handleContinue = () => {
    stopAll();
    navigate(`/session/${slug}/start/${token}`);
  };

  const canContinue = micStatus === "ok";

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
          <p className="text-sm text-muted-foreground">Vérifions que votre micro + caméra fonctionnent bien.</p>
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
              {camStatus === "idle" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testCam}>
                  Tester
                </Button>
              )}
              {camStatus === "error" && <span className="text-xs text-destructive">Accès refusé</span>}
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
              {micStatus === "idle" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testMic}>
                  Tester
                </Button>
              )}
              {micStatus === "error" && (
                <Button variant="outline" size="sm" className="min-h-[44px] px-4" onClick={testMic}>
                  Réessayer
                </Button>
              )}
            </div>

            {micStatus === "testing" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Parlez pour tester votre micro...</p>
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
