import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, User, Volume2, VolumeX, Eye, EyeOff, CheckCircle2, MousePointerClick, Pause, Play, Trash2, Send, Loader2, Flag, Clock } from "lucide-react";
import QuestionMediaPlayer, { type QuestionMediaPlayerHandle } from "@/components/interview/QuestionMediaPlayer";
import MicVolumeMeter from "@/components/interview/MicVolumeMeter";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import defaultAiAvatar from "@/assets/default-interviewer.png";
import CandidateLayout from "@/components/CandidateLayout";
import FullscreenPrompt from "@/components/interview/FullscreenPrompt";
import { RecordingStatusBadge } from "@/components/interview/RecordingStatusBadge";
import { logger } from "@/lib/logger";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import InterviewBootProgress, { type BootStep, type BootStepStatus } from "@/components/interview/InterviewBootProgress";
import QuestionLoadingOverlay from "@/components/interview/QuestionLoadingOverlay";
import NetworkQualityIndicator from "@/components/interview/NetworkQualityIndicator";
import AudioUnlockOverlay from "@/components/interview/AudioUnlockOverlay";
import AudioDebugPanel from "@/components/interview/AudioDebugPanel";
import ConsentDialog from "@/components/interview/ConsentDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCachedTtsBlob,
  setCachedTtsBlob,
  prefetchTransitionPhrases,
  STATIC_TRANSITION_PHRASES,
} from "@/lib/ttsCache";
import { measureMicLevel, MIC_THRESHOLDS } from "@/lib/micLevel";
import { listInputDevices, setStoredDeviceId, PREFERRED_AUDIO_KEY } from "@/lib/deviceDiagnostics";
import DeviceSelector from "@/components/interview/DeviceSelector";

// Source data-URI silencieuse (~0,1 s) utilisée pour débloquer l'instance Audio
// principale au sein du geste utilisateur initial (clé sur iOS Safari).
const SILENT_AUDIO_DATA_URI =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVEQYHAACMjIVDRUWFA4OBwOBwOBwOAgEAgEAg=";

// Extend window for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Précharge un fichier média (audio/vidéo) dans le cache HTTP du navigateur
// pour permettre une lecture immédiate au moment de l'affichage. Important sur
// mobile où le buffering peut être lent.
const prefetchedUrls = new Set<string>();
function prefetchMedia(url: string | null | undefined) {
  if (!url || prefetchedUrls.has(url)) return;
  prefetchedUrls.add(url);
  try {
    fetch(url, { method: "GET", cache: "force-cache" }).catch((err) => {
      console.warn("[prefetchMedia] failed for", url, err);
    });
  } catch (err) {
    console.warn("[prefetchMedia] threw for", url, err);
  }
}

// Vérifie qu'un média est réellement téléchargeable avant de le présenter au
// candidat. Timeout 8 s + 1 retry. Retourne true si les octets sont en cache,
// false sinon (le caller bascule alors en mode texte).
async function prepareMediaUrl(url: string): Promise<boolean> {
  const attempt = async (): Promise<boolean> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { method: "GET", cache: "force-cache", signal: controller.signal });
      if (!res.ok) return false;
      // Lire le blob garantit que les octets sont bien dans le cache.
      await res.blob();
      return true;
    } catch (e) {
      console.warn("[prepareMediaUrl] attempt failed", url, e);
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
  if (await attempt()) return true;
  // Retry unique
  return attempt();
}

/**
 * Calcule un carré de recadrage centré sur le visage si possible (FaceDetector
 * disponible), sinon fallback heuristique : carré centré horizontalement,
 * décalé vers le haut (centre Y = 38%), taille = min(w,h) * 0.75.
 * Renvoie {sx, sy, size} dans le repère de la source.
 */
async function computeFaceCrop(
  source: HTMLVideoElement | HTMLCanvasElement,
  width: number,
  height: number,
): Promise<{ sx: number; sy: number; size: number }> {
  const FD = (window as any).FaceDetector;
  if (FD) {
    try {
      const detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
      const faces: Array<{ boundingBox: DOMRectReadOnly }> = await detector.detect(source);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        // Agrandir ×1.8 autour du visage pour inclure tête + épaules
        const target = Math.max(box.width, box.height) * 1.8;
        const maxSize = Math.min(width, height);
        const size = Math.min(target, maxSize);
        let sx = cx - size / 2;
        let sy = cy - size / 2;
        sx = Math.max(0, Math.min(width - size, sx));
        sy = Math.max(0, Math.min(height - size, sy));
        return { sx, sy, size };
      }
    } catch (error) {
      console.warn("[thumbnail] FaceDetector indisponible", error);
    }
  }
  // Fallback heuristique : carré centré horizontalement, décalé vers le haut
  const minSide = Math.min(width, height);
  const size = minSide * 0.75;
  const sx = (width - size) / 2;
  let sy = height * 0.38 - size / 2;
  sy = Math.max(0, Math.min(height - size, sy));
  return { sx, sy, size };
}

/**
 * Capture une photo en direct depuis une MediaStream caméra et la recadre
 * autour du visage. Plus fiable que d'extraire un frame depuis le .webm
 * enregistré (souvent noir sur Safari/iOS).
 */
async function captureStreamSnapshot(stream: MediaStream): Promise<Blob | null> {
  if (!stream || stream.getVideoTracks().length === 0) return null;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  try {
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onError);
        reject(new Error("loadeddata failed"));
      };
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
    try {
      await video.play();
    } catch { /* ignore : muted autoplay */ }

    // Attendre 2 frames pour éviter un frame noir
    const waitFrame = () =>
      new Promise<void>((resolve) => {
        const v: any = video;
        if (typeof v.requestVideoFrameCallback === "function") {
          v.requestVideoFrameCallback(() => resolve());
        } else {
          setTimeout(resolve, 250);
        }
      });
    await waitFrame();
    await waitFrame();

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    const { sx, sy, size } = await computeFaceCrop(video, w, h);
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
  } catch (error) {
    console.warn("[thumbnail] live snapshot impossible", error);
    return null;
  } finally {
    try { video.pause(); } catch { /* noop */ }
    video.srcObject = null;
  }
}

async function extractVideoThumbnail(blob: Blob): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;

  const waitForEvent = (target: HTMLVideoElement, eventName: "loadedmetadata" | "seeked") =>
    new Promise<void>((resolve, reject) => {
      const onSuccess = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Échec chargement vidéo: ${eventName}`));
      };
      const cleanup = () => {
        target.removeEventListener(eventName, onSuccess);
        target.removeEventListener("error", onError);
      };
      target.addEventListener(eventName, onSuccess, { once: true });
      target.addEventListener("error", onError, { once: true });
    });

  try {
    video.src = objectUrl;
    await waitForEvent(video, "loadedmetadata");

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const targetTime = duration > 0 ? Math.min(1.5, Math.max(0.05, duration / 2)) : 0;
    if (targetTime > 0) {
      video.currentTime = targetTime;
      await waitForEvent(video, "seeked");
    }

    const w = video.videoWidth || 0;
    const h = video.videoHeight || 0;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const { sx, sy, size } = await computeFaceCrop(video, w, h);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.85);
    });
  } catch (error) {
    console.warn("[thumbnail] extraction impossible", error);
    return null;
  } finally {
    video.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}

export default function InterviewStart() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  type ChatMessage = {
    role: string;
    content: string;
    mediaType?: "written" | "audio" | "video";
    mediaUrl?: string | null;
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readyToStart, setReadyToStart] = useState(false);
  // Lecture audio bloquée par le navigateur → afficher l'overlay de déblocage.
  const [audioBlocked, setAudioBlocked] = useState(false);
  // Action à rejouer après un déblocage manuel utilisateur.
  const pendingReplayRef = useRef<(() => void) | null>(null);
  // Instance Audio unique débloquée par le geste utilisateur initial puis
  // réutilisée pour TOUS les TTS / médias audio de la session (iOS Safari fix).
  const primaryAudioRef = useRef<HTMLAudioElement | null>(null);
  // Diagnostic audio : activé via ?debug=audio dans l'URL ou localStorage.audioDebug=1
  const [audioDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "audio" || params.has("audioDebug")) return true;
      return window.localStorage.getItem("audioDebug") === "1";
    } catch {
      return false;
    }
  });
  const [interviewFinished, setInterviewFinished] = useState(false);
  // Mode « salle d'examen »
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobileLikeRef = useRef<boolean>(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Reprise de session
  const [resumePrompt, setResumePrompt] = useState<{ resumeIndex: number } | null>(null);
  const [restoringMessages, setRestoringMessages] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  // Garde-fou : si l'écoute du micro ne démarre jamais après une transition,
  // on affiche un bandeau permettant au candidat de la relancer ou de passer.
  const [interviewStuck, setInterviewStuck] = useState(false);
  // Aucun signal capté depuis le micro (STT silencieux + RMS plat) → bandeau ambre.
  const [noMicSignal, setNoMicSignal] = useState(false);
  const lastMicRmsAtRef = useRef<number>(0);
  const micAnalyserRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; buffer: Uint8Array } | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);
  const [responseElapsedSec, setResponseElapsedSec] = useState(0);
  const warnedNearLimitRef = useRef(false);
  const autoSentRef = useRef(false);
  const [showSelfView, setShowSelfView] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  // Origine de la pause courante (affichage différencié de l'overlay).
  const [pauseReason, setPauseReason] = useState<"manual" | "auto-silence" | "auto-network">("manual");
  // Liste des micros détectés (utile sur l'écran de pause auto-silence).
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [currentAudioDeviceId, setCurrentAudioDeviceId] = useState<string | null>(null);
  const [switchingDevice, setSwitchingDevice] = useState(false);
  const pausedDuringQuestionRef = useRef(false);
  // Snapshot of the presentation at pause-time, used by resumeInterview
  // (currentPresentationRef may be null by the time resume runs because TTS
  // ends naturally and clears it).
  const pausedReplayRef = useRef<
    | { kind: "tts"; text: string }
    | { kind: "media"; mediaType: "audio" | "video" }
    | null
  >(null);
  const pausedElapsedRef = useRef<number>(0);
  const isListeningRef = useRef(false);
  // Track what the AI is currently presenting so we can replay it on resume
  type Presentation =
    | { kind: "tts"; text: string }
    | { kind: "media"; mediaType: "audio" | "video" }
    | null;
  const currentPresentationRef = useRef<Presentation>(null);
  const recognitionRef = useRef<any>(null);
  const candidateTranscriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const thumbnailCapturedRef = useRef(false);
  // On garde TOUS les éléments <video> selfview montés (mobile + desktop) pour
  // pouvoir leur rattacher le flux caméra simultanément. Indispensable car
  // Tailwind monte les deux variants dans le DOM même quand l'un est masqué.
  const selfViewElsRef = useRef<Set<HTMLVideoElement>>(new Set());
  const attachStreamTo = useCallback((el: HTMLVideoElement) => {
    const stream = streamRef.current;
    if (!stream) return;
    const live = stream.getTracks().some((t) => t.readyState === "live");
    if (!live) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => { /* autoplay rejection ignored */ });
  }, []);
  const reattachAllSelfViews = useCallback(() => {
    selfViewElsRef.current.forEach((el) => attachStreamTo(el));
  }, [attachStreamTo]);
  // Ref callback : enregistre/désenregistre l'élément et lui rattache le flux
  // dès qu'il monte (mobile + desktop, peu importe l'ordre de montage).
  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      selfViewElsRef.current.add(el);
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
      attachStreamTo(el);
    }
  }, [attachStreamTo]);
  const interviewStartTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSttResultAtRef = useRef<number>(0);
  const startListeningRef = useRef<(() => void) | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSkipCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndTriggeredRef = useRef(false);
  const questionVideoChunksRef = useRef<Blob[]>([]);
  const questionRecorderRef = useRef<MediaRecorder | null>(null);
  const allQuestionVideosRef = useRef<{ index: number; url: string }[]>([]);
  // Streaming des chunks vers Storage : index séquentiel et liste des chemins par question.
  const chunkIndexRef = useRef(0);
  const uploadedChunkPathsRef = useRef<string[]>([]);
  const chunkMimeRef = useRef<string>("video/webm");
  // Enregistrement audio séparé (léger, pour la transcription IA — vidéo reste pour la relecture)
  const questionAudioRecorderRef = useRef<MediaRecorder | null>(null);
  const questionAudioChunksRef = useRef<Blob[]>([]);
  const audioMimeRef = useRef<string>("audio/webm;codecs=opus");
  const [pendingChunkUploads, setPendingChunkUploads] = useState(0);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const featuredPlayerRef = useRef<QuestionMediaPlayerHandle>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  // Identifiant monotone du « bloc question » courant. Tout callback (watchdog,
  // onPlaybackEnd, retour TTS) compare son blockId à celui-ci pour ignorer les
  // évènements obsolètes — empêche les superpositions entre questions/relances.
  const currentBlockIdRef = useRef(0);
  // Watchdog: if onPlaybackEnd never fires within 8s, force the listening state
  const playbackWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showManualContinue, setShowManualContinue] = useState(false);
  const manualContinueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendResponseRef = useRef<(() => void) | null>(null);
  // Background jobs (DB inserts, AI calls) — tracked so we can flush before redirect
  const backgroundJobsRef = useRef<Promise<unknown>[]>([]);
  const [backgroundSaving, setBackgroundSaving] = useState(0);
  const trackBackground = useCallback(<T,>(p: Promise<T>): Promise<T> => {
    setBackgroundSaving((n) => n + 1);
    const tracked = p.finally(() => setBackgroundSaving((n) => Math.max(0, n - 1)));
    backgroundJobsRef.current.push(tracked);
    return p;
  }, []);
  // Helper: persist a single message to DB immediately
  const persistMessage = useCallback(
    async (
      sessionId: string,
      role: "ai" | "candidate",
      content: string,
      options?: { questionId?: string | null; videoSegmentUrl?: string | null; audioSegmentUrl?: string | null; isFollowUp?: boolean },
    ) => {
      const { error } = await supabase.from("session_messages").insert({
        session_id: sessionId,
        role,
        content,
        question_id: options?.questionId ?? null,
        is_follow_up: options?.isFollowUp ?? false,
        video_segment_url: options?.videoSegmentUrl ?? null,
        audio_segment_url: options?.audioSegmentUrl ?? null,
      } as never);

      if (error) {
        logger.error("interview_message_persist_failed", {
          role,
          isFollowUp: options?.isFollowUp ?? false,
          error: error.message,
        });
        throw error;
      }
    },
    [],
  );

  // Durée max paramétrée au niveau du projet (défaut 15 min, plage 5–60).
  const maxDurationMinutes = Math.min(60, Math.max(5, Number(project?.max_duration_minutes) || 15));
  const MAX_DURATION_MS = maxDurationMinutes * 60 * 1000;
  // Plafond d'historique IA envoyé à chaque tour (les N derniers messages),
  // pour limiter coût et latence sur les sessions longs.
  const AI_HISTORY_WINDOW = 12;
  // Cadence du silence côté candidat.
  // Aucune relance vocale : un indice visuel discret puis une pause automatique.
  const SILENCE_HINT_MS = 6 * 1000;          // 6s — indice visuel discret
  const SILENCE_TIER3_MS = 12 * 1000;        // 12s — bouton « Passer » mis en avant
  const SILENCE_AUTOPAUSE_MS = 20 * 1000;    // 20s — mise en pause automatique
  const SILENCE_END_WARNING_MS = SILENCE_AUTOPAUSE_MS + 115 * 1000; // pause + 1 min 55 s — avertissement de fin
  const SILENCE_TIMEOUT_MS = SILENCE_AUTOPAUSE_MS + 120 * 1000;     // pause + 2 min — arrêt forcé
  const END_COUNTDOWN_SECONDS = 5;

  // Palier visuel uniquement (1 = indice, 3 = bouton « Passer » mis en avant).
  const [silenceTier, setSilenceTier] = useState<0 | 1 | 2 | 3>(0);
  const silenceHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTier3TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceAutoPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceEndWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPausedRef = useRef(false);
  const [endCountdown, setEndCountdown] = useState<number | null>(null);
  const speakRef = useRef<((t: string) => Promise<void>) | null>(null);

  // Follow-up tracking per question (key = question index)
  const [followUpsByQuestion, setFollowUpsByQuestion] = useState<Record<number, number>>({});
  const followUpsRef = useRef<Record<number, number>>({});
  const [aiThinking, setAiThinking] = useState(false);

  // ── Qualité réseau (mesurée via TTS + navigator.connection) ──
  const { tier: networkTier, measuredKbps, effectiveType, recordTtsTiming, getForceMaxFollowUps } = useNetworkQuality();
  const [networkPauseActive, setNetworkPauseActive] = useState(false);
  const networkDownTimerRef = useRef<number | null>(null);
  const networkUpTimerRef = useRef<number | null>(null);
  const networkTierRef = useRef<typeof networkTier>("good");
  const networkWarnedRef = useRef(false);
  useEffect(() => {
    networkTierRef.current = networkTier;
  }, [networkTier]);

  // ── Boot progress (avant la 1ère question) ──
  const [bootSteps, setBootSteps] = useState<BootStep[]>([]);
  const [bootPercent, setBootPercent] = useState(0);
  const [bootActive, setBootActive] = useState(false);

  // ── Overlay de chargement entre deux questions ──
  const [questionLoading, setQuestionLoading] = useState<{
    label: string;
    percent: number;
  } | null>(null);

  // Refs avant pour éviter les dépendances circulaires entre callbacks.
  // pauseSource permet de distinguer une pause manuelle (utilisateur), une pause
  // automatique (silence prolongé) ou une pause système (replay forcé).
  type PauseSource = "manual" | "auto-silence" | "auto-network";
  const pauseInterviewRef = useRef<((source?: PauseSource) => void) | null>(null);
  const armEndWarningRef = useRef<(() => void) | null>(null);

  const clearEndCountdown = useCallback(() => {
    if (silenceEndWarningTimerRef.current) {
      clearTimeout(silenceEndWarningTimerRef.current);
      silenceEndWarningTimerRef.current = null;
    }
    if (endCountdownIntervalRef.current) {
      clearInterval(endCountdownIntervalRef.current);
      endCountdownIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setEndCountdown(null);
  }, []);

  const clearSilenceTier = useCallback(() => {
    if (silenceHintTimerRef.current) { clearTimeout(silenceHintTimerRef.current); silenceHintTimerRef.current = null; }
    if (silenceTier3TimerRef.current) { clearTimeout(silenceTier3TimerRef.current); silenceTier3TimerRef.current = null; }
    if (silenceAutoPauseTimerRef.current) { clearTimeout(silenceAutoPauseTimerRef.current); silenceAutoPauseTimerRef.current = null; }
    setSilenceTier(0);
  }, []);

  // (Re)arme le minuteur de silence. À n'appeler que dans la vraie phase d'écoute candidat.
  const resetSilenceTimer = useCallback(() => {
    // Toute activité annule aussi un éventuel cycle d'arrêt en cours.
    clearEndCountdown();
    autoPausedRef.current = false;
    clearSilenceTier();

    silenceHintTimerRef.current = setTimeout(() => setSilenceTier(1), SILENCE_HINT_MS);
    silenceTier3TimerRef.current = setTimeout(() => setSilenceTier(3), SILENCE_TIER3_MS);
    silenceAutoPauseTimerRef.current = setTimeout(() => {
      if (isPausedRef.current || autoEndTriggeredRef.current) return;
      autoPausedRef.current = true;
      setPauseReason("auto-silence");
      // Rafraîchit la liste des micros pour l'écran d'aide.
      listInputDevices()
        .then(({ audio }) => {
          setAudioInputs(audio);
          try {
            const stored = localStorage.getItem(PREFERRED_AUDIO_KEY);
            const active = streamRef.current?.getAudioTracks?.()[0]?.getSettings?.().deviceId;
            setCurrentAudioDeviceId(active || stored || null);
          } catch { /* ignore */ }
        })
        .catch(() => { /* ignore */ });
      logger.warn("interview_silence_pause_shown", {
        sessionId: session?.id ?? null,
        questionIndex: currentQuestionIndex,
      });
      // IMPORTANT : on déclenche pauseInterview AVANT le TTS d'annonce, pour que
      // le snapshot capture la vraie présentation en cours (la question), pas le
      // message « Je vais mettre la session en pause… ».
      pauseInterviewRef.current?.("auto-silence");
      armEndWarningRef.current?.();
      // L'annonce vocale arrive juste après — speak() utilise sa propre instance
      // et ne perturbe pas le snapshot déjà figé par pauseInterview.
      speakRef.current?.("Nous ne captons plus votre voix. Je mets la session en pause — vérifiez votre micro puis cliquez sur Reprendre.").catch(() => {});
    }, SILENCE_AUTOPAUSE_MS);
  }, [toast, clearSilenceTier, clearEndCountdown, session?.id, currentQuestionIndex]);

  // Arme l'avertissement de fin + le compte à rebours d'arrêt forcé,
  // déclenchés depuis l'état de pause automatique.
  const armEndWarning = useCallback(() => {
    if (silenceEndWarningTimerRef.current) clearTimeout(silenceEndWarningTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Délai entre la mise en pause auto et l'avertissement vocal.
    const warningDelay = SILENCE_END_WARNING_MS - SILENCE_AUTOPAUSE_MS;
    silenceEndWarningTimerRef.current = setTimeout(() => {
      if (!autoPausedRef.current || autoEndTriggeredRef.current) return;
      speakRef
        .current?.(
          "Dans 5 secondes, je vais forcer l'arrêt de la session.",
        )
        .catch(() => {});
      // Compte à rebours visible.
      setEndCountdown(END_COUNTDOWN_SECONDS);
      let remaining = END_COUNTDOWN_SECONDS;
      endCountdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (endCountdownIntervalRef.current) {
            clearInterval(endCountdownIntervalRef.current);
            endCountdownIntervalRef.current = null;
          }
          setEndCountdown(0);
        } else {
          setEndCountdown(remaining);
        }
      }, 1000);
    }, warningDelay);

    // Arrêt forcé.
    silenceTimerRef.current = setTimeout(() => {
      if (autoEndTriggeredRef.current || !autoPausedRef.current) return;
      autoEndTriggeredRef.current = true;
      setEndCountdown(null);
      if (endCountdownIntervalRef.current) {
        clearInterval(endCountdownIntervalRef.current);
        endCountdownIntervalRef.current = null;
      }
      toast({
        title: "Session terminée",
        description: "Aucune reprise après 2 minutes de pause.",
      });
      endInterviewRef.current?.();
    }, SILENCE_TIMEOUT_MS - SILENCE_AUTOPAUSE_MS);
  }, [toast]);

  // Synchronise le ref de armEndWarning (utilisé depuis resetSilenceTimer).
  useEffect(() => {
    armEndWarningRef.current = armEndWarning;
  }, [armEndWarning]);

  // Mode « salle d'examen » — listeners actifs uniquement quand la session tourne
  useEffect(() => {
    if (!readyToStart || interviewFinished) return;

    // Avertissement avant fermeture / rechargement de l'onglet
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Filet de sécurité mobile : si l'onglet est masqué (verrouillage écran,
    // app en arrière-plan, fermeture), on tente de :
    //  1) flusher le dernier chunk du MediaRecorder (requestData),
    //  2) déclencher la finalisation côté serveur via sendBeacon
    //     (la requête part même si la page meurt).
    const triggerAbandonFinalize = () => {
      const sessionId = session?.id;
      if (!sessionId) return;
      try {
        const rec = questionRecorderRef.current;
        if (rec && rec.state === "recording") {
          // requestData() force un dernier ondataavailable -> upload du chunk en cours.
          try { rec.requestData(); } catch { /* noop */ }
        }
      } catch { /* noop */ }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-abandoned-session`;
        const payload = JSON.stringify({
          session_id: sessionId,
          last_question_index: currentQuestionIndex,
        });
        // text/plain pour éviter le preflight CORS (sendBeacon envoie credentials).
        const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon?.(url, blob);
      } catch { /* noop */ }
    };

    // On finalise uniquement à la fermeture réelle (pagehide), pas sur
    // visibilitychange : un candidat qui passe en arrière-plan puis revient
    // ne doit pas être marqué abandonné.
    const onPageHide = () => triggerAbandonFinalize();
    window.addEventListener("pagehide", onPageHide);

    // Bloque le retour arrière en re-poussant l'état
    const onPopState = () => {
      try {
        window.history.pushState({ interviewLock: true }, "");
      } catch {}
    };
    window.addEventListener("popstate", onPopState);

    // Suit l'état plein écran pour afficher/cacher le bandeau de rappel
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [readyToStart, interviewFinished, session?.id, currentQuestionIndex]);

  // Ref to endInterview so timers can call it without stale closures
  const endInterviewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup de l'instance Audio principale au démontage
  useEffect(() => {
    return () => {
      const a = primaryAudioRef.current;
      if (a) {
        try { a.pause(); a.removeAttribute("src"); a.load(); } catch {}
      }
      primaryAudioRef.current = null;
    };
  }, []);

  // Play a media URL and return a promise that resolves when it ends
  // Helper : joue une URL via l'instance Audio principale (réutilisée pour
  // préserver le déblocage iOS Safari) et arme un watchdog 2 s qui propose un
  // bouton « Activer le son » si la lecture ne démarre pas.
  const playOnPrimary = useCallback((src: string): Promise<void> => {
    return new Promise((resolve) => {
      const el = primaryAudioRef.current ?? new Audio();
      if (!primaryAudioRef.current) primaryAudioRef.current = el;
      (el as any).playsInline = true;
      el.setAttribute("playsinline", "");
      el.preload = "auto";
      el.src = src;
      try { el.load(); } catch {}
      let done = false;
      let watchdog: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        el.onended = null;
        el.onerror = null;
        el.onplaying = null;
      };
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      el.onended = finish;
      el.onerror = finish;
      el.onplaying = () => {
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        setAudioBlocked(false);
      };
      const tryPlay = () => {
        const p = el.play();
        if (p && typeof p.then === "function") {
          p.catch((err) => {
            console.warn("[interview] audio play() rejected", err);
          });
        }
      };
      tryPlay();
      // Watchdog : si après 2 s rien ne joue, on demande un déblocage manuel.
      watchdog = setTimeout(() => {
        if (done) return;
        if (el.paused || el.currentTime === 0) {
          console.warn("[interview] audio blocked — showing unlock overlay");
          pendingReplayRef.current = () => {
            setAudioBlocked(false);
            tryPlay();
          };
          setAudioBlocked(true);
        }
      }, 2000);
    });
  }, []);

  const playMediaUrl = useCallback(
    (url: string): Promise<void> => playOnPrimary(url),
    [playOnPrimary],
  );

  // Ref to current ElevenLabs audio (for pause/cancel)
  const elevenAudioRef = useRef<HTMLAudioElement | null>(null);

  // Jeton d'annulation pour interrompre une relance IA en cours (utilisé par "Passer la question").
  const turnAbortRef = useRef<{ aborted: boolean } | null>(null);

  // Pré-fetch ElevenLabs sans lecture (utilisé par le warm-up et le pré-chargement
  // entre questions). Retourne le blob audio + une mesure brute des octets/durée.
  const fetchElevenLabsBlob = useCallback(
    async (text: string): Promise<{ blob: Blob; bytes: number; ms: number } | null> => {
      const proj = project;
      if (!proj || proj.tts_provider !== "elevenlabs" || !proj.id) return null;
      // Cache hit : on renvoie un blob avec ms=0/bytes=blob.size pour ne pas
      // polluer la mesure réseau (l'appelant ne nourrit l'EWMA que pour les
      // vraies réponses ; ici on signale 0 ms = pas d'aller-retour).
      const cached = getCachedTtsBlob(text, proj.tts_voice_id ?? null);
      if (cached) return { blob: cached, bytes: cached.size, ms: 0 };
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`;
      const staticSet = new Set<string>(Object.values(STATIC_TRANSITION_PHRASES));
      const maxAttempts = 3;
      const backoffs = [300, 600, 1200];
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const start = performance.now();
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, projectId: proj.id }),
          });
          if (!res.ok) throw new Error(`tts http ${res.status}`);
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) throw new Error("tts json (skip)");
          const blob = await res.blob();
          const ms = performance.now() - start;
          if (!blob || blob.size === 0) throw new Error("tts empty blob");
          if (staticSet.has(text.trim())) {
            setCachedTtsBlob(text, proj.tts_voice_id ?? null, blob);
          }
          if (attempt > 1) {
            console.log(`[interview] fetchElevenLabsBlob succeeded on attempt ${attempt}`);
          }
          return { blob, bytes: blob.size, ms };
        } catch (e) {
          console.warn(`[interview] fetchElevenLabsBlob attempt ${attempt}/${maxAttempts} failed`, e);
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, backoffs[attempt - 1]));
          }
        }
      }
      console.warn("[interview_tts_fallback_browser]", { textPreview: text.slice(0, 60) });
      return null;
    },
    [project],
  );

  // Try ElevenLabs first; resolves true if it played, false if we should fallback.
  // Si `prefetchedBlob` est fourni, on saute l'appel réseau (zéro latence perçue).
  const tryElevenLabs = useCallback(
    async (text: string, prefetchedBlob?: Blob | null): Promise<boolean> => {
      const proj = project;
      if (!proj || proj.tts_provider !== "elevenlabs" || !proj.id) return false;

      try {
        let blob: Blob | null = prefetchedBlob ?? null;
        if (!blob) {
          const fetched = await fetchElevenLabsBlob(text);
          if (!fetched) return false;
          blob = fetched.blob;
          // Mesure réseau : on nourrit l'EWMA.
          recordTtsTiming(fetched.bytes, fetched.ms);
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = primaryAudioRef.current ?? new Audio();
        if (!primaryAudioRef.current) primaryAudioRef.current = audio;
        (audio as any).playsInline = true;
        audio.setAttribute("playsinline", "");
        audio.preload = "auto";
        audio.src = audioUrl;
        try { audio.load(); } catch {}
        elevenAudioRef.current = audio;
        setIsSpeaking(true);

        await new Promise<void>((resolve) => {
          let done = false;
          let watchdog: ReturnType<typeof setTimeout> | null = null;
          const cleanup = () => {
            if (watchdog) { clearTimeout(watchdog); watchdog = null; }
            audio.onended = null;
            audio.onerror = null;
            audio.onplaying = null;
          };
          const finish = () => {
            if (done) return;
            done = true;
            cleanup();
            // Léger délai pour éviter de couper une lecture qui vient juste de finir
            setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
            if (elevenAudioRef.current === audio) elevenAudioRef.current = null;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.onplaying = () => {
            if (watchdog) { clearTimeout(watchdog); watchdog = null; }
            setAudioBlocked(false);
          };
          const tryPlay = () => {
            const p = audio.play();
            if (p && typeof p.then === "function") {
              p.catch((err) => {
                console.warn("[interview] TTS play() rejected", err);
              });
            }
          };
          tryPlay();
          watchdog = setTimeout(() => {
            if (done) return;
            if (audio.paused || audio.currentTime === 0) {
              console.warn("[interview] TTS audio blocked — showing unlock overlay");
              pendingReplayRef.current = () => {
                setAudioBlocked(false);
                tryPlay();
              };
              setAudioBlocked(true);
            }
          }, 2000);
        });

        setIsSpeaking(false);
        return true;
      } catch (e) {
        logger.error("interview_tts_failed", {
          sessionId: session?.id ?? null,
          voiceId: project?.tts_voice_id ?? null,
          error: e instanceof Error ? e.message : String(e),
        });
        elevenAudioRef.current = null;
        setIsSpeaking(false);
        return false;
      }
    },
    [project, fetchElevenLabsBlob, recordTtsTiming, session?.id],
  );

  // TTS: speak text aloud — tries ElevenLabs first if enabled, falls back to browser
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise(async (resolve) => {
        if (!ttsEnabled || !text?.trim()) {
          console.log("[interview] TTS skipped (disabled/empty)");
          resolve();
          return;
        }

        // Track for pause/resume replay
        currentPresentationRef.current = { kind: "tts", text };

        // Try ElevenLabs first
        const usedEleven = await tryElevenLabs(text);
        if (usedEleven) {
          if (currentPresentationRef.current?.kind === "tts") {
            currentPresentationRef.current = null;
          }
          resolve();
          return;
        }

        // Fallback: browser TTS
        if (!window.speechSynthesis) {
          console.log("[interview] no speechSynthesis available");
          resolve();
          return;
        }

        let settled = false;
        // Backup button visible after 4s of TTS (in case it's stuck)
        const manualBackupTimer = setTimeout(() => {
          if (!settled && !isPausedRef.current) {
            console.warn("[interview] TTS slow — showing manual continue button");
            setShowManualContinue(true);
          }
        }, 4000);
        const safeResolve = (reason: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(manualBackupTimer);
          console.log("[interview] TTS done:", reason);
          setIsSpeaking(false);
          if (currentPresentationRef.current?.kind === "tts") {
            currentPresentationRef.current = null;
          }
          resolve();
        };

        try {
          window.speechSynthesis.cancel();
        } catch {}

        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
          console.warn("[interview] TTS: no voices available, skipping");
          setTimeout(() => safeResolve("no_voices"), 300);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 0.95;
        

        const gender: "female" | "male" =
          (project as { tts_voice_gender?: string } | null)?.tts_voice_gender === "male"
            ? "male"
            : "female";
        const frVoices = voices.filter((v) => v.lang.startsWith("fr"));
        const femaleRe = /amelie|amélie|audrey|marie|céline|celine|léa|lea|sophie|virginie|aurélie|aurelie|julie|chantal|female|femme/i;
        const maleRe = /thomas|nicolas|daniel|paul|antoine|henri|sébastien|sebastien|male|homme/i;
        const matchByGender = frVoices.find((v) =>
          gender === "female" ? femaleRe.test(v.name) : maleRe.test(v.name),
        );
        const excludeOpposite = frVoices.find((v) =>
          gender === "female" ? !maleRe.test(v.name) : !femaleRe.test(v.name),
        );
        const chosenVoice = matchByGender || excludeOpposite || frVoices[0];
        if (chosenVoice) utterance.voice = chosenVoice;
        utterance.pitch = gender === "male" ? 0.95 : 1.1;

        // ~12 caractères/seconde en français + 5 s de marge, plafonné à 90 s.
        // Évite de couper la lecture des questions longues.
        const safetyMs = Math.min(90000, Math.ceil(text.length / 12) * 1000 + 5000);
        const safetyTimer = setTimeout(() => {
          console.warn("[interview] TTS safety timer fired after", safetyMs, "ms");
          try { window.speechSynthesis.cancel(); } catch {}
          safeResolve("safety_timer");
        }, safetyMs);

        utterance.onstart = () => {
          console.log("[interview] TTS onstart");
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          clearTimeout(safetyTimer);
          safeResolve("onend");
        };
        utterance.onerror = (e) => {
          clearTimeout(safetyTimer);
          console.warn("[interview] TTS onerror:", (e as any)?.error);
          safeResolve("onerror");
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("[interview] TTS speak() threw:", e);
          clearTimeout(safetyTimer);
          safeResolve("speak_throw");
        }
      });
    },
    [ttsEnabled, tryElevenLabs],
  );

  // Keep speakRef in sync so silence-tier callbacks can play local nudges
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // Play question media (audio_url or video_url) if available, otherwise use TTS
  const speakOrPlayQuestion = useCallback(
    async (text: string, question?: any) => {
      if (question?.video_url) {
        setIsSpeaking(true);
        await playMediaUrl(question.video_url);
        setIsSpeaking(false);
      } else if (question?.audio_url) {
        setIsSpeaking(true);
        await playMediaUrl(question.audio_url);
        setIsSpeaking(false);
      } else {
        await speak(text);
      }
    },
    [playMediaUrl, speak],
  );

  // STT: start listening
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Erreur",
        description: "La reconnaissance vocale n'est pas supportée par ce navigateur.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    candidateTranscriptRef.current = "";
    setLiveTranscript("");

    recognition.onresult = (event: any) => {
      // IMPORTANT : ne traiter que les NOUVEAUX résultats (event.resultIndex).
      // Sinon, en mode continu avec auto-restart, on ré-ajoute à chaque
      // événement tous les résultats finaux passés → duplication massive
      // de la transcription (croissance quadratique).
      let interim = "";
      let final = "";
      const startIdx = typeof event.resultIndex === "number" ? event.resultIndex : 0;
      for (let i = startIdx; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      if (final) {
        candidateTranscriptRef.current += final;
      }
      setLiveTranscript(candidateTranscriptRef.current + interim);
      // Watchdog : on a reçu de l'audio reconnu → la STT est vivante.
      lastSttResultAtRef.current = Date.now();
    };

    recognition.onerror = (event: any) => {
      console.warn("[interview] STT onerror:", event.error);
      // "no-speech" is benign on Chrome — let onend auto-restart, don't tear down
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      logger.error("interview_stt_failed", {
        sessionId: session?.id ?? null,
        errorCode: event?.error ?? "unknown",
      });
      // Other errors: stop listening
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("[interview] STT onend (isListeningRef:", isListeningRef.current, ", paused:", isPausedRef.current, ")");
      // Auto-restart if we should still be listening (use ref, not stale state)
      if (isListeningRef.current && !isPausedRef.current) {
        try {
          recognitionRef.current?.start();
          console.log("[interview] STT auto-restarted");
        } catch (e) {
          console.warn("[interview] STT restart failed — recreating instance:", e);
          // Fallback : l'instance est probablement morte, on en recrée une neuve.
          isListeningRef.current = false;
          if (recognitionRef.current) {
            try { recognitionRef.current.onend = null; } catch {}
            recognitionRef.current = null;
          }
          setTimeout(() => {
            if (!isPausedRef.current) startListeningRef.current?.();
          }, 200);
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("[interview] STT start() threw:", e);
      logger.error("interview_stt_start_failed", {
        sessionId: session?.id ?? null,
        error: e instanceof Error ? e.message : String(e),
      });
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }
    isListeningRef.current = true;
    setIsListening(true);

    // Watchdog de vivacité STT : si aucun onresult depuis 10s pendant
    // l'écoute active, on force un redémarrage complet de la recognition.
    if (sttWatchdogRef.current) clearInterval(sttWatchdogRef.current);
    lastSttResultAtRef.current = Date.now();
    lastMicRmsAtRef.current = Date.now();
    // (Ré)initialisation de l'analyser RMS partagé pour détecter le vrai silence.
    try {
      if (!micAnalyserRef.current && streamRef.current) {
        const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        const ctx = new Ctor();
        if (ctx.state === "suspended") { ctx.resume().catch(() => { /* ignore */ }); }
        const source = ctx.createMediaStreamSource(streamRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const buf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        micAnalyserRef.current = { ctx, analyser, buffer: buf };
      }
    } catch { /* analyser facultatif */ }
    sttWatchdogRef.current = setInterval(() => {
      if (!isListeningRef.current || isPausedRef.current) return;
      // Mesure RMS instantanée si l'analyser est disponible.
      const m = micAnalyserRef.current;
      if (m) {
        try {
          m.analyser.getByteTimeDomainData(m.buffer as Uint8Array<ArrayBuffer>);
          let sum = 0;
          for (let i = 0; i < m.buffer.length; i++) {
            const v = (m.buffer[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / m.buffer.length);
          if (rms > MIC_THRESHOLDS.WARMUP_SILENCE_MAX) lastMicRmsAtRef.current = Date.now();
        } catch { /* ignore */ }
      }
      const sttIdle = Date.now() - lastSttResultAtRef.current;
      const rmsIdle = Date.now() - lastMicRmsAtRef.current;
      // Si STT muet ET signal micro plat depuis >10s ET aucun TTS en cours,
      // on prévient le candidat. Le bandeau disparaît dès que ça revient.
      if (sttIdle > 10000 && rmsIdle > 10000 && !isSpeaking) {
        if (!noMicSignal) setNoMicSignal(true);
      } else if (noMicSignal && rmsIdle < 2000) {
        setNoMicSignal(false);
      }
      if (sttIdle > 10000 && !candidateTranscriptRef.current.trim()) {
        console.warn("[interview] STT watchdog : silence > 10s, redémarrage de la reconnaissance.");
        lastSttResultAtRef.current = Date.now();
        try { recognitionRef.current?.stop(); } catch {}
      }
    }, 2000);
  }, [toast, isSpeaking, noMicSignal]);

  // STT: stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (sttWatchdogRef.current) {
      clearInterval(sttWatchdogRef.current);
      sttWatchdogRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Pause: freeze STT, TTS, recorder, all timers — snapshot elapsed time
  // Pause: freeze STT, TTS, recorder, all timers — snapshot elapsed time
  // `source` permet de tracer l'origine (clic utilisateur vs silence prolongé).
  const pauseInterview = useCallback((source: PauseSource = "manual") => {
    setPauseReason(source);
    isPausedRef.current = true;
    // "Pendant la question" = il y a une présentation en cours (TTS ou média)
    const duringQuestion = currentPresentationRef.current !== null;
    pausedDuringQuestionRef.current = duringQuestion;
    // Snapshot the presentation NOW — TTS cancellation below would otherwise
    // wipe currentPresentationRef before resume reads it.
    pausedReplayRef.current = currentPresentationRef.current;
    console.log("[interview] PAUSE", { source, duringQuestion, snapshot: pausedReplayRef.current });

    // Stop the question media player cleanly (resets currentTime + finished state)
    if (duringQuestion) {
      try { featuredPlayerRef.current?.stop(); } catch {}
    }
    // STT
    stopListening();
    // TTS (browser + ElevenLabs)
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (elevenAudioRef.current) {
      try { elevenAudioRef.current.pause(); } catch {}
      elevenAudioRef.current = null;
    }
    setIsSpeaking(false);
    // Recorder
    if (questionRecorderRef.current && questionRecorderRef.current.state === "recording") {
      try { questionRecorderRef.current.pause(); } catch {}
    }
    if (questionAudioRecorderRef.current && questionAudioRecorderRef.current.state === "recording") {
      try { questionAudioRecorderRef.current.pause(); } catch {}
    }
    // Snapshot elapsed time for max-duration timer
    if (interviewStartTimeRef.current !== null) {
      pausedElapsedRef.current = Date.now() - interviewStartTimeRef.current;
    }
    // Clear all timers — including watchdog so it doesn't fire during pause
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
    if (autoSkipTimerRef.current) { clearTimeout(autoSkipTimerRef.current); autoSkipTimerRef.current = null; }
    if (autoSkipCountdownRef.current) { clearInterval(autoSkipCountdownRef.current); autoSkipCountdownRef.current = null; }
    if (playbackWatchdogRef.current) { clearTimeout(playbackWatchdogRef.current); playbackWatchdogRef.current = null; }
    if (manualContinueTimerRef.current) { clearTimeout(manualContinueTimerRef.current); manualContinueTimerRef.current = null; }
    setShowManualContinue(false);
    setShouldAutoPlay(false);
    setAutoSkipCountdown(null);
    setIsPaused(true);
  }, [stopListening]);

  // Synchronise le ref de pauseInterview (utilisé depuis resetSilenceTimer pour
  // déclencher la mise en pause automatique sans dépendance circulaire).
  useEffect(() => {
    pauseInterviewRef.current = pauseInterview;
  }, [pauseInterview]);

  // Resume: replay the question (TTS or media) from the start, or resume listening
  const resumeInterview = useCallback(async () => {
    // Annule un éventuel cycle d'arrêt si la reprise vient pendant la pause auto.
    clearEndCountdown();
    autoPausedRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    const wasDuringQuestion = pausedDuringQuestionRef.current;
    // Use the snapshot taken at pause-time (currentPresentationRef may be stale or null)
    const presentation = pausedReplayRef.current;
    pausedDuringQuestionRef.current = false;
    pausedReplayRef.current = null;
    console.log("[interview] RESUME — wasDuringQuestion:", wasDuringQuestion, "snapshot:", presentation);

    // Restart max-duration timer with remaining time (always)
    const remaining = Math.max(0, MAX_DURATION_MS - pausedElapsedRef.current);
    interviewStartTimeRef.current = Date.now() - pausedElapsedRef.current;
    maxDurationTimerRef.current = setTimeout(() => {
      if (!autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        toast({ title: "Session terminé", description: "La durée maximale a été atteinte." });
        endInterviewRef.current?.();
      }
    }, remaining);

    // Helper local : garantit que le recorder tourne. Le ré-instancie si null
    // ou si MediaRecorder est dans un état terminal (inactive).
    const ensureRecorder = () => {
      const rec = questionRecorderRef.current;
      if (!rec || rec.state === "inactive") {
        console.log("[interview] RESUME — recorder absent/inactif, redémarrage");
        startQuestionRecording();
      } else if (rec.state === "paused") {
        try { rec.resume(); } catch (e) { console.warn("recorder.resume failed", e); }
        const arec = questionAudioRecorderRef.current;
        if (arec && arec.state === "paused") {
          try { arec.resume(); } catch (e) { console.warn("audio recorder.resume failed", e); }
        }
      }
    };

    if (wasDuringQuestion && presentation?.kind === "tts") {
      // Replay TTS from the start, then continue the natural flow
      console.log("[interview] Resume: replaying TTS from start");
      await speak(presentation.text);
      if (isPausedRef.current) return; // user re-paused mid-TTS
      // speak() already cleared currentPresentationRef on natural end; ensure clean state
      currentPresentationRef.current = null;
      // Was this a written question (no media to follow)? Start listening now.
      const q = questions[currentQuestionIndex];
      const hasMedia = !!(q?.audio_url || q?.video_url);
      if (!hasMedia) {
        ensureRecorder();
        startListening();
        resetSilenceTimer();
      } else {
        // After greeting/transition TTS, the media should auto-play
        setIsSpeaking(true);
        setShouldAutoPlay(false);
        markMediaPresentation(currentQuestionIndex);
        setTimeout(() => {
          setShouldAutoPlay(true);
          armPlaybackWatchdog();
        }, 30);
      }
      return;
    }

    if (wasDuringQuestion && presentation?.kind === "media") {
      // Replay media from start — synchronous call preserves user gesture (mobile autoplay)
      console.log("[interview] Resume: replaying media from start");
      // Re-mark presentation so a re-pause during the replay still tracks correctly
      markMediaPresentation(currentQuestionIndex);
      setShouldAutoPlay(true);
      setIsSpeaking(true);
      try { featuredPlayerRef.current?.restart(); } catch (e) { console.warn("restart failed", e); }
      armPlaybackWatchdog();
      return;
    }

    // Listening phase — resume recorder + STT
    // Garantit que le bouton « Enregistrer ma réponse » réapparaît même si le
    // recorder s'est terminé pendant la pause (état "inactive" ou null).
    ensureRecorder();
    startListening();
    resetSilenceTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, startListening, resetSilenceTimer, toast, questions, currentQuestionIndex]);

  // Load session data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: sessions } = await supabase.from("sessions").select("*").eq("token", token).limit(1);
      const sess = sessions?.[0];
      if (!sess) {
        navigate(`/session/${slug}`);
        return;
      }

      setSession(sess);
      const { data: proj } = await supabase.from("projects").select("*").eq("id", sess.project_id).single();
      setProject(proj);
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("project_id", sess.project_id)
        .is("archived_at", null)
        .order("order_index");
      const activeQuestions = qs ?? [];
      setQuestions(activeQuestions);

      // Détection d'une reprise possible : session déjà démarrée + au moins un message
      if (sess.status === "in_progress") {
        const { data: msgs } = await supabase
          .from("session_messages")
          .select("question_id")
          .eq("session_id", sess.id)
          .not("question_id", "is", null);
        const answeredIds = new Set((msgs ?? []).map((m) => m.question_id).filter(Boolean));
        if ((msgs?.length ?? 0) > 0) {
          // Recalcule l'index sur la liste actuelle des questions actives
          // (au cas où le RH a supprimé/réordonné des questions entre-temps).
          const firstUnansweredIdx = activeQuestions.findIndex((q) => !answeredIds.has(q.id));
          const storedIdx = Math.max(0, Number(sess.last_question_index) || 0);
          const safeIdx =
            firstUnansweredIdx >= 0
              ? firstUnansweredIdx
              : Math.min(storedIdx, Math.max(0, activeQuestions.length - 1));
          setResumePrompt({ resumeIndex: safeIdx });
        }
      }

      setLoading(false);
    };
    load();
  }, [token, slug, navigate]);

  // Restaure les messages depuis session_messages et redémarre la session à la bonne question
  const handleResumeInterview = useCallback(async () => {
    if (!resumePrompt || !session?.id) return;
    setRestoringMessages(true);
    try {
      const { data: rows } = await supabase
        .from("session_messages")
        .select("*")
        .eq("session_id", session.id)
        .order("timestamp", { ascending: true });
      const restored: ChatMessage[] = (rows ?? []).map((r: any) => ({
        role: r.role,
        content: r.content,
      }));
      setMessages(restored);
      messagesRef.current = restored;
      setAiMessages(
        (rows ?? []).map((r: any) => ({
          role: r.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: r.content,
        })),
      );
      setCurrentQuestionIndex(resumePrompt.resumeIndex);
    } finally {
      setRestoringMessages(false);
      setResumePrompt(null);
    }
  }, [resumePrompt, session?.id]);

  // Recommence la session depuis zéro : purge messages BDD + fichiers media uploadés
  const handleRestartInterview = useCallback(async () => {
    if (!session?.id) return;
    setRestoringMessages(true);
    try {
      // 1. Purge des fichiers media uploadés sous interviews/{sessionId}/
      try {
        const { data: files } = await supabase.storage
          .from("media")
          .list(`interviews/${session.id}`, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `interviews/${session.id}/${f.name}`);
          await supabase.storage.from("media").remove(paths);
        }
      } catch (e) {
        console.warn("Échec purge media lors du restart:", e);
      }

      // 2. Purge BDD
      await supabase.from("session_messages").delete().eq("session_id", session.id);
      await supabase
        .from("sessions")
        .update({ last_question_index: 0, started_at: null, status: "pending" as any })
        .eq("id", session.id);
    } finally {
      setRestoringMessages(false);
      setResumePrompt(null);
    }
  }, [session?.id]);

  // Start camera stream (no global recorder — only per-question recorders)
  const startVideoStream = useCallback(async () => {
    try {
      // Réutilise un flux déjà actif si présent (cas reprise de session).
      const existing = streamRef.current;
      const live = existing?.getTracks().some((t) => t.readyState === "live");
      if (!existing || !live) {
        // Récupère les périphériques préférés choisis sur l'écran de test technique
        let preferredAudio: string | null = null;
        let preferredVideo: string | null = null;
        try {
          preferredAudio = localStorage.getItem("interview.preferredAudioDeviceId");
          preferredVideo = localStorage.getItem("interview.preferredVideoDeviceId");
        } catch { /* ignore */ }
        // Contraintes vidéo : 640x480 @ 24 fps suffisent largement pour l'analyse
        // non-verbale et limitent le poids des segments envoyés à l'IA.
        const videoBase: MediaTrackConstraints = {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        };
        const constraints: MediaStreamConstraints = {
          video: preferredVideo
            ? { ...videoBase, deviceId: { exact: preferredVideo } }
            : videoBase,
          audio: preferredAudio ? { deviceId: { exact: preferredAudio } } : true,
        };
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Fallback : si le device préféré n'est plus disponible, on retombe sur le défaut système
          stream = await navigator.mediaDevices.getUserMedia({ video: videoBase, audio: true });
        }
        streamRef.current = stream;
      }
      reattachAllSelfViews();
    } catch (err) {
      logger.error("interview_media_access_failed", {
        sessionId: session?.id ?? null,
        mode: "video",
        error: err instanceof Error ? err.message : String(err),
      });
      toast({
        title: "Caméra inaccessible",
        description: "Veuillez autoriser l'accès à la caméra.",
        variant: "destructive",
      });
    }
  }, [toast, reattachAllSelfViews, session?.id]);

  // Change le micro à chaud (utilisé depuis l'écran d'aide « auto-silence »).
  // On stoppe les tracks audio actuels et on rebranche un nouveau MediaStream
  // qui combine la vidéo existante + l'audio du nouveau périphérique.
  const switchAudioDevice = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    setSwitchingDevice(true);
    try {
      setStoredDeviceId("audio", deviceId);
      const newAudio = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const existing = streamRef.current;
      // Stop des anciennes pistes audio uniquement (on garde la vidéo).
      existing?.getAudioTracks().forEach((t) => {
        try { existing.removeTrack(t); } catch { /* ignore */ }
        try { t.stop(); } catch { /* ignore */ }
      });
      newAudio.getAudioTracks().forEach((t) => {
        try { existing?.addTrack(t); } catch { /* ignore */ }
      });
      setCurrentAudioDeviceId(deviceId);
      toast({ title: "Micro changé", description: "Cliquez sur Reprendre pour continuer." });
    } catch (err) {
      logger.warn("interview_switch_audio_device_failed", {
        sessionId: session?.id ?? null,
        deviceId,
        error: err instanceof Error ? err.message : String(err),
      });
      toast({
        title: "Changement impossible",
        description: "Impossible d'utiliser ce micro. Essayez-en un autre.",
        variant: "destructive",
      });
    } finally {
      setSwitchingDevice(false);
    }
  }, [toast, session?.id]);


  // Start a per-question video recorder (uses same stream)
  // Upload d'un chunk individuel vers Storage, en arrière-plan, avec retry court.
  const uploadChunk = useCallback(
    async (sessionId: string, questionIndex: number, chunkIdx: number, blob: Blob) => {
      const path = `interviews/${sessionId}/q${questionIndex}/chunk-${String(chunkIdx).padStart(5, "0")}.webm`;
      const backoffs = [500, 1500, 4000];
      for (let attempt = 0; attempt < backoffs.length; attempt++) {
        try {
          const { error } = await supabase.storage
            .from("media")
            .upload(path, blob, { contentType: chunkMimeRef.current, upsert: true });
          if (!error) {
            uploadedChunkPathsRef.current.push(path);
            return path;
          }
        } catch {
          /* retry */
        }
        if (attempt < backoffs.length - 1) {
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
        }
      }
      logger.error("interview_chunk_upload_failed", { sessionId, questionIndex, chunkIdx });
      return null;
    },
    [],
  );

  // Démarre l'enregistrement d'une question en streamant les chunks vers Storage à la volée.
  const getSupportedMimeType = useCallback(() => {
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  }, []);

  const getSupportedAudioMimeType = useCallback(() => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  }, []);

  const startQuestionRecording = useCallback(() => {
    if (!streamRef.current) return;
    questionVideoChunksRef.current = [];
    questionAudioChunksRef.current = [];
    chunkIndexRef.current = 0;
    uploadedChunkPathsRef.current = [];
    try {
      const mimeType = getSupportedMimeType();
      chunkMimeRef.current = mimeType ?? "video/webm";
      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 500_000,
        audioBitsPerSecond: 64_000,
      };
      const recorder = new MediaRecorder(streamRef.current, options);
      questionRecorderRef.current = recorder;
      const sessionId = session?.id ?? null;
      const questionIndex = currentQuestionIndex;

      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        // Garde aussi en mémoire pour le blob final (fallback robuste pour la lecture).
        questionVideoChunksRef.current.push(e.data);
        if (!sessionId) return;
        const idx = chunkIndexRef.current++;
        setPendingChunkUploads((n) => n + 1);
        trackBackground(
          uploadChunk(sessionId, questionIndex, idx, e.data).finally(() => {
            setPendingChunkUploads((n) => Math.max(0, n - 1));
          }),
        );
      };
      recorder.start(1000); // un chunk par seconde, suffisant pour l'upload incrémental

      // Recorder audio séparé (Opus mono ~24 kbps) — utilisé par l'IA pour la transcription.
      // Permet des réponses bien plus longues (~10 min ≈ 2 Mo) sans dépasser la limite Gateway.
      try {
        const audioTracks = streamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          const audioMime = getSupportedAudioMimeType();
          audioMimeRef.current = audioMime ?? "audio/webm";
          let audioRecorder: MediaRecorder | null = null;
          try {
            const audioOptions: MediaRecorderOptions = {
              ...(audioMime ? { mimeType: audioMime } : {}),
              audioBitsPerSecond: 24_000,
            };
            audioRecorder = new MediaRecorder(audioStream, audioOptions);
          } catch (initErr) {
            console.warn("[interview] audio recorder init failed, retry with defaults", initErr);
            logger.error("interview_audio_recorder_failed", {
              sessionId: session?.id ?? null,
              phase: "init",
              error: initErr instanceof Error ? initErr.message : String(initErr),
            });
            // Retry sans options spécifiques (compatibilité large).
            audioRecorder = new MediaRecorder(audioStream);
          }
          questionAudioRecorderRef.current = audioRecorder;
          audioRecorder.ondataavailable = (e) => {
            if (e.data.size === 0) return;
            questionAudioChunksRef.current.push(e.data);
          };
          audioRecorder.start(1000);
        }
      } catch (e) {
        // Non-bloquant : si l'audio recorder échoue, on retombe sur la vidéo pour la transcription.
        console.warn("[interview] audio recorder failed to start", e);
        logger.error("interview_audio_recorder_failed", {
          sessionId: session?.id ?? null,
          phase: "start",
          error: e instanceof Error ? e.message : String(e),
        });
        questionAudioRecorderRef.current = null;
      }

      setIsRecordingActive(true);
    } catch (e) {
      logger.error("interview_recorder_failed", {
        sessionId: session?.id ?? null,
        phase: "start",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [getSupportedMimeType, getSupportedAudioMimeType, session?.id, trackBackground, uploadChunk, currentQuestionIndex]);

  // Arrête le recorder, finalise l'upload du blob assemblé + écrit le manifest des chunks.
  const stopAndUploadQuestionVideo = useCallback(
    async (
      sessionId: string,
      questionIndex: number,
    ): Promise<{ videoUrl: string | null; audioUrl: string | null; thumbnailUrl: string | null }> => {
      const recorder = questionRecorderRef.current;
      const audioRecorder = questionAudioRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecordingActive(false);
        return { videoUrl: null, audioUrl: null, thumbnailUrl: null };
      }

      // Arrêt simultané vidéo + audio.
      const stops: Promise<void>[] = [
        new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        }),
      ];
      if (audioRecorder && audioRecorder.state !== "inactive") {
        stops.push(
          new Promise<void>((resolve) => {
            audioRecorder.onstop = () => resolve();
            try { audioRecorder.stop(); } catch { resolve(); }
          }),
        );
      }
      await Promise.all(stops);
      questionRecorderRef.current = null;
      questionAudioRecorderRef.current = null;
      setIsRecordingActive(false);

      if (questionVideoChunksRef.current.length === 0) {
        questionAudioChunksRef.current = [];
        return { videoUrl: null, audioUrl: null, thumbnailUrl: null };
      }

      const blob = new Blob(questionVideoChunksRef.current, { type: "video/webm" });
      const audioChunks = [...questionAudioChunksRef.current];
      const audioMime = audioMimeRef.current;
      const chunkPaths = [...uploadedChunkPathsRef.current];
      questionVideoChunksRef.current = [];
      questionAudioChunksRef.current = [];
      uploadedChunkPathsRef.current = [];
      const fileName = `interviews/${sessionId}/q${questionIndex}.webm`;
      const audioFileName = `interviews/${sessionId}/q${questionIndex}.audio.webm`;

      // Manifest des chunks pour fallback de lecture (en arrière-plan, non bloquant).
      if (chunkPaths.length > 0) {
        const manifest = {
          sessionId,
          questionIndex,
          mimeType: chunkMimeRef.current,
          chunks: chunkPaths,
          createdAt: new Date().toISOString(),
        };
        const manifestPath = `interviews/${sessionId}/q${questionIndex}/manifest.json`;
        trackBackground(
          supabase.storage
            .from("media")
            .upload(manifestPath, new Blob([JSON.stringify(manifest)], { type: "application/json" }), {
              contentType: "application/json",
              upsert: true,
            })
            .then(() => {})
            .catch(() => {}),
        );
      }

      // Upload audio en parallèle (non bloquant pour la vidéo).
      const audioUploadPromise: Promise<string | null> = (async () => {
        if (audioChunks.length === 0) return null;
        const audioBlob = new Blob(audioChunks, { type: audioMime });
        const backoffs = [500, 1500, 4000];
        for (let attempt = 0; attempt < backoffs.length; attempt++) {
          try {
            const { error } = await supabase.storage
              .from("media")
              .upload(audioFileName, audioBlob, { contentType: audioMime, upsert: true });
            if (!error) {
              const { data } = supabase.storage.from("media").getPublicUrl(audioFileName);
              return data.publicUrl;
            }
          } catch { /* retry */ }
          if (attempt < backoffs.length - 1) {
            await new Promise((r) => setTimeout(r, backoffs[attempt]));
          }
        }
        logger.error("interview_upload_failed", { sessionId, questionIndex, segmentType: "audio" });
        return null;
      })();

      let thumbnailUrl: string | null = null;
      let thumbnailBlob: Blob | null = null;
      // 1) Tentative live depuis la MediaStream (caméra réchauffée, candidat cadré)
      if (!thumbnailCapturedRef.current && streamRef.current) {
        thumbnailBlob = await captureStreamSnapshot(streamRef.current);
        if (thumbnailBlob) thumbnailCapturedRef.current = true;
      }
      // 2) Fallback : extraction depuis la vidéo enregistrée
      if (!thumbnailBlob) {
        thumbnailBlob = await extractVideoThumbnail(blob);
      }
      if (thumbnailBlob) {
        const thumbnailPath = `interviews/${sessionId}/thumbnail.jpg`;
        try {
          const { error: thumbError } = await supabase.storage
            .from("media")
            .upload(thumbnailPath, thumbnailBlob, { contentType: "image/jpeg", upsert: true });
          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage.from("media").getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        } catch (error) {
          console.warn("[thumbnail] upload impossible", error);
        }
      }

      // Retry avec attente progressive (1 s, 3 s, 8 s) pour absorber les coupures réseau.
      const backoffs = [1000, 3000, 8000];
      let videoUrl: string | null = null;
      for (let attempt = 0; attempt < backoffs.length; attempt++) {
        try {
          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(fileName, blob, { contentType: "video/webm", upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
            videoUrl = urlData.publicUrl;
            break;
          }
          console.warn(
            `Échec upload vidéo question ${questionIndex} (essai ${attempt + 1}/${backoffs.length}):`,
            uploadError,
          );
        } catch (e) {
          console.warn(
            `Exception upload vidéo question ${questionIndex} (essai ${attempt + 1}/${backoffs.length}):`,
            e,
          );
        }
        if (attempt < backoffs.length - 1) {
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
        }
      }
      if (!videoUrl) {
        logger.error("interview_upload_failed", {
          sessionId,
          questionIndex,
          segmentType: "video",
        });
      }
      const audioUrl = await audioUploadPromise;
      return { videoUrl, audioUrl, thumbnailUrl };
    },
    [trackBackground],
  );

  // Watchdog helpers — guarantee transition to listening even if onPlaybackEnd never fires
  const clearPlaybackWatchdog = useCallback(() => {
    if (playbackWatchdogRef.current) {
      clearTimeout(playbackWatchdogRef.current);
      playbackWatchdogRef.current = null;
    }
    if (manualContinueTimerRef.current) {
      clearTimeout(manualContinueTimerRef.current);
      manualContinueTimerRef.current = null;
    }
    setShowManualContinue(false);
  }, []);

  const forceStartListening = useCallback(() => {
    if (isPausedRef.current) {
      console.log("[InterviewStart] forceStartListening blocked — interview is paused");
      return;
    }
    console.log("[interview] Forcing transition to listening");
    clearPlaybackWatchdog();
    currentPresentationRef.current = null; // presentation finished
    setShouldAutoPlay(false);
    setIsSpeaking(false);
    startQuestionRecording();
    startListening();
  }, [clearPlaybackWatchdog, startQuestionRecording, startListening]);

  // Mark current question as a media presentation (for pause/resume replay)
  const markMediaPresentation = useCallback((qIndex: number) => {
    const q = questions[qIndex];
    if (q?.video_url) currentPresentationRef.current = { kind: "media", mediaType: "video" };
    else if (q?.audio_url) currentPresentationRef.current = { kind: "media", mediaType: "audio" };
    else {
      // Cas limite : aucune média mais on a quand même appelé markMediaPresentation.
      // On loggue pour identifier les flux qui sortent du cadre attendu.
      console.warn("[interview] markMediaPresentation : question sans média", { qIndex, qId: q?.id });
    }
  }, [questions]);

  const armPlaybackWatchdog = useCallback((blockId?: number) => {
    clearPlaybackWatchdog();
    const myBlock = blockId ?? currentBlockIdRef.current;
    console.log("[interview] watchdog armed (manual btn @5s, hard fallback @25s) block=", myBlock);
    // After 5s of "Préparation", offer a manual button as backup
    manualContinueTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) setShowManualContinue(true);
    }, 5000);
    // Hard fallback after 25s if onPlaybackEnd never fires
    playbackWatchdogRef.current = setTimeout(() => {
      if (isPausedRef.current) return;
      // Bloc obsolète : on ne touche à rien.
      if (myBlock !== currentBlockIdRef.current) {
        console.log("[interview] watchdog ignored — stale block", myBlock, "current=", currentBlockIdRef.current);
        return;
      }
      console.warn("[interview] Playback watchdog triggered after 25s — forcing listening");
      forceStartListening();
    }, 25000);
  }, [clearPlaybackWatchdog, forceStartListening]);

  // cancelAll : coupe TOUTES les sources sonores/écoute du tour précédent
  // avant de démarrer un nouveau bloc. Empêche les superpositions.
  const cancelAll = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    if (elevenAudioRef.current) {
      try { elevenAudioRef.current.pause(); } catch {}
      elevenAudioRef.current = null;
    }
    try { featuredPlayerRef.current?.stop(); } catch {}
    setShouldAutoPlay(false);
    clearPlaybackWatchdog();
    setIsSpeaking(false);
  }, [clearPlaybackWatchdog]);

  // Called when user clicks "Démarrer" — runs in user gesture context (needed for mobile TTS)
  const beginInterview = async () => {
    if (!session || !project || questions.length === 0) {
      logger.error("interview_begin_blocked", {
        hasSession: !!session,
        hasProject: !!project,
        questionsCount: questions.length,
        token,
        slug,
      });
      toast({
        title: "Session non prête",
        description: "Impossible de démarrer pour le moment. Rechargez la page.",
        variant: "destructive",
      });
      return;
    }

    // Traçabilité légale du consentement (best-effort, non bloquant)
    if (token && !session.consent_accepted_at) {
      supabase
        .from("sessions")
        .update({ consent_accepted_at: new Date().toISOString() })
        .eq("token", token)
        .then(() => {});
    }

    // ── PHASE 0 : déblocage audio mobile (doit s'exécuter dans le geste utilisateur) ──
    if (window.speechSynthesis) {
      try {
        const warmup = new SpeechSynthesisUtterance("");
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      } catch {}
    }
    try {
      // Crée (ou réutilise) l'instance Audio principale ET la débloque dans la
      // pile synchrone de ce tap utilisateur. Cette même instance sera ensuite
      // réutilisée pour tous les TTS et lectures audio de la session — clé
      // pour iOS Safari qui n'accorde pas l'autoplay aux nouvelles instances.
      const audio = primaryAudioRef.current ?? new Audio();
      primaryAudioRef.current = audio;
      (audio as any).playsInline = true;
      audio.setAttribute("playsinline", "");
      audio.preload = "auto";
      audio.src = SILENT_AUDIO_DATA_URI;
      try { audio.load(); } catch {}
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          try { audio.pause(); audio.currentTime = 0; } catch {}
        }).catch(() => {});
      }
    } catch {}

    setReadyToStart(true);

    // Active immédiatement l'overlay de préparation pour masquer l'UI d'entretien
    // (sinon la Q1 « flashe » pendant ~1,5 s à cause des awaits qui suivent —
    // fullscreen, getUserMedia, mesure micro). Les étapes seront mises à jour
    // plus bas avec le label précis de la 1ʳᵉ question.
    {
      const q0Early = questions[0];
      const earlyMediaType: "written" | "audio" | "video" = q0Early?.video_url
        ? "video"
        : q0Early?.audio_url
          ? "audio"
          : "written";
      const earlyMediaUrl = q0Early?.video_url || q0Early?.audio_url || null;
      setBootSteps([
        { key: "voice", label: "Préparation de la voix de l'IA", status: "pending" },
        { key: "network", label: "Test de la connexion", status: "pending" },
        {
          key: "media",
          label: earlyMediaUrl
            ? `Chargement de la 1ʳᵉ question (${earlyMediaType === "video" ? "vidéo" : "audio"})`
            : "Chargement de la 1ʳᵉ question",
          status: "pending",
        },
        { key: "buffer", label: "Mise en mémoire tampon", status: "pending" },
      ]);
      setBootPercent(0);
      setBootActive(true);
    }



    // Mode « salle d'examen » — plein écran (desktop uniquement)
    isMobileLikeRef.current =
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (!isMobileLikeRef.current) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Le navigateur a refusé : on continue sans, le bandeau de rappel restera caché.
      }
    }

    // Bloque le retour arrière du navigateur pendant la session
    try {
      window.history.pushState({ interviewLock: true }, "");
    } catch {}

    // Mark session as in_progress + last_activity_at
    supabase
      .from("sessions")
      .update({
        status: "in_progress" as any,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    // Heartbeat toutes les 30 s pour conserver une trace d'activité
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(() => {
      supabase
        .from("sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", session.id);
    }, 30_000);

    // Start camera stream
    await startVideoStream();

    // Garde anti-silence : on mesure 1.5 s de signal micro avant la 1ʳᵉ question.
    // Si rien (piste muted + RMS plat), on prévient le candidat — non bloquant
    // pour ne pas créer un cul-de-sac, mais visible pour qu'il agisse.
    try {
      const s = streamRef.current;
      if (s) {
        const m = await measureMicLevel(s, MIC_THRESHOLDS.WARMUP_DURATION_MS, MIC_THRESHOLDS.ACTIVE_RMS);
        if (m.ok && m.peak <= MIC_THRESHOLDS.WARMUP_SILENCE_MAX && m.muted) {
          toast({
            title: "Aucun son détecté",
            description: "Vérifiez que votre micro est branché et non coupé.",
            variant: "destructive",
          });
          logger.error("interview_mic_warmup_silent", {
            sessionId: session?.id ?? null,
            peak: m.peak,
            activeMs: m.activeMs,
            muted: m.muted,
          });
        }
      }
    } catch { /* non bloquant */ }

    // Start auto-end timers
    interviewStartTimeRef.current = Date.now();
    maxDurationTimerRef.current = setTimeout(() => {
      if (!autoEndTriggeredRef.current) {
        autoEndTriggeredRef.current = true;
        console.log(`Auto-ending interview: ${maxDurationMinutes}min max duration`);
        toast({ title: "Session terminé", description: `La durée maximale de ${maxDurationMinutes} minutes a été atteinte.` });
        endInterviewRef.current?.();
      }
    }, MAX_DURATION_MS);
    resetSilenceTimer();

    const q0 = questions[0];
    let firstQMediaType: "written" | "audio" | "video" = q0?.video_url
      ? "video"
      : q0?.audio_url
        ? "audio"
        : "written";
    const firstQMediaUrl = q0?.video_url || q0?.audio_url || null;

    // Nouveau bloc : tout watchdog/callback antérieur sera ignoré.
    currentBlockIdRef.current += 1;
    const myBlock = currentBlockIdRef.current;

    const firstName = (session.candidate_name ?? "").trim().split(/\s+/)[0] ?? "";

    // ── PHASE BOOT : préparation séquentielle avec barre de progression ──
    // Étapes :
    //   1) Voix IA (ElevenLabs warm-up + capture du blob du greeting)
    //   2) Mesure de connexion (faite implicitement par l'étape 1 via recordTtsTiming)
    //   3) Préparation du média de la 1ère question (ou rien si question texte)
    //   4) Buffer 300 ms de stabilisation
    const usesEleven = project?.tts_provider === "elevenlabs";
    // NB : l'overlay et les étapes ont déjà été activés tout en haut de
    // beginInterview() pour éviter le flash de la Q1. On rafraîchit ici le
    // libellé de l'étape « media » au cas où questions[0] aurait évolué.
    setBootSteps([
      { key: "voice", label: "Préparation de la voix de l'IA", status: "pending" },
      { key: "network", label: "Test de la connexion", status: "pending" },
      {
        key: "media",
        label: firstQMediaUrl
          ? `Chargement de la 1ʳᵉ question (${firstQMediaType === "video" ? "vidéo" : "audio"})`
          : "Chargement de la 1ʳᵉ question",
        status: "pending",
      },
      { key: "buffer", label: "Mise en mémoire tampon", status: "pending" },
    ]);


    const updateStep = (key: string, status: BootStepStatus) => {
      setBootSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));
    };

    // ÉTAPE 1 : warm-up TTS — on ping ElevenLabs pour réveiller le service.
    updateStep("voice", "running");
    setBootPercent(10);
    // greetingBlob est déclaré plus bas, après le calcul du texte du greeting.
    if (usesEleven) {
      // On warm avec une phrase courte et neutre pour mesurer le réseau.
      const warmText = `Bonjour ${firstName || ""}.`.trim();
      const warmRes = await fetchElevenLabsBlob(warmText);
      if (warmRes) {
        recordTtsTiming(warmRes.bytes, warmRes.ms);
        // On ne stocke pas ce blob comme greeting (texte différent), mais le
        // service est désormais chaud → l'appel suivant sera rapide.
      }
      // Pré-cache (fire-and-forget) les phrases statiques de transition pour
      // que la 1re vraie transition soit instantanée côté TTS.
      void prefetchTransitionPhrases(project?.tts_voice_id ?? null, fetchElevenLabsBlob);
    }
    updateStep("voice", "done");
    updateStep("network", "done");
    setBootPercent(40);

    const introEnabled =
      (project as { ai_intro_enabled?: boolean })?.ai_intro_enabled ?? true;
    const introMode =
      ((project as { ai_intro_mode?: string })?.ai_intro_mode as "auto" | "custom") ?? "auto";
    const introCustomText =
      ((project as { ai_intro_custom_text?: string | null })?.ai_intro_custom_text ?? "").trim();

    const computeGreeting = (mediaType: typeof firstQMediaType) => {
      const isMedia = mediaType !== "written";
      const defaultGreeting = isMedia
        ? `Bonjour ${firstName}, nous allons démarrer la session. ${mediaType === "video" ? "Regardez" : "Écoutez"} la première question.`
        : `Bonjour ${firstName}, nous allons démarrer la session, voici la première question : ${q0.content}`;
      const interpolate = (tpl: string) =>
        tpl
          .replace(/\{prenom\}/g, firstName ?? "")
          .replace(/\{poste\}/g, project?.job_title ?? "")
          .replace(/\{question_suivante\}/g, q0.content ?? "")
          .trim();
      return !introEnabled
        ? (isMedia ? "" : q0.content)
        : introMode === "custom" && introCustomText
          ? interpolate(introCustomText)
          : defaultGreeting;
    };

    // Lance le préchargement du greeting EN PARALLÈLE du chargement média.
    // Le texte est calculé sur l'hypothèse du média prévu ; si le média échoue,
    // on refera un fetch ciblé après bascule en "written".
    const optimisticGreeting = computeGreeting(firstQMediaType);
    const greetingBlobPromise: Promise<{ blob: Blob; bytes: number; ms: number } | null> =
      usesEleven && optimisticGreeting
        ? fetchElevenLabsBlob(optimisticGreeting)
        : Promise.resolve(null);

    // ÉTAPE 3 : préparer le média de la Q1
    updateStep("media", "running");
    if (firstQMediaUrl) prefetchMedia(firstQMediaUrl);
    let firstQMediaReady = false;
    if (firstQMediaUrl) {
      firstQMediaReady = await prepareMediaUrl(firstQMediaUrl);
      if (!firstQMediaReady) {
        console.warn("[interview] Première question : média indisponible, bascule en texte");
        toast({
          title: "Lecture du texte",
          description: "Problème de chargement de la question, lecture du texte à la place.",
        });
        firstQMediaType = "written";
      }
    }
    updateStep("media", "done");
    setBootPercent(75);
    const isFirstQMedia = firstQMediaType !== "written";

    const greeting = computeGreeting(firstQMediaType);

    // Récupère le blob préchargé si le greeting n'a pas changé, sinon refetch.
    let greetingBlob: Blob | null = null;
    if (usesEleven && greeting) {
      if (greeting === optimisticGreeting) {
        const g = await greetingBlobPromise;
        if (g) {
          greetingBlob = g.blob;
          recordTtsTiming(g.bytes, g.ms);
        }
      } else {
        const g = await fetchElevenLabsBlob(greeting);
        if (g) {
          greetingBlob = g.blob;
          recordTtsTiming(g.bytes, g.ms);
        }
      }
    }

    // ÉTAPE 4 : buffer de stabilisation
    updateStep("buffer", "running");
    setBootPercent(95);
    await new Promise((r) => setTimeout(r, 300));
    updateStep("buffer", "done");
    setBootPercent(100);
    // Petit délai visuel pour montrer le 100 % avant de retirer l'overlay.
    await new Promise((r) => setTimeout(r, 200));
    setBootActive(false);

    // À ce stade, si l'utilisateur a quitté/pause, on stoppe tout.
    if (myBlock !== currentBlockIdRef.current) return;

    const chatMsg: ChatMessage = {
      role: "ai",
      content: greeting,
      mediaType: firstQMediaType,
      mediaUrl: isFirstQMedia ? firstQMediaUrl : null,
    };
    setMessages([chatMsg]);
    messagesRef.current = [chatMsg];
    if (greeting) {
      setAiMessages([{ role: "assistant", content: greeting }]);
    } else {
      setAiMessages([]);
    }

    // Persist greeting to DB immediately (même vide pour cohérence du fil).
    try {
      await persistMessage(session.id, "ai", greeting);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le début de la session.",
        variant: "destructive",
      });
    }

    // Speak the greeting — utilise le blob pré-fetché si disponible (zéro latence).
    if (greeting) {
      if (usesEleven && greetingBlob) {
        await tryElevenLabs(greeting, greetingBlob);
        currentPresentationRef.current = null;
      } else {
        await speak(greeting);
      }
      // Bloc obsolète (ex: pause/skip pendant la TTS) → on s'arrête là.
      if (myBlock !== currentBlockIdRef.current) return;
    }
    if (isFirstQMedia) {
      setIsSpeaking(true);
      setShouldAutoPlay(false);
      markMediaPresentation(0);
      setTimeout(() => {
        setShouldAutoPlay(true);
        armPlaybackWatchdog(myBlock);
      }, 30);
      // Don't start listening yet — onPlaybackEnd will do it (watchdog as backup)
    } else {
      // Text question: start recording + listening immediately after TTS
      startQuestionRecording();
      startListening();
    }
  };

  // Send candidate response — awaits AI to decide between follow-up / next / end.
  const handleSendResponse = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    // Nouveau jeton pour ce tour : "Passer la question" peut le marquer aborted
    // pour interrompre toute suite (TTS de relance, MAJ d'état, redémarrage STT).
    const token = { aborted: false };
    turnAbortRef.current = token;
    let aborted = false;
    try {
    stopListening();
    clearSilenceTier();
    // Stoppe immédiatement toute lecture média en cours pour éviter qu'elle se
    // superpose à la TTS de relance ou à la transition vers la question suivante.
    setShouldAutoPlay(false);
    clearPlaybackWatchdog();
    try { featuredPlayerRef.current?.stop(); } catch {}
    // On libère la ref pour qu'elle se rebinde proprement sur le nouveau composant.
    featuredPlayerRef.current = null;
    const transcript = candidateTranscriptRef.current.trim() || liveTranscript.trim();

    if (!transcript) {
      toast({
        title: "Aucune réponse",
        description: "Veuillez parler avant d'envoyer votre réponse.",
        variant: "destructive",
      });
      startListening();
      // Le compteur de silence doit repartir, sinon la session peut s'auto-terminer.
      resetSilenceTimer();
      setIsProcessing(false);
      return;
    }

    // Snapshot context
    const questionIdx = currentQuestionIndex;
    const sessionId = session?.id as string | undefined;
    const questionIdSnapshot = questions[questionIdx]?.id || null;
    const followUpsAsked = followUpsRef.current[questionIdx] ?? 0;
    const aiHistorySnapshot: { role: "user" | "assistant"; content: string }[] = [
      ...aiMessages,
      { role: "user", content: transcript },
    ];
    const isLastQuestion = questionIdx >= questions.length - 1;

    // ── 1. Update UI immediately (candidate bubble) ──
    setMessages((prev) => {
      const updated = [...prev, { role: "candidate", content: transcript }];
      messagesRef.current = updated;
      return updated;
    });
    setAiMessages(aiHistorySnapshot);
    setLiveTranscript("");
    candidateTranscriptRef.current = "";

    // ── 2. Upload + persist en parallèle de l'appel IA, mais on conservera la
    // Promise pour pouvoir l'awaiter AVANT la bascule (CLOSE_PREV solide).
    let persistCandidatePromise: Promise<void> | null = null;
    if (sessionId) {
      persistCandidatePromise = (async () => {
        let videoUrl: string | null = null;
        let audioUrl: string | null = null;
        let thumbnailUrl: string | null = null;
        try {
          const urls = await stopAndUploadQuestionVideo(sessionId, questionIdx);
          videoUrl = urls.videoUrl;
          audioUrl = urls.audioUrl;
          thumbnailUrl = urls.thumbnailUrl;
        } catch (e) {
          logger.error("interview_upload_failed", {
            sessionId,
            questionIndex: questionIdx,
            segmentType: "video",
            phase: "background",
            error: e instanceof Error ? e.message : String(e),
          });
        }
        const insertOnce = () =>
          persistMessage(sessionId, "candidate", transcript, {
            questionId: questionIdSnapshot,
            videoSegmentUrl: videoUrl,
            audioSegmentUrl: audioUrl,
          });
        try {
          await insertOnce();
        } catch (e) {
          console.warn("Candidate message insert failed, retrying in 2s…", e);
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await insertOnce();
          } catch (e2) {
            console.error("Candidate message insert failed after retry:", e2);
            toast({
              title: "Sauvegarde échouée",
              description: "Une réponse n'a pas pu être enregistrée. La session continue.",
              variant: "destructive",
            });
          }
        }
        if (videoUrl || thumbnailUrl) {
          try {
            const { data: sessRow } = await supabase
              .from("sessions")
              .select("video_recording_url, thumbnail_url")
              .eq("id", sessionId)
              .maybeSingle();
            if (sessRow) {
              const patch: { video_recording_url?: string; thumbnail_url?: string } = {};
              if (videoUrl && !sessRow.video_recording_url) patch.video_recording_url = videoUrl;
              if (thumbnailUrl && !(sessRow as any).thumbnail_url) patch.thumbnail_url = thumbnailUrl;
              if (Object.keys(patch).length > 0) {
                await supabase.from("sessions").update(patch).eq("id", sessionId);
                setSession((prev: any) => (prev ? { ...prev, ...patch } : prev));
              }
            }
          } catch (e) {
            logger.error("interview_session_update_failed", {
              sessionId,
              fields: ["video_recording_url", "thumbnail_url"],
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      })();
      trackBackground(persistCandidatePromise);
    }

    // ── 3. Call AI (await this time) to decide next action ──
    // Overlay de chargement entre questions : on couvre upload + IA + média.
    setQuestionLoading({ label: "Analyse de votre réponse…", percent: 30 });
    setAiThinking(true);
    // Override réseau : si la connexion est dégradée/poor, on plafonne (ou supprime) les relances.
    const forceMaxFollowUps = getForceMaxFollowUps();
    if (forceMaxFollowUps != null && !networkWarnedRef.current) {
      networkWarnedRef.current = true;
      toast({
        title: "Connexion lente détectée",
        description:
          forceMaxFollowUps === 0
            ? "Session simplifiée : les relances sont désactivées."
            : "Session simplifiée : relances limitées pour préserver la fluidité.",
      });
    }
    let action: "follow_up" | "next" | "end" = (isLastQuestion ? "end" : "next") as "follow_up" | "next" | "end";
    let aiMessage = "";

    // ── Bypass déterministe (MIRROR of supabase/functions/ai-conversation-turn) ──
    // Quand aucune relance n'est envisageable, on évite l'appel Gemini (1–3 s).
    // En cas de doute (champ inattendu), on N'ACTIVE PAS le bypass.
    const currentQ = questions[questionIdx] as
      | (typeof questions[number] & {
          relance_level?: string;
          follow_up_enabled?: boolean;
          max_follow_ups?: number;
        })
      | undefined;
    const qRelance = currentQ?.relance_level;
    const qFollowUpEnabled = currentQ?.follow_up_enabled !== false;
    const qMaxFollowUps =
      typeof currentQ?.max_follow_ups === "number" ? currentQ.max_follow_ups : 1;
    const noFollowUpPossible =
      isLastQuestion ||
      qRelance === "light" ||
      qFollowUpEnabled === false ||
      followUpsAsked >= qMaxFollowUps ||
      forceMaxFollowUps === 0;

    if (noFollowUpPossible) {
      action = isLastQuestion ? "end" : "next";
      if (action === "end") {
        aiMessage = "Merci pour cette session, à bientôt.";
      } else {
        const nextQClient = questions[questionIdx + 1] as
          | (typeof questions[number] & { video_url?: string | null; audio_url?: string | null })
          | undefined;
        if (nextQClient?.video_url) {
          aiMessage = STATIC_TRANSITION_PHRASES.nextVideo;
        } else if (nextQClient?.audio_url) {
          aiMessage = STATIC_TRANSITION_PHRASES.nextAudio;
        } else {
          // Question texte : la branche NEXT (L2055+) construit déjà le bon
          // fallback (`Merci. Question suivante : …`) quand aiMessage est vide.
          aiMessage = "";
        }
      }
    } else {
      try {
        const { data, error } = await supabase.functions.invoke("ai-conversation-turn", {
          body: {
            messages: aiHistorySnapshot.slice(-AI_HISTORY_WINDOW),
            projectContext: {
              aiPersonaName: project?.ai_persona_name ?? "Marie",
              jobTitle: project?.job_title ?? "",
              questions: questions.map((q) => ({
                content: q.content,
                type: q.type,
                mediaType: q.video_url ? "video" : q.audio_url ? "audio" : "written",
                relanceLevel: ((q as { relance_level?: string }).relance_level as "light" | "medium" | "deep") ?? "medium",
                maxFollowUps: typeof (q as any).max_follow_ups === "number" ? (q as any).max_follow_ups : 1,
                followUpEnabled: (q as { follow_up_enabled?: boolean }).follow_up_enabled !== false,
              })),
              currentQuestionNumber: questionIdx + 1,
              totalQuestions: questions.length,
              followUpsAsked,
              forceMaxFollowUps,
              questionTransitionsEnabled:
                (project as { ai_question_transitions_enabled?: boolean })?.ai_question_transitions_enabled ?? true,
            },
          },
        });
        if (error) throw error;
        action = (data?.action as typeof action) ?? action;
        aiMessage = (data?.message as string) ?? "";
      } catch (e) {
        logger.error("interview_ai_turn_failed", {
          sessionId: sessionId ?? null,
          questionIndex: questionIdx,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    setAiThinking(false);
    setQuestionLoading((prev) => (prev ? { ...prev, percent: 60, label: "Préparation de la suite…" } : prev));
    if (token.aborted) { aborted = true; return; }

    // On respecte la décision de l'IA (follow_up / next / end). Aucun forçage
    // côté client : si l'IA renvoie "next", on passe vraiment à la suivante,
    // même s'il restait théoriquement des relances disponibles.

    // ── 4. FOLLOW-UP branch ──
    if (action === "follow_up" && aiMessage && !isLastQuestion) {
      // Sous-bloc relance : on invalide watchdog/callbacks précédents et on
      // coupe toute lecture résiduelle avant de prononcer la relance.
      currentBlockIdRef.current += 1;
      const followBlock = currentBlockIdRef.current;
      cancelAll();

      const newCount = followUpsAsked + 1;
      followUpsRef.current = { ...followUpsRef.current, [questionIdx]: newCount };
      setFollowUpsByQuestion({ ...followUpsRef.current });

      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: aiMessage }];
        messagesRef.current = updated;
        return updated;
      });
      setAiMessages((prev) => [...prev, { role: "assistant", content: aiMessage }]);

      if (sessionId) {
        trackBackground(persistMessage(sessionId, "ai", aiMessage, {
          questionId: questions[questionIdx]?.id ?? null,
          isFollowUp: true,
        }).catch((e) => {
          console.error("Follow-up persist failed:", e);
        }));
      }

      // CLOSE_PREV : attendre l'upload du segment précédent + insert candidat
      // pour qu'on n'écrive pas par-dessus pendant la relance.
      if (persistCandidatePromise) {
        try { await persistCandidatePromise; } catch {}
        if (token.aborted) { aborted = true; return; }
      }

      setResponseElapsedSec(0);
      currentPresentationRef.current = { kind: "tts", text: aiMessage };
      // Pré-fetch TTS pour ne dévoiler la question qu'une fois prête à jouer.
      let followBlob: Blob | null = null;
      if (project?.tts_provider === "elevenlabs") {
        const f = await fetchElevenLabsBlob(aiMessage);
        if (f) {
          followBlob = f.blob;
          recordTtsTiming(f.bytes, f.ms);
        }
      }
      setQuestionLoading(null);
      if (followBlob) {
        await tryElevenLabs(aiMessage, followBlob);
        currentPresentationRef.current = null;
      } else {
        await speak(aiMessage);
      }
      if (token.aborted) { aborted = true; return; }
      if (followBlock !== currentBlockIdRef.current) return;
      if (isPausedRef.current) return;
      // Resume listening on the same question
      startQuestionRecording();
      startListening();
      resetSilenceTimer();
      return;
    }

    // ── 5. END branch ──
    if (action === "end" || isLastQuestion) {
      setInterviewFinished(true);
      // Garde-fou : si l'IA a généré (à tort) une transition vers une question suivante
      // sur la dernière question, on remplace par un message de clôture propre.
      const fallbackClosing = "Merci pour cette session, à bientôt.";
      const rawClosing = (aiMessage || "").trim();
      const lower = rawClosing.toLowerCase();
      const hasTransitionMarker =
        /question\s+suivante|écoutez|ecoutez|regardez|passons\s+à|passons\s+a/.test(lower);
      const closing = !rawClosing || hasTransitionMarker ? fallbackClosing : rawClosing;
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: closing }];
        messagesRef.current = updated;
        return updated;
      });
      setAiMessages((prev) => [...prev, { role: "assistant", content: closing }]);
      if (sessionId) {
        trackBackground(persistMessage(sessionId, "ai", closing).catch((e) => {
          console.error("Closing persist failed:", e);
        }));
      }
      // On garde l'overlay affiché pendant la TTS de clôture pour éviter un
      // "flash" de l'écran question avant la redirection vers /complete.
      setQuestionLoading({ label: "Finalisation de la session…", percent: 95 });
      // CLOSE_PREV : il faut absolument attendre l'upload du dernier segment
      // vidéo + l'insert du message candidat AVANT d'appeler endInterview().
      // Sinon generate-report tourne sur une session qui n'a pas encore la
      // dernière réponse → "la dernière question saute".
      // On parallélise avec la TTS de clôture pour ne pas ajouter de latence
      // perçue (speak prend déjà 2-4 s, le temps que l'upload finisse).
      await Promise.all([
        persistCandidatePromise ?? Promise.resolve(),
        speak(closing),
      ]);
      if (token.aborted) { aborted = true; return; }
      endInterviewRef.current?.();
      return;
    }

    // ── 6. NEXT branch ──
    // Nouveau bloc question : invalide tout watchdog/callback du tour précédent.
    currentBlockIdRef.current += 1;
    const nextBlock = currentBlockIdRef.current;
    cancelAll();

    const nextQIdx = questionIdx + 1;
    const nextQ = questions[nextQIdx];
    let nMediaType: "written" | "audio" | "video" = nextQ?.video_url
      ? "video"
      : nextQ?.audio_url
        ? "audio"
        : "written";
    const nMediaUrl = nextQ?.video_url || nextQ?.audio_url || null;

    // Précharge le média pendant la TTS de transition.
    if (nMediaUrl) prefetchMedia(nMediaUrl);

    const transitionsEnabled =
      (project as { ai_question_transitions_enabled?: boolean })?.ai_question_transitions_enabled ?? true;
    const transitionsMode =
      ((project as { ai_question_transitions_mode?: string })?.ai_question_transitions_mode as
        | "auto"
        | "custom") ?? "auto";
    const transitionsCustomText =
      ((project as { ai_question_transitions_custom_text?: string | null })
        ?.ai_question_transitions_custom_text ?? "").trim();

    const interpolateTransition = (tpl: string) =>
      tpl
        .replace(/\{prenom\}/g, ((session?.candidate_name ?? "").trim().split(/\s+/)[0]) ?? "")
        .replace(/\{poste\}/g, project?.job_title ?? "")
        .replace(/\{question_suivante\}/g, nextQ?.content ?? "")
        .trim();

    // Calcul du texte de transition :
    // - transitionsEnabled=false → silencieux (sauf Q texte → on prononce la question).
    // - mode "custom" + texte fourni → on l'utilise (priorité sur l'IA).
    // - sinon → message IA si dispo, sinon fallback local.
    const transition = !transitionsEnabled
      ? (nMediaType === "written" ? nextQ.content : "")
      : transitionsMode === "custom" && transitionsCustomText
        ? (nMediaType === "written"
            ? `${interpolateTransition(transitionsCustomText)} ${nextQ.content}`.trim()
            : interpolateTransition(transitionsCustomText))
        : (aiMessage ||
            (nMediaType === "written"
              ? `Merci. Question suivante : ${nextQ.content}`
              : `Merci. ${nMediaType === "video" ? "Regardez" : "Écoutez"} la question suivante.`));

    if (transition) {
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: transition, mediaType: nMediaType, mediaUrl: nMediaUrl }];
        messagesRef.current = updated;
        return updated;
      });
      setAiMessages((prev) => [...prev, { role: "assistant", content: transition }]);

      if (sessionId) {
        trackBackground(persistMessage(sessionId, "ai", transition).catch((e) => {
          console.error("Transition persist failed:", e);
        }));
      }
    } else if (nMediaUrl) {
      // Pas de phrase de transition mais on ajoute quand même un message porteur du média,
      // pour que le player s'affiche dans le fil de conversation.
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: "", mediaType: nMediaType, mediaUrl: nMediaUrl }];
        messagesRef.current = updated;
        return updated;
      });
    }

    // CLOSE_PREV : on attend que l'upload du segment N-1 + l'insert du message
    // candidat soient terminés AVANT de basculer l'index de question.
    if (persistCandidatePromise) {
      try { await persistCandidatePromise; } catch {}
      if (token.aborted) { aborted = true; return; }
    }

    // Si la connexion est très mauvaise, on évite carrément la lecture du média
    // (qui prendrait trop de temps à se charger) et on bascule en texte d'office.
    if (nMediaUrl && networkTierRef.current === "poor") {
      console.warn("[interview] Réseau poor — bascule directe en texte pour la prochaine question");
      nMediaType = "written";
      setMessages((prev) => {
        const updated = prev.map((m, i) =>
          i === prev.length - 1 && m.role === "ai" ? { ...m, mediaType: "written" as const, mediaUrl: null } : m,
        );
        messagesRef.current = updated;
        return updated;
      });
    }

    // PREP_MEDIA : si la question suivante a un média, on vérifie qu'il est
    // téléchargeable. En cas d'échec, on bascule en mode texte (en mémoire).
    let preparedTransitionBlob: Blob | null = null;
    if (nMediaUrl && nMediaType !== "written") {
      // Préparation parallèle : média + (optionnel) blob TTS de la transition.
      // On attend les DEUX avant de retirer l'overlay et de jouer.
      const blobPromise = (async () => {
        if (!transition) return null;
        if (project?.tts_provider !== "elevenlabs") return null;
        const f = await fetchElevenLabsBlob(transition);
        if (!f) return null;
        recordTtsTiming(f.bytes, f.ms);
        return f.blob;
      })();
      const [mediaReady, blob] = await Promise.all([prepareMediaUrl(nMediaUrl), blobPromise]);
      preparedTransitionBlob = blob;
      if (token.aborted) { aborted = true; return; }
      if (nextBlock !== currentBlockIdRef.current) return;
      if (isPausedRef.current) return;

      setQuestionLoading((prev) => (prev ? { ...prev, percent: 90, label: "Lecture imminente…" } : prev));

      if (!mediaReady) {
        console.warn("[interview] Question média indisponible — bascule en texte");
        toast({
          title: "Lecture du texte",
          description: "Problème de chargement de la question, lecture du texte à la place.",
        });
        nMediaType = "written";
        // On change l'affichage du dernier message AI pour retirer le média.
        setMessages((prev) => {
          const updated = prev.map((m, i) =>
            i === prev.length - 1 && m.role === "ai" ? { ...m, mediaType: "written" as const, mediaUrl: null } : m,
          );
          messagesRef.current = updated;
          return updated;
        });
      }

      // Dismiss l'overlay maintenant que tout est prêt, puis prononce la transition (si présente).
      setQuestionLoading(null);
      if (transition) {
        setIsSpeaking(true);
        setShouldAutoPlay(false);
        currentPresentationRef.current = { kind: "tts", text: transition };
        if (preparedTransitionBlob) {
          await tryElevenLabs(transition, preparedTransitionBlob);
          currentPresentationRef.current = null;
        } else {
          await speak(transition);
        }
        if (token.aborted) { aborted = true; return; }
        if (nextBlock !== currentBlockIdRef.current) return;
        if (isPausedRef.current) return;
      }
    } else {
      // Pas de média : retirer l'overlay maintenant.
      setQuestionLoading(null);
    }

    setCurrentQuestionIndex(nextQIdx);
    if (sessionId) {
      supabase
        .from("sessions")
        .update({ last_question_index: nextQIdx, last_activity_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    if (nMediaType !== "written") {
      // PLAY_MEDIA : déclencher l'autoplay (le player attend canplaythrough).
      setIsSpeaking(true);
      setShouldAutoPlay(false);
      markMediaPresentation(nextQIdx);
      setTimeout(() => {
        if (nextBlock !== currentBlockIdRef.current) return;
        setShouldAutoPlay(true);
        armPlaybackWatchdog(nextBlock);
      }, 30);
    } else if (nMediaUrl) {
      // Cas fallback : média indisponible, on lit le contenu texte de la question.
      const fallbackText = `Voici la question : ${nextQ.content}`;
      currentPresentationRef.current = { kind: "tts", text: fallbackText };
      await speak(fallbackText);
      if (token.aborted) { aborted = true; return; }
      if (nextBlock !== currentBlockIdRef.current) return;
      if (isPausedRef.current) return;
      startQuestionRecording();
      startListening();
    } else {
      // Question écrite native : on prononce la transition (qui contient déjà la
      // question), puis on écoute.
      await speak(transition);
      if (token.aborted) { aborted = true; return; }
      if (nextBlock !== currentBlockIdRef.current) return;
      if (isPausedRef.current) return;
      startQuestionRecording();
      startListening();
    }
    } finally {
      if (!aborted) setIsProcessing(false);
    }
  };

  // Skip the current question — go directly to the next one without calling AI
  const handleSkipQuestion = async () => {
    if (interviewFinished) return;
    // Marque le tour IA en cours comme abandonné pour qu'il n'écrase pas l'état
    // de la question suivante.
    if (turnAbortRef.current) turnAbortRef.current.aborted = true;
    // Coupe immédiatement toute TTS en cours (navigateur + ElevenLabs).
    window.speechSynthesis?.cancel();
    if (elevenAudioRef.current) {
      try { elevenAudioRef.current.pause(); } catch {}
      elevenAudioRef.current = null;
    }
    setIsSpeaking(false);
    const isLast = currentQuestionIndex >= questions.length - 1;
    // Sur la dernière question, "Passer" termine la session.
    if (isLast) {
      try { featuredPlayerRef.current?.stop(); } catch {}
      featuredPlayerRef.current = null;
      stopListening();
      await endInterview();
      return;
    }

    setIsProcessing(true);
    // Nouveau bloc question : invalide tout watchdog/callback antérieur.
    currentBlockIdRef.current += 1;
    const skipBlock = currentBlockIdRef.current;
    try {
      // 1. Stop listening + reset transcript + stop any media playback in progress
      stopListening();
      candidateTranscriptRef.current = "";
      setLiveTranscript("");
      clearAutoSkip();
      cancelAll();
      featuredPlayerRef.current = null;

      // 2. Stop & upload current question recording — AWAIT pour garantir la persistance.
      const questionIdx = currentQuestionIndex;
      let questionVideoUrl: string | null = null;
      let questionAudioUrl: string | null = null;
      if (session?.id) {
        const urls = await stopAndUploadQuestionVideo(session.id, questionIdx);
        questionVideoUrl = urls.videoUrl;
        questionAudioUrl = urls.audioUrl;
      }

      // 3. Persist a marker message so the report knows the question was skipped
      const skipMarker = "[Question passée]";
      setMessages((prev) => {
        const updated = [...prev, { role: "candidate", content: skipMarker }];
        messagesRef.current = updated;
        return updated;
      });
      if (session?.id) {
        try {
          await persistMessage(session.id, "candidate", skipMarker, {
            questionId: questions[questionIdx]?.id || null,
            videoSegmentUrl: questionVideoUrl,
            audioSegmentUrl: questionAudioUrl,
          });
        } catch {
          // non-bloquant
        }
      }
      setAiMessages((prev) => [...prev, { role: "user" as const, content: skipMarker }]);

      // 4. Build next question transition + PREP_MEDIA
      const nextQIdx = currentQuestionIndex + 1;
      const nextQ = questions[nextQIdx];
      let nMediaType: "written" | "audio" | "video" = nextQ?.video_url
        ? "video"
        : nextQ?.audio_url
          ? "audio"
          : "written";
      const nMediaUrl = nextQ?.video_url || nextQ?.audio_url || null;
      if (nMediaUrl) prefetchMedia(nMediaUrl);

      // Vérifie que le média est téléchargeable. Sinon, bascule en texte.
      if (nMediaUrl) {
        const ready = await prepareMediaUrl(nMediaUrl);
        if (!ready) {
          console.warn("[interview] Skip → question média indisponible, bascule en texte");
          toast({
            title: "Lecture du texte",
            description: "Problème de chargement de la question, lecture du texte à la place.",
          });
          nMediaType = "written";
        }
      }
      if (skipBlock !== currentBlockIdRef.current) return;

      const transitionsEnabled =
        (project as { ai_question_transitions_enabled?: boolean })?.ai_question_transitions_enabled ?? true;

      const transition = !transitionsEnabled
        ? (nMediaType === "written" ? nextQ.content : "")
        : nMediaType === "written"
          ? `Passons à la question suivante : ${nextQ.content}`
          : `Passons à la question suivante. ${nMediaType === "video" ? "Regardez" : "Écoutez"} bien.`;

      if (transition) {
        setMessages((prev) => {
          const updated = [...prev, { role: "ai", content: transition, mediaType: nMediaType, mediaUrl: nMediaType === "written" ? null : nMediaUrl }];
          messagesRef.current = updated;
          return updated;
        });
        if (session?.id) {
          try {
            await persistMessage(session.id, "ai", transition);
          } catch {
            // non-bloquant
          }
        }
        setAiMessages((prev) => [...prev, { role: "assistant" as const, content: transition }]);
      }

      setCurrentQuestionIndex((prev) => prev + 1);
      if (session?.id) {
        supabase
          .from("sessions")
          .update({ last_question_index: nextQIdx, last_activity_at: new Date().toISOString() })
          .eq("id", session.id);
      }

      // 5. Speak transition + auto-play next question media (or start listening for written)
      if (transition) await speak(transition);
      if (skipBlock !== currentBlockIdRef.current) return;

      if (isPausedRef.current) return;
      if (nMediaType !== "written") {
        setIsSpeaking(true);
        setShouldAutoPlay(false);
        markMediaPresentation(nextQIdx);
        setTimeout(() => {
          if (skipBlock !== currentBlockIdRef.current) return;
          setShouldAutoPlay(true);
          armPlaybackWatchdog(skipBlock);
        }, 30);
      } else {
        startQuestionRecording();
        startListening();
      }
    } catch (e) {
      console.error("[interview] handleSkipQuestion failed", e);
      logger.error("interview_skip_failed", {
        sessionId: session?.id ?? null,
        questionIndex: currentQuestionIndex,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      // Toujours débloquer l'UI, sinon le bouton "Passer" disparaît à jamais.
      setIsProcessing(false);
    }
  };

  const endInterviewStartedRef = useRef(false);
  const endInterview = async () => {
    // Guard against double invocation
    if (endInterviewStartedRef.current) return;
    endInterviewStartedRef.current = true;

    // Clear all auto-end timers + heartbeat
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    // Quitter le plein écran si on y est
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    stopListening();
    window.speechSynthesis?.cancel();

    const sessionId = session?.id;
    const questionIndex = currentQuestionIndex;
    const startedAt = interviewStartTimeRef.current;

    // Redirect IMMEDIATELY — finalize in background.
    // The Complete page will display a "Recording in progress…" state until
    // sessions.status === 'completed', then auto-switch to the final screen.
    navigate(`/session/${slug}/complete/${token}`);

    // Run finalization async in the background (no await on UI)
    (async () => {
      if (!sessionId) return;
      try {
        // Stop per-question recorder if still running and upload last segment
        if (questionRecorderRef.current && questionRecorderRef.current.state !== "inactive") {
          try { await stopAndUploadQuestionVideo(sessionId, questionIndex); } catch (e) {
            logger.error("interview_upload_failed", {
              sessionId,
              questionIndex,
              segmentType: "video",
              phase: "finalize",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        // Stop camera stream
        streamRef.current?.getTracks().forEach((t) => t.stop());

        // Flush in-flight background jobs (candidate inserts + AI transitions).
        // Timeout généreux (15 s) car sur réseau dégradé l'upload de la dernière
        // vidéo peut être lent. L'utilisateur est déjà sur /complete qui poll
        // le status, donc cette attente n'est pas perçue.
        if (backgroundJobsRef.current.length > 0) {
          const flush = Promise.allSettled(backgroundJobsRef.current);
          const timeout = new Promise((resolve) => setTimeout(resolve, 15000));
          await Promise.race([flush, timeout]);
          backgroundJobsRef.current = [];
        }

        const durationSeconds = startedAt
          ? Math.round((Date.now() - startedAt) / 1000)
          : null;

        await supabase
          .from("sessions")
          .update({
            status: "completed" as any,
            completed_at: new Date().toISOString(),
            ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
          })
          .eq("id", sessionId);

        // Re-transcribe candidate videos with Gemini (cleans STT artifacts)
        // before generating the report so analysis uses clean text.
        try {
          const transcribePromise = supabase.functions.invoke("transcribe-session", {
            body: { session_id: sessionId },
          });
          const timeout = new Promise((resolve) => setTimeout(resolve, 60000));
          await Promise.race([transcribePromise, timeout]);
        } catch (e) {
          logger.error("interview_transcribe_failed", {
            sessionId,
            error: e instanceof Error ? e.message : String(e),
          });
        }

        // Trigger report generation
        try {
          const { error: reportError } = await supabase.functions.invoke("generate-report", {
            body: { session_id: sessionId },
          });
          if (reportError) {
            logger.error("interview_report_generation_failed", {
              sessionId,
              error: reportError.message ?? String(reportError),
            });
          }
        } catch (e) {
          logger.error("interview_report_generation_failed", {
            sessionId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      } catch (e) {
        logger.error("interview_session_update_failed", {
          sessionId,
          fields: ["status", "completed_at", "duration_seconds"],
          phase: "finalize",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  };

  // Annulation totale : appel edge function qui supprime tout, puis redirection
  const cancelInterview = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      // Stop tout media local
      try {
        if (questionRecorderRef.current && questionRecorderRef.current.state !== "inactive") {
          questionRecorderRef.current.stop();
        }
        if (questionAudioRecorderRef.current && questionAudioRecorderRef.current.state !== "inactive") {
          questionAudioRecorderRef.current.stop();
        }
      } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }

      const { error } = await supabase.functions.invoke("cancel-session", {
        body: { sessionToken: token },
      });
      if (error) {
        logger.error("interview_cancel_failed", { error: error.message ?? String(error) });
        toast({
          title: "Erreur",
          description: "Impossible d'annuler. Veuillez réessayer.",
          variant: "destructive",
        });
        setCancelling(false);
        return;
      }
      navigate("/session/cancelled", { replace: true });
    } catch (e) {
      logger.error("interview_cancel_failed", { error: e instanceof Error ? e.message : String(e) });
      toast({
        title: "Erreur",
        description: "Impossible d'annuler. Veuillez réessayer.",
        variant: "destructive",
      });
      setCancelling(false);
    }
  };

  // Keep endInterviewRef in sync
  useEffect(() => {
    endInterviewRef.current = endInterview;
  });

  // Keep handleSendResponseRef in sync
  useEffect(() => {
    handleSendResponseRef.current = handleSendResponse;
  });

  // Keep startListeningRef in sync (utilisé par le fallback STT depuis onend).
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Spacebar shortcut to validate the answer (same conditions as the "Ma réponse est terminée" button)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (isPaused || interviewFinished || isSpeaking || isProcessing || !isListening) return;
      const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
      if (!hasVoice) return;
      e.preventDefault();
      handleSendResponseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPaused, interviewFinished, isSpeaking, isProcessing, isListening, liveTranscript]);

  // Auto-skip 3s: when listening and no speech for 3s, show countdown then auto-send
  const clearAutoSkip = useCallback(() => {
    if (autoSkipTimerRef.current) {
      clearTimeout(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    if (autoSkipCountdownRef.current) {
      clearInterval(autoSkipCountdownRef.current);
      autoSkipCountdownRef.current = null;
    }
    setAutoSkipCountdown(null);
  }, []);

  const startAutoSkipTimer = useCallback(() => {
    // Auto-skip désactivé par défaut au profit de la relance IA + paliers de silence
    return;
    // eslint-disable-next-line no-unreachable
    if (!project?.auto_skip_silence) return;
    clearAutoSkip();
    // After 3s of silence, start a 3s countdown then auto-send
    autoSkipTimerRef.current = setTimeout(() => {
      let remaining = 3;
      setAutoSkipCountdown(remaining);
      autoSkipCountdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearAutoSkip();
          // Auto-send response
          handleSendResponseRef.current?.();
        } else {
          setAutoSkipCountdown(remaining);
        }
      }, 1000);
    }, 3000);
  }, [project?.auto_skip_silence, clearAutoSkip]);

  // Reset auto-skip when candidate speaks
  useEffect(() => {
    if (liveTranscript && isListening) {
      clearAutoSkip();
      // Restart timer for next silence window
      startAutoSkipTimer();
    }
  }, [liveTranscript, isListening, clearAutoSkip, startAutoSkipTimer]);

  // Start auto-skip timer when listening starts, clear when it stops
  useEffect(() => {
    if (isListening && !isSpeaking && !isProcessing) {
      startAutoSkipTimer();
    } else {
      clearAutoSkip();
    }
  }, [isListening, isSpeaking, isProcessing, startAutoSkipTimer, clearAutoSkip]);

  // Watchdog : si après une transition on reste 4 s en état "rien" (ni écoute,
  // ni TTS, ni traitement), c'est que startListening() a échoué silencieusement.
  // On affiche un bandeau permettant de relancer le micro ou passer la question.
  useEffect(() => {
    if (interviewFinished || isPaused || !readyToStart) {
      setInterviewStuck(false);
      return;
    }
    if (isListening || isSpeaking || isProcessing) {
      setInterviewStuck(false);
      return;
    }
    const timer = setTimeout(() => {
      setInterviewStuck(true);
      logger.error("interview_stuck_after_transition", {
        sessionId: session?.id ?? null,
        questionIndex: currentQuestionIndex,
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [
    isListening,
    isSpeaking,
    isProcessing,
    interviewFinished,
    isPaused,
    readyToStart,
    currentQuestionIndex,
    session?.id,
  ]);

  // Response timer: ticks while candidate is speaking
  useEffect(() => {
    if (isListening && !isPaused) {
      const interval = setInterval(() => setResponseElapsedSec((s) => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isListening, isPaused]);

  // Reset response timer when question changes
  useEffect(() => {
    setResponseElapsedSec(0);
    warnedNearLimitRef.current = false;
    autoSentRef.current = false;
  }, [currentQuestionIndex]);

  // Auto-end answer when per-question timer expires.
  // Plafond dur 10 min (600 s) par réponse, quelle que soit la valeur en base.
  // Avertissement à 30 s restantes.
  useEffect(() => {
    const q = questions[currentQuestionIndex];
    const configured = q?.max_response_seconds as number | null | undefined;
    const max = Math.min(configured && configured > 0 ? configured : 600, 600);
    if (!isListening || isPaused) return;
    const remaining = max - responseElapsedSec;
    if (!warnedNearLimitRef.current && remaining <= 30 && remaining > 0) {
      warnedNearLimitRef.current = true;
      toast({
        title: "30 secondes restantes",
        description: "Votre réponse sera envoyée automatiquement à 0:00.",
      });
    }
    if (remaining <= 0 && !autoSentRef.current) {
      autoSentRef.current = true;
      console.log("[interview] per-question timer expired — auto-sending response");
      toast({ title: "Temps écoulé", description: "Réponse envoyée automatiquement." });
      handleSendResponseRef.current?.();
    }
  }, [responseElapsedSec, isListening, isPaused, currentQuestionIndex, questions, toast]);

  // Reset du minuteur de silence : uniquement pendant la vraie phase d'écoute
  // candidat (IA silencieuse, pas de traitement, pas en pause). Sinon le minuteur
  // serait sans cesse réarmé par les transitions et les pauses pourraient se
  // déclencher au mauvais moment.
  useEffect(() => {
    if (!liveTranscript) return;
    if (!isListening || isPaused || isSpeaking || isProcessing) return;
    if (interviewFinished) return;
    resetSilenceTimer();
  }, [liveTranscript, isListening, isPaused, isSpeaking, isProcessing, interviewFinished, resetSilenceTimer]);

  // Quand on quitte la phase d'écoute (IA parle, traitement, pause, fin),
  // on désarme proprement le minuteur de silence pour éviter toute pause auto
  // déclenchée pendant une transition.
  useEffect(() => {
    const inListeningPhase =
      isListening && !isPaused && !isSpeaking && !isProcessing && !interviewFinished;
    if (!inListeningPhase) {
      clearSilenceTier();
      clearEndCountdown();
    }
  }, [isListening, isPaused, isSpeaking, isProcessing, interviewFinished, clearSilenceTier, clearEndCountdown]);

  // Pause automatique sur connexion vraiment dégradée.
  // Conditions strictes pour éviter les faux positifs :
  //  - tier === "poor" ET débit mesuré < 80 kbps (en-dessous, le TTS ne charge plus correctement)
  //  - pendant 30s consécutives, uniquement en phase d'écoute candidat
  // Reprise auto dès que le réseau redevient stable (tier !== "poor") pendant 8s.
  useEffect(() => {
    const inListeningPhase =
      isListening && !isPaused && !isSpeaking && !isProcessing && !aiThinking && !interviewFinished;
    const reallyPoor =
      networkTier === "poor" && measuredKbps != null && measuredKbps < 80;

    // Watcher de chute : on arme un timer de 30s pour mettre en pause.
    if (inListeningPhase && reallyPoor && !networkPauseActive) {
      if (networkDownTimerRef.current == null) {
        networkDownTimerRef.current = window.setTimeout(() => {
          networkDownTimerRef.current = null;
          if (isPausedRef.current) return;
          setNetworkPauseActive(true);
          try { pauseInterviewRef.current?.("auto-network"); } catch {}
        }, 30_000);
      }
    } else if (networkDownTimerRef.current != null) {
      clearTimeout(networkDownTimerRef.current);
      networkDownTimerRef.current = null;
    }

    // Watcher de remontée : si on est en pause réseau et que ça repart, reprise auto après 8s.
    if (networkPauseActive && networkTier !== "poor") {
      if (networkUpTimerRef.current == null) {
        networkUpTimerRef.current = window.setTimeout(() => {
          networkUpTimerRef.current = null;
          setNetworkPauseActive(false);
          if (isPausedRef.current) {
            try { resumeInterview(); } catch {}
          }
        }, 8_000);
      }
    } else if (networkUpTimerRef.current != null) {
      clearTimeout(networkUpTimerRef.current);
      networkUpTimerRef.current = null;
    }

    return () => {
      // pas de cleanup global ici : les timers sont gérés par les branches.
    };
  }, [
    isListening, isPaused, isSpeaking, isProcessing, aiThinking, interviewFinished,
    networkTier, measuredKbps, networkPauseActive,
  ]);

  // Si l'utilisateur reprend manuellement, on lève le flag réseau pour ne pas
  // ré-enclencher la reprise automatique inutilement.
  useEffect(() => {
    if (!isPaused && networkPauseActive) {
      setNetworkPauseActive(false);
    }
  }, [isPaused, networkPauseActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      if (playbackWatchdogRef.current) clearTimeout(playbackWatchdogRef.current);
      if (manualContinueTimerRef.current) clearTimeout(manualContinueTimerRef.current);
      if (silenceHintTimerRef.current) clearTimeout(silenceHintTimerRef.current);
      if (silenceTier3TimerRef.current) clearTimeout(silenceTier3TimerRef.current);
      if (silenceAutoPauseTimerRef.current) clearTimeout(silenceAutoPauseTimerRef.current);
      if (silenceEndWarningTimerRef.current) clearTimeout(silenceEndWarningTimerRef.current);
      if (endCountdownIntervalRef.current) clearInterval(endCountdownIntervalRef.current);
      if (networkDownTimerRef.current) clearTimeout(networkDownTimerRef.current);
      if (networkUpTimerRef.current) clearTimeout(networkUpTimerRef.current);
      clearAutoSkip();
    };
  }, [stopListening, clearAutoSkip]);

  // Rattache le flux caméra à tous les selfviews dès qu'un changement d'état
  // peut provoquer un remount du <video> (changement de question, reprise,
  // sortie de pause, fin du dialogue de reprise…). Crucial sur mobile où le
  // DOM se ré-organise plus souvent.
  useEffect(() => {
    if (!readyToStart) return;
    reattachAllSelfViews();
  }, [readyToStart, currentQuestionIndex, isPaused, restoringMessages, isSpeaking, isListening, reattachAllSelfViews]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  // Écran de reprise — proposé si une session interrompue est détectée
  if (resumePrompt && !readyToStart) {
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center" data-testid="interview-resume-dialog">
          <CardContent className="py-12 space-y-6">
            <div className="space-y-3">
              <h1 className="text-xl font-bold candidate-gradient-text">Reprendre votre session ?</h1>
              <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
                Vous avez une session en cours. Vous pouvez la reprendre là où vous en étiez ou tout recommencer depuis le début.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="candidate-btn-primary w-full h-14 text-base"
                onClick={handleResumeInterview}
                disabled={restoringMessages}
                data-testid="interview-resume-confirm"
              >
                Reprendre
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base"
                onClick={handleRestartInterview}
                disabled={restoringMessages}
                data-testid="interview-resume-restart"
              >
                Recommencer depuis le début
              </Button>
            </div>
          </CardContent>
        </Card>
      </CandidateLayout>
    );
  }

  // Show "ready to start" screen — user must click to enable TTS on mobile
  if (!readyToStart) {
    const dataReady = !!session && !!project && questions.length > 0;
    return (
      <CandidateLayout>
        <Card className="max-w-md w-full text-center" data-testid="interview-start-screen">
          <CardContent className="py-12 space-y-6">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, hsl(var(--l-accent) / 0.4), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--l-accent) / 0.2), hsl(var(--l-accent-2) / 0.2))",
                }}
              >
                <Mic className="h-10 w-10" style={{ color: "hsl(var(--l-accent))" }} />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-xl font-bold candidate-gradient-text">Prêt à démarrer ?</h1>
              <p className="text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
                {project?.pre_session_message?.trim() || "Soyez naturel·le et souriez, vous êtes filmé·e !"}
              </p>
            </div>
            <label
              className="flex items-start gap-3 text-sm cursor-pointer select-none rounded-md p-3"
              style={{
                color: "hsl(var(--l-fg) / 0.85)",
                backgroundColor: "hsl(var(--l-fg) / 0.04)",
              }}
            >
              <Checkbox
                checked={consentChecked}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setConsentChecked(next);
                  if (next && token && !session?.consent_accepted_at) {
                    supabase
                      .from("sessions")
                      .update({ consent_accepted_at: new Date().toISOString() })
                      .eq("token", token)
                      .then(() => {});
                  }
                }}
                data-testid="interview-consent-checkbox"
                className="mt-0.5"
              />
              <span>
                J'ai lu et j'accepte les{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setConsentDialogOpen(true);
                  }}
                  className="underline hover:opacity-80"
                  style={{ color: "hsl(var(--l-accent))" }}
                >
                  conditions de traitement de mes données personnelles
                </button>
                .
              </span>
            </label>
            <Button
              size="lg"
              className="candidate-btn-primary w-full h-16 text-xl"
              onClick={beginInterview}
              disabled={!dataReady || !consentChecked}
              data-testid={dataReady ? "interview-start-button" : "interview-start-button-disabled"}
            >
              <Volume2 className="mr-2 !h-6 !w-6" />
              Lancer la session
            </Button>
            {!dataReady && (
              <div
                className="flex items-center justify-center gap-2 text-xs"
                style={{ color: "hsl(var(--l-fg) / 0.6)" }}
              >
                <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Préparation de la session…</span>
              </div>
            )}
          </CardContent>
        </Card>
        <ConsentDialog
          open={consentDialogOpen}
          onOpenChange={setConsentDialogOpen}
          jobTitle={project?.job_title || project?.title || ""}
          orgName={project?.organizations?.name || ""}
        />
      </CandidateLayout>
    );
  }

  // Helper : tenter de revenir en plein écran (clic utilisateur requis)
  const requestFullscreenAgain = () => {
    if (isMobileLikeRef.current) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <CandidateLayout minimal>
      {bootActive && <InterviewBootProgress steps={bootSteps} percent={bootPercent} />}
      {questionLoading && !bootActive && (
        <QuestionLoadingOverlay percent={questionLoading.percent} label={questionLoading.label} />
      )}
      {audioBlocked && (
        <AudioUnlockOverlay
          onUnlock={() => {
            const fn = pendingReplayRef.current;
            pendingReplayRef.current = null;
            setAudioBlocked(false);
            try { fn?.(); } catch {}
          }}
        />
      )}
      {audioDebugEnabled && (
        <AudioDebugPanel audioRef={primaryAudioRef} audioBlocked={audioBlocked} />
      )}
      {!isMobileLikeRef.current && !isFullscreen && !interviewFinished && (
        <FullscreenPrompt onEnter={requestFullscreenAgain} />
      )}
      {!interviewFinished && (
        <RecordingStatusBadge
          pendingUploads={pendingChunkUploads}
          recording={isRecordingActive}
        />
      )}
      {!interviewFinished && noMicSignal && (
        <div className="fixed top-4 left-1/2 z-40 -translate-x-1/2 max-w-xl px-4">
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:bg-amber-950/60 dark:text-amber-100">
            Nous ne recevons pas votre voix. Vérifiez que votre micro est branché et activé, ou mettez la session en pause.
          </div>
        </div>
      )}
      {endCountdown !== null && !interviewFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              Aucune activité détectée
            </p>
            <p className="mt-2 text-base text-foreground">
              La session sera arrêtée dans
            </p>
            <p className="mt-4 text-6xl font-bold text-destructive tabular-nums">
              {endCountdown}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Bougez la souris ou parlez pour continuer.
            </p>
          </div>
        </div>
      )}
      {!bootActive && (
      <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden">
        {/* Indicateur de sauvegarde affiché en pastille discrète bas-droite (RecordingStatusBadge). */}

        {(() => {
          const currentQ = questions[currentQuestionIndex];
          const questionType: "written" | "audio" | "video" = currentQ?.video_url
            ? "video"
            : currentQ?.audio_url
              ? "audio"
              : "written";
          return (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center py-6 sm:py-8 pb-32 sm:pb-24 lg:py-4 lg:pb-2 lg:min-h-0">
              {/* ── Colonne gauche : Avatar IA (2/3 desktop) ── */}
              <div className="lg:col-span-2 lg:h-full lg:min-h-0 lg:flex lg:items-center lg:justify-center">
                {questionType === "video" && currentQ?.video_url && !interviewFinished ? (
                  <div className="relative w-full mx-auto max-w-[680px]">
                    <QuestionMediaPlayer
                      key={`q-video-${currentQuestionIndex}`}
                      ref={featuredPlayerRef}
                      type="video"
                      content={currentQ.content}
                      videoUrl={currentQ.video_url}
                      variant="featured"
                      autoPlay={shouldAutoPlay}
                      onPlaybackEnd={() => {
                        if (isPausedRef.current) {
                          console.log("[InterviewStart] onPlaybackEnd (video) ignored — paused");
                          return;
                        }
                        console.log("[InterviewStart] onPlaybackEnd (video) fired");
                        forceStartListening();
                      }}
                    />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium z-10">
                      {project?.ai_persona_name || "Marie"} — IA
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full max-w-[462px] sm:max-w-[748px] aspect-video mx-auto">
                    {/* Halo respirant quand IA parle */}
                    {isSpeaking && <div className="candidate-avatar-halo" aria-hidden="true" />}
                    <div
                      className={`relative w-full h-full rounded-2xl overflow-hidden transition-all ${
                        isSpeaking
                          ? "ring-2 ring-offset-4 shadow-2xl"
                          : isListening
                            ? "ring-1 candidate-avatar-ring-listening"
                            : "ring-1 shadow-lg"
                      }`}
                      style={{
                        ["--tw-ring-color" as string]: isSpeaking
                          ? "hsl(var(--l-accent) / 0.6)"
                          : isListening
                            ? "hsl(160 84% 50% / 0.5)"
                            : "hsl(var(--l-border))",
                        ["--tw-ring-offset-color" as string]: "hsl(var(--l-bg))",
                      } as React.CSSProperties}
                    >
                      <img
                        src={(currentQ as { avatar_image_url?: string | null })?.avatar_image_url || project?.avatar_image_url || defaultAiAvatar}
                        alt={project?.ai_persona_name || "IA"}
                        className={`w-full h-full object-cover bg-muted/30 transition-transform duration-700 ${isSpeaking ? "scale-105" : "scale-100"}`}
                      />
                      {isSpeaking && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6 flex items-end justify-center gap-1.5">
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-7 sm:h-10 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "100ms" }} />
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "200ms" }} />
                          <span className="h-8 sm:h-12 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                          <span className="h-4 sm:h-6 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "400ms" }} />
                        </div>
                      )}
                      <div
                        className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 rounded text-xs font-medium backdrop-blur-md"
                        style={{ background: "hsl(var(--l-bg) / 0.6)", color: "hsl(var(--l-fg))" }}
                      >
                        {project?.ai_persona_name || "Marie"} — IA
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Colonne droite : Question + état + CTA (1/3 desktop) ── */}
              <div className="lg:col-span-1 flex flex-col justify-center gap-4 sm:gap-5">
                {!interviewFinished && (() => {
                  const isLastQ = currentQuestionIndex >= questions.length - 1;
                  const label = isLastQ ? "Terminer la session" : "Passer la question";
                  // Le bouton reste cliquable même pendant une relance IA :
                  // le clic interrompt la TTS en cours et passe à la suite.
                  const disabled = false;
                  // Le passage de question est optionnel côté projet (par défaut activé).
                  // La dernière question reste toujours « terminable » via ce bouton, sinon le candidat est bloqué.
                  const skipAllowed = (project as { allow_skip_question?: boolean })?.allow_skip_question !== false;
                  const showSkip = skipAllowed || isLastQ;
                  return (
                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      {/* Retour vidéo candidat — mobile uniquement, à gauche du bouton « Passer la question », sans actions */}
                      <div className="lg:hidden relative rounded-lg overflow-hidden bg-black border border-emerald-500/40 shadow-md w-[96px] h-[68px] shrink-0">
                        <video
                          ref={setVideoEl}
                          muted
                          playsInline
                          autoPlay
                          className="w-full h-full object-cover"
                          style={{ transform: "scaleX(-1)" }}
                          data-testid="interview-self-video-mobile"
                        />
                        <div
                          className="absolute top-0.5 right-0.5 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1 py-0.5 rounded text-[9px] font-semibold"
                          data-testid="interview-recording-indicator-mobile"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
                        </div>
                      </div>
                      {showSkip && (silenceTier >= 3 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleSkipQuestion}
                          disabled={disabled}
                          className="border-warning text-warning hover:bg-warning/10 animate-pulse"
                        >
                          {label}
                        </Button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSkipQuestion}
                          disabled={disabled}
                          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {/* Question text (for written/audio) */}
                {currentQ && questionType !== "video" && !interviewFinished && (
                  <QuestionMediaPlayer
                    key={`q-audio-${currentQuestionIndex}`}
                    ref={featuredPlayerRef}
                    type={questionType}
                    content={currentQ.content}
                    audioUrl={currentQ.audio_url}
                    variant="featured"
                    autoPlay={shouldAutoPlay}
                    onPlaybackEnd={() => {
                      if (isPausedRef.current) {
                        console.log("[InterviewStart] onPlaybackEnd (audio/text) ignored — paused");
                        return;
                      }
                      console.log("[InterviewStart] onPlaybackEnd (audio/text) fired");
                      forceStartListening();
                    }}
                  />
                )}

                {/* Pour les questions vidéo, on affiche aussi le contenu texte (texte de secours) */}
                {currentQ && questionType === "video" && currentQ.content?.trim() && !interviewFinished && (
                  <div
                    className="rounded-xl border-l-2 border bg-card/80 p-4"
                    style={{ borderLeftColor: "hsl(var(--l-accent))" }}
                  >
                    <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap">
                      {currentQ.content}
                    </p>
                  </div>
                )}

                {/* Message de clôture */}
                {interviewFinished && (
                  <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      Session terminée
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Merci pour vos réponses. Finalisation en cours…
                    </p>
                  </div>
                )}


                {/* Auto-skip countdown */}
                {autoSkipCountdown !== null && (
                  <div className="flex items-center justify-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-warning">{autoSkipCountdown}</span>
                    </div>
                    <span className="text-xs text-warning font-medium">Passage auto dans {autoSkipCountdown}s...</span>
                  </div>
                )}

                {/* Indication candidat */}
                {currentQ?.hint_text?.trim() && (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 flex items-start gap-2">
                    <span aria-hidden="true">💡</span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                      {currentQ.hint_text}
                    </p>
                  </div>
                )}

                {/* Bandeau d'état */}
                {(() => {
                  if (interviewFinished) return null;
                  const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
                  const showBigCta = isListening && !isSpeaking && !isProcessing && !hasVoice;
                  const configuredMax = currentQ?.max_response_seconds as number | null | undefined;
                  const hasTimeLimit = Boolean(configuredMax && configuredMax > 0);
                  const maxSec = Math.min(configuredMax && configuredMax > 0 ? configuredMax : 600, 600);
                  const remaining = Math.max(0, maxSec - responseElapsedSec);
                  const rmm = String(Math.floor(remaining / 60)).padStart(2, "0");
                  const rss = String(remaining % 60).padStart(2, "0");
                  const remainingLabel = `${rmm}:${rss}`;
                  const isCritical = hasTimeLimit && remaining <= 20;
                  const isFinal = hasTimeLimit && remaining <= 10;
                  const TimerBadge = hasTimeLimit ? (
                    <div
                      aria-live={isCritical ? "assertive" : "polite"}
                      aria-label={`Temps restant : ${remaining} secondes`}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 tabular-nums transition-all ${
                        isFinal
                          ? "border-destructive/60 bg-destructive/20 text-destructive text-3xl sm:text-4xl font-black animate-pulse px-4 py-2"
                          : isCritical
                          ? "border-destructive/40 bg-destructive/15 text-destructive text-2xl sm:text-3xl font-bold animate-pulse"
                          : "border-border bg-muted text-foreground text-base sm:text-lg font-bold"
                      }`}
                    >
                      <Clock className={isFinal ? "h-6 w-6" : isCritical ? "h-5 w-5" : "h-4 w-4"} />
                      {remainingLabel}
                    </div>
                  ) : null;

                  if (showBigCta) {
                    return (
                      <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/15 px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className="relative flex h-9 w-9 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40" />
                            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/30">
                              <Mic className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300">
                            🎙️ À vous !
                          </span>
                          {TimerBadge}
                        </div>
                        {currentQuestionIndex < 2 && (
                          <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                            Le bouton apparaîtra dès que je vous entendrai.
                          </p>
                        )}
                      </div>
                    );
                  }

                  // État "listening" : on fusionne le vu-mètre et le bouton dans une seule carte
                  if (isListening && !isProcessing && !isSpeaking && !interviewFinished) {
                    const hasVoice = Boolean(liveTranscript || candidateTranscriptRef.current);
                    return (
                      <div
                        className="rounded-2xl border p-3 sm:p-4 space-y-3 shadow-lg"
                        style={{
                          borderColor: "hsl(var(--l-border))",
                          background: "hsl(var(--l-bg-elev))",
                        }}
                      >
                        <div className="flex items-center justify-center gap-3 py-2">
                          <MicVolumeMeter stream={streamRef.current} active={isListening} />
                          {TimerBadge}
                        </div>
                        <div className="h-px" style={{ background: "hsl(var(--l-border))" }} />
                        <Button
                          className={`w-full h-16 px-6 text-lg sm:text-xl font-semibold rounded-2xl transition-all ${
                            hasVoice
                              ? "candidate-btn-primary hover:scale-[1.02] animate-pulse"
                              : ""
                          }`}
                          style={
                            !hasVoice
                              ? {
                                  background: "hsl(var(--l-bg-elev-2))",
                                  color: "hsl(var(--l-fg) / 0.4)",
                                  cursor: "not-allowed",
                                }
                              : undefined
                          }
                          onClick={handleSendResponse}
                          disabled={!hasVoice}
                        >
                          {hasVoice ? (
                            <span className="inline-flex items-center gap-3">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                                <CheckCircle2 className="!h-5 !w-5" />
                              </span>
                              Ma réponse est terminée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Mic className="!h-5 !w-5" />
                              Parlez pour répondre…
                            </span>
                          )}
                        </Button>
                        {hasVoice && (
                          <p className="hidden sm:block text-xs text-center" style={{ color: "hsl(var(--l-fg) / 0.5)" }}>
                            ou appuyer sur la barre d'espace du clavier
                          </p>
                        )}
                        {currentQuestionIndex < 2 && hasVoice && (
                          <p className="text-[11px] text-muted-foreground text-center inline-flex items-center justify-center gap-1 w-full">
                            <MousePointerClick className="h-3 w-3" />
                            Cliquez dès que vous avez terminé.
                          </p>
                        )}
                      </div>
                    );
                  }


                  if (interviewStuck && !isProcessing && !isSpeaking) {
                    return (
                      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                        <p className="text-sm text-center text-destructive font-medium">
                          L'écoute du micro n'a pas démarré.
                        </p>
                        <div className="flex flex-col gap-2">
                          <Button
                            className="w-full h-12 rounded-xl"
                            onClick={() => {
                              setInterviewStuck(false);
                              startListening();
                            }}
                          >
                            <Mic className="mr-2 h-4 w-4" />
                            Réessayer le micro
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl"
                            onClick={() => {
                              setInterviewStuck(false);
                              handleSkipQuestion();
                            }}
                          >
                            Passer la question
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg border px-3 py-2.5 text-center text-xs sm:text-sm font-medium transition-colors ${
                          isProcessing
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : isSpeaking
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-bounce" style={{ animationDelay: "120ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-bounce" style={{ animationDelay: "240ms" }} />
                          </span>
                        ) : isSpeaking ? (
                          questionType === "video" || questionType === "audio" ? (
                            <span className="inline-flex items-center gap-2">
                              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                              Lecture de la question…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                              L'IA pose la question…
                            </span>
                          )
                        ) : (
                          <span>Préparation…</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* CTA "Terminer la session" si fini */}
                {interviewFinished && (
                  <div className="flex flex-col items-center gap-2">
                    <Button className="w-full h-16 text-lg rounded-2xl" size="lg" variant="destructive" onClick={endInterview}>
                      Terminer la session
                    </Button>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

        {/* ── Footer : progression + actions + retour vidéo ── */}
        {!interviewFinished && (
          <div className="border-t border-border/50 py-3 sm:py-4 lg:py-2 space-y-2 lg:space-y-1.5">
            <div className="flex flex-col items-center gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              {/* Spacer gauche (desktop uniquement) */}
              <div className="hidden lg:block" />
              {/* Actions centrées */}
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEndDialog(true)}
                  className="gap-2 rounded-full px-4 border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
                >
                  <PhoneOff className="h-4 w-4" />
                  Arrêter la session
                </Button>
                {project?.allow_pause && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pauseInterview("manual")}
                    disabled={isSpeaking || isProcessing}
                    title={
                      isSpeaking || isProcessing
                        ? "Disponible pendant votre réponse"
                        : undefined
                    }
                    className="gap-2 rounded-full px-4 border-border/70 text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pause className="h-4 w-4" />
                    Mettre en pause
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (project?.allow_pause) {
                      try { pauseInterview("manual"); } catch { /* noop */ }
                    }
                    setReportMessage("");
                    setShowReportDialog(true);
                  }}
                  className="gap-2 rounded-full px-3 text-muted-foreground/80 hover:text-foreground"
                >
                  <Flag className="h-4 w-4" />
                  Signaler un problème
                </Button>
              </div>
              {/* Retour vidéo : caché sur mobile (rendu plus haut entre avatar et question), visible desktop, sans actions */}
              <div className="hidden lg:flex lg:justify-end items-center">
                <div className="relative rounded-lg overflow-hidden bg-black border border-emerald-500/40 shadow-md w-[100px] h-[72px]">
                  <video
                    ref={setVideoEl}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                    data-testid="interview-self-video"
                  />
                  <div
                    className="absolute top-0.5 right-0.5 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-1 py-0.5 rounded text-[9px] font-semibold"
                    data-testid="interview-recording-indicator"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground animate-pulse" />
                    <span>REC</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NetworkQualityIndicator
                tier={networkTier}
                measuredKbps={measuredKbps}
                effectiveType={effectiveType}
                className="shrink-0"
              />
              <span className="h-3 w-px bg-border/60 shrink-0" aria-hidden="true" />
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground shrink-0" data-testid="interview-current-question-index">
                Question {currentQuestionIndex + 1} / {questions.length}
                {(() => {
                  const n = followUpsByQuestion[currentQuestionIndex] ?? 0;
                  const max = Math.max(
                    0,
                    Number((questions[currentQuestionIndex] as any)?.max_follow_ups ?? 0),
                  );
                  if (n <= 0) return null;
                  return (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                      ↻ Relance {n}{max > 0 ? `/${max}` : ""}
                    </span>
                  );
                })()}
              </span>
              {aiThinking && (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                  L'IA réfléchit…
                </span>
              )}
              {!aiThinking && silenceTier === 1 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground italic">
                  Prenez votre temps…
                </span>
              )}
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}


      <Dialog open={showEndDialog} onOpenChange={(o) => !cancelling && setShowEndDialog(o)}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Arrêter la session ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choisissez ce que vous souhaitez faire de cette session :
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full min-h-[52px] justify-start"
              onClick={() => {
                setShowEndDialog(false);
                endInterview();
              }}
            >
              <Send className="mr-2 h-4 w-4 shrink-0" />
              <span className="text-left">Terminer et envoyer mes réponses</span>
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[52px] justify-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setShowEndDialog(false);
                setShowCancelConfirm(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4 shrink-0" />
              <span className="text-left">Annuler et tout supprimer</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px]"
              onClick={() => setShowEndDialog(false)}
            >
              Continuer la session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={(o) => !reportSending && setShowReportDialog(o)}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              Signaler un problème
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Votre entretien est mis en pause. Décrivez ce qui ne va pas, notre équipe sera prévenue.
          </p>
          <Textarea
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
            placeholder="Ex. Le micro coupe régulièrement, je dois répéter mes réponses…"
            rows={5}
            maxLength={2000}
            disabled={reportSending}
            className="resize-none"
          />
          <div className="text-[11px] text-muted-foreground text-right">
            {reportMessage.trim().length}/2000
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowReportDialog(false)}
              disabled={reportSending}
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                const msg = reportMessage.trim();
                if (msg.length < 5 || !session?.id) return;
                setReportSending(true);
                try {
                  const { error } = await supabase.functions.invoke("report-interview-issue", {
                    body: { sessionId: session.id, message: msg },
                  });
                  if (error) {
                    let detail = "";
                    try {
                      const txt = await error.context?.text?.();
                      if (txt) {
                        try { detail = JSON.parse(txt)?.error || txt; } catch { detail = txt; }
                      }
                    } catch {}
                    console.error("[report-issue] invoke error", error, detail);
                    throw new Error(detail || error.message || "Erreur inconnue");
                  }
                  toast({
                    title: "Signalement envoyé",
                    description: "Notre équipe a été prévenue. Vous pouvez reprendre quand vous le souhaitez.",
                  });
                  setShowReportDialog(false);
                  setReportMessage("");
                } catch (e: any) {
                  console.error("[report-issue] failed", e);
                  toast({
                    variant: "destructive",
                    title: "Envoi impossible",
                    description: e?.message ?? "Veuillez réessayer dans un instant.",
                  });
                } finally {
                  setReportSending(false);
                }
              }}
              disabled={reportSending || reportMessage.trim().length < 5}
              className="gap-2"
            >
              {reportSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelConfirm} onOpenChange={(o) => !cancelling && setShowCancelConfirm(o)}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression totale</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Toutes vos données — vidéo, audio, transcription et analyse — seront définitivement supprimées de nos
            serveurs. Cette action est irréversible.
          </p>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[44px]"
              onClick={() => setShowCancelConfirm(false)}
              disabled={cancelling}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto min-h-[44px]"
              onClick={cancelInterview}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tout supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isPaused && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md"
          style={{ background: "hsl(var(--l-bg) / 0.85)" }}
        >
          <p
            className="mb-4 text-sm font-medium uppercase tracking-widest candidate-gradient-text"
          >
            {networkPauseActive
              ? "Connexion instable"
              : pauseReason === "auto-silence"
                ? "Micro inactif"
                : "En pause"}
          </p>
          {networkPauseActive ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-6 w-6 animate-spin text-warning" />
                <NetworkQualityIndicator
                  tier={networkTier}
                  measuredKbps={measuredKbps}
                  effectiveType={effectiveType}
                />
              </div>
              <p
                className="mt-4 text-sm text-center max-w-sm px-6"
                style={{ color: "hsl(var(--l-fg) / 0.7)" }}
              >
                Votre connexion est trop faible pour poursuivre l'entretien.
                Il reprendra automatiquement dès qu'elle sera stable.
              </p>
              <Button
                variant="outline"
                onClick={resumeInterview}
                className="mt-6 rounded-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Reprendre maintenant
              </Button>
            </>
          ) : pauseReason === "auto-silence" ? (
            <div className="w-full max-w-md px-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "hsl(var(--l-accent) / 0.15)" }}>
                <MicOff className="h-7 w-7" style={{ color: "hsl(var(--l-accent))" }} />
              </div>
              <h2 className="text-center text-lg font-semibold candidate-gradient-text">
                Nous ne vous entendons plus
              </h2>
              <p className="mt-2 text-center text-sm" style={{ color: "hsl(var(--l-fg) / 0.7)" }}>
                Si vous parliez bien, c'est probablement votre micro. Trois choses à vérifier :
              </p>
              <ol className="mt-4 space-y-2 text-sm" style={{ color: "hsl(var(--l-fg) / 0.85)" }}>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "hsl(var(--l-accent))" }}>1.</span>
                  <span>Cliquez sur l'icône <strong>cadenas</strong> dans la barre d'adresse du navigateur et vérifiez que le micro est autorisé.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "hsl(var(--l-accent))" }}>2.</span>
                  <span>Vérifiez que votre micro système n'est pas coupé (touche dédiée du clavier, casque branché).</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold" style={{ color: "hsl(var(--l-accent))" }}>3.</span>
                  <span>Essayez un autre micro ci-dessous, si disponible.</span>
                </li>
              </ol>

              {audioInputs.length >= 2 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium" style={{ color: "hsl(var(--l-fg) / 0.6)" }}>
                    Changer de micro
                  </p>
                  <DeviceSelector
                    devices={audioInputs}
                    value={currentAudioDeviceId}
                    onChange={(id) => { void switchAudioDevice(id); }}
                    placeholder="Choisir un micro"
                    disabled={switchingDevice}
                  />
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={resumeInterview}
                  className="candidate-btn-primary w-full"
                  disabled={switchingDevice}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Reprendre l'entretien
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowReportDialog(true)}
                  className="w-full"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Signaler un problème
                </Button>
              </div>
            </div>
          ) : (

            <>
              <Button
                onClick={resumeInterview}
                className="candidate-btn-primary h-20 px-12 text-xl font-semibold rounded-2xl hover:scale-[1.03] transition-transform"
              >
                <Play className="!h-6 !w-6 mr-3" />
                REPRENDRE
              </Button>
              <p
                className="mt-6 text-sm text-center max-w-sm px-6"
                style={{ color: "hsl(var(--l-fg) / 0.6)" }}
              >
                {pausedDuringQuestionRef.current
                  ? "La question sera rejouée depuis le début à la reprise."
                  : "Cliquez pour reprendre exactement où vous vous êtes arrêté(e)."}
              </p>
            </>
          )}
        </div>
      )}
    </CandidateLayout>
  );
}
