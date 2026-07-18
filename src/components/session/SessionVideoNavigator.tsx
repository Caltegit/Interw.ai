import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Loader2, Pause, Play, RotateCcw, RotateCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMp4Download } from "@/hooks/useMp4Download";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SessionVideoClip {
  url: string;
  audioUrl?: string | null;
  questionLabel: string;
  questionText: string;
  questionTitle?: string | null;
  questionHint?: string | null;
  isFollowUp: boolean;
  messageId?: string;
}

export interface SessionVideoNavigatorHandle {
  /** Joue le clip lié à `messageId`, positionné à `startSeconds - 5s` (≥ 0). Retourne false si aucun clip ne correspond. */
  playMessage: (messageId: string, startSeconds?: number) => boolean;
}

interface Props {
  clips: SessionVideoClip[];
  transcripts?: Record<string, string>;
  /** Cible DOM où afficher le lecteur via portail. Permet de le déplacer entre la position normale et la barre fixe sans démonter `<video>`. */
  portalTarget?: HTMLElement | null;
  /** Mode compact (mini-vidéo dans la barre fixe). */
  compact?: boolean;
  /** ID de la session : si fourni, le téléchargement MP4 s'ouvre dans un nouvel onglet (page d'export dédiée). Sinon, conversion inline. */
  sessionId?: string;
  /** Masque le bouton de téléchargement MP4 (utilisé pour les rapports partagés). */
  hideDownload?: boolean;
}

function formatMinutes(s: number): string {
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}.${sec.toString().padStart(2, "0")}min`;
}

export const SessionVideoNavigator = forwardRef<SessionVideoNavigatorHandle, Props>(function SessionVideoNavigator({ clips, transcripts, portalTarget, compact, sessionId, hideDownload }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { download: downloadMp4, status: dlStatus, progress: dlProgress } = useMp4Download();
  const { toast } = useToast();
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [index, setIndex] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideOverlayTimerRef = useRef<number | null>(null);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const [durationSec, setDurationSec] = useState<number | null>(null);
  // Position en secondes à appliquer au prochain chargement de clip (0 par défaut).
  const pendingSeekRef = useRef<number>(0);
  // Empêche les doubles attaches de timeupdate (inline onLoadedMetadata + effet).
  const fixingDurationRef = useRef(false);
  // Vrai dès que l'utilisateur a explicitement mis en pause (clic Play/Pause natif
  // ou notre overlay). Empêche les `safePlay()` automatiques (filet de sécurité,
  // fixDuration) de redémarrer la vidéo derrière son dos. Reset à chaque changement
  // de clip ou quand l'app déclenche elle-même la lecture.
  const userPausedRef = useRef(false);
  // Diagnostic d'erreur média ; reset à chaque changement de clip.
  const [mediaError, setMediaError] = useState<null | { code: number | null; message: string }>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoverLabel, setRecoverLabel] = useState<string>("");
  // `true` = piste vidéo décodable ; `false` = fichier lisible en audio
  // uniquement (videoWidth === 0 après loadedmetadata) ; `null` = inconnu.
  const [hasVideoTrack, setHasVideoTrack] = useState<boolean | null>(null);
  const [clipUrlOverrides, setClipUrlOverrides] = useState<Record<string, string>>({});
  const getClipUrl = (clip: SessionVideoClip | undefined) => {
    if (!clip) return null;
    const key = clip.messageId ?? clip.url;
    return clipUrlOverrides[key] ?? clip.url;
  };

  useEffect(() => {
    if (index > clips.length - 1) setIndex(0);
  }, [clips.length, index]);

  // Reset l'erreur quand on change de clip (l'erreur précédente ne s'applique plus).
  useEffect(() => {
    setMediaError(null);
  }, [index]);

  // Annule un play() en attente puis pause, sans toucher à currentTime.
  const pauseOnly = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      v.pause();
    } catch {
      /* noop */
    }
  };

  // Coupe proprement la vidéo en cours (annule un play() en attente puis pause + reset à 0).
  // Utilisé uniquement lors d'un changement de clip.
  const stopCurrent = async () => {
    await pauseOnly();
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = 0;
    } catch {
      /* noop */
    }
  };

  const safePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    // Chrome bloque l'autoplay non-mute après un délai depuis le geste utilisateur.
    // On force mute avant play() puis on restaure le son une fois lecture lancée.
    const wasMuted = v.muted;
    v.muted = true;
    try {
      const p = v.play();
      if (p && typeof p.then === "function") {
        playPromiseRef.current = p;
        p.then(() => {
          if (!wasMuted) {
            // Restaure le son après démarrage effectif.
            try {
              v.muted = false;
            } catch {
              /* noop */
            }
          }
        })
          .catch(() => {
            // Si play() échoue, on laisse mute pour éviter un état incohérent.
          })
          .finally(() => {
            playPromiseRef.current = null;
          });
      } else if (!wasMuted) {
        v.muted = false;
      }
    } catch {
      /* noop */
    }
  };

  // Applique le seek en attente, en bornant à la durée connue.
  // Idempotent : ne fait rien si pendingSeekRef est déjà consommé (=0).
  // Évite que deux invocations concurrentes (inline onLoadedMetadata + effet)
  // ne fassent retomber currentTime à 0.
  const applyPendingSeek = (v: HTMLVideoElement, duration: number) => {
    const pending = pendingSeekRef.current;
    if (pending <= 0) return;
    const target = Math.max(0, Math.min(pending, Math.max(0, duration - 0.1)));
    try {
      v.currentTime = target;
    } catch {
      /* noop */
    }
    pendingSeekRef.current = 0;
  };

  // Répare la durée pour les WebM MediaRecorder (duration = Infinity).
  // Protégé contre les doubles invocations dans le même cycle de chargement.
  const fixDuration = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration === Infinity) {
      if (fixingDurationRef.current) return;
      fixingDurationRef.current = true;
      const onTime = () => {
        v.removeEventListener("timeupdate", onTime);
        fixingDurationRef.current = false;
        const real = v.duration;
        const safeDur = Number.isFinite(real) ? real : 0;
        // Après le scrub à 1e9 pour forcer la détection de la durée, la tête
        // de lecture est collée à la fin. On la repositionne explicitement
        // avant tout play(), sinon la vidéo se termine immédiatement et
        // `onEnded` enchaîne au clip suivant (effet « ça saute »).
        const pending = pendingSeekRef.current;
        const target = pending > 0
          ? Math.max(0, Math.min(pending, Math.max(0, safeDur - 0.1)))
          : 0;
        try {
          v.currentTime = target;
        } catch {
          /* noop */
        }
        pendingSeekRef.current = 0;
        if (Number.isFinite(real)) setDurationSec(real);
        if (shouldAutoPlay && !userPausedRef.current) safePlay();
      };
      v.addEventListener("timeupdate", onTime);
      try {
        v.currentTime = 1e9;
      } catch {
        /* noop */
      }
    } else if (Number.isFinite(v.duration)) {
      setDurationSec(v.duration);
    }
  };

  // Charge la source du clip courant et applique seek/autoplay.
  // On ne s'appuie plus sur `key={current.url}` (qui démontait <video>) :
  // l'élément persiste, on pilote `src` + `load()` à la main. Ainsi le
  // cleanup ne pause plus accidentellement le nouvel élément monté.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const targetUrl = getClipUrl(clips[index]);
    if (!targetUrl) return;
    setDurationSec(null);
    fixingDurationRef.current = false;
    userPausedRef.current = false;
    setMediaError(null);

    // (Re)charge la source seulement si elle a changé pour éviter de couper
    // une lecture en cours sur le même clip.
    const resolve = (u: string) => {
      try { return new URL(u, window.location.href).toString(); }
      catch { return u; }
    };
    const currentSrc = resolve(v.currentSrc || v.src || "");
    const desiredSrc = resolve(targetUrl);
    const needsLoad = currentSrc !== desiredSrc;
    if (needsLoad) {
      try { v.pause(); } catch { /* noop */ }
      try {
        v.src = targetUrl;
        v.load();
      } catch (err) {
        console.warn("[SessionVideoNavigator] échec set src", { index, targetUrl, err });
      }
    }

    let cancelled = false;
    let safety: number | null = null;
    const apply = () => {
      if (cancelled) return;
      if (safety !== null) {
        window.clearTimeout(safety);
        safety = null;
      }
      try { v.playbackRate = rateRef.current; } catch { /* noop */ }
      if (v.duration === Infinity) {
        fixDuration();
      } else {
        applyPendingSeek(v, Number.isFinite(v.duration) ? v.duration : 0);
        if (Number.isFinite(v.duration)) setDurationSec(v.duration);
        if (shouldAutoPlay && !userPausedRef.current) safePlay();
      }
    };

    if (v.readyState >= 1 && !needsLoad) {
      apply();
      return () => { cancelled = true; };
    }

    v.addEventListener("loadedmetadata", apply, { once: true });
    // Filet de sécurité : si loadedmetadata n'arrive jamais, on tente
    // quand même un play après 4s — l'erreur média s'affichera via onError.
    safety = window.setTimeout(() => {
      if (cancelled) return;
      if (shouldAutoPlay && v.paused && !userPausedRef.current) {
        console.warn("[SessionVideoNavigator] loadedmetadata timeout, tentative play", { index, targetUrl });
        safePlay();
      }
    }, 4000);
    return () => {
      cancelled = true;
      if (safety !== null) window.clearTimeout(safety);
      v.removeEventListener("loadedmetadata", apply);
    };
  }, [index, shouldAutoPlay, clips, clipUrlOverrides]);

  // Vitesse appliquée à chaud sans toucher à currentTime
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  }, [rate]);

  // Sync état play/pause avec l'élément vidéo natif (pour l'overlay custom).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setIsPlaying(true);
      userPausedRef.current = false;
      // En lecture : masquer l'overlay après un court délai.
      if (hideOverlayTimerRef.current) window.clearTimeout(hideOverlayTimerRef.current);
      hideOverlayTimerRef.current = window.setTimeout(() => setOverlayVisible(false), 1200);
    };
    const onPause = () => {
      setIsPlaying(false);
      setOverlayVisible(true);
      // Pause venant de l'élément vidéo (clic utilisateur sur les contrôles natifs
      // ou notre overlay). On marque l'intention pour bloquer les `safePlay()`
      // automatiques. Si l'app reprend la lecture (toggle/playMessage), `onPlay`
      // remettra ce drapeau à `false`.
      if (!v.ended) userPausedRef.current = true;
      if (hideOverlayTimerRef.current) {
        window.clearTimeout(hideOverlayTimerRef.current);
        hideOverlayTimerRef.current = null;
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setOverlayVisible(true);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [index]);

  const showOverlayTemporarily = () => {
    setOverlayVisible(true);
    if (hideOverlayTimerRef.current) window.clearTimeout(hideOverlayTimerRef.current);
    if (isPlaying) {
      hideOverlayTimerRef.current = window.setTimeout(() => setOverlayVisible(false), 1500);
    }
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    // Si la source DOM ne correspond plus au clip courant (cas de désync
    // après un changement d'index rapide), on resynchronise avant de jouer.
    const want = getClipUrl(clips[index]);
    if (want) {
      const resolve = (u: string) => { try { return new URL(u, window.location.href).toString(); } catch { return u; } };
      if (resolve(v.currentSrc || v.src || "") !== resolve(want)) {
        console.warn("[SessionVideoNavigator] source désync au clic Play, resync", { index, want });
        try { v.src = want; v.load(); } catch { /* noop */ }
        setShouldAutoPlay(true);
        return;
      }
    }
    if (v.paused) {
      safePlay();
    } else {
      pauseOnly();
    }
  };


  useImperativeHandle(
    ref,
    () => ({
      playMessage: (messageId, startSeconds) => {
        const i = clips.findIndex((c) => c.messageId === messageId);
        if (i === -1) {
          console.warn("[SessionVideoNavigator] clip introuvable pour messageId", {
            messageId,
            availableMessageIds: clips.map((clip) => clip.messageId).filter(Boolean),
          });
          return false;
        }
        // Marge adaptative : ~15 % du timestamp, bornée entre 0,5 s et 3 s.
        const raw = Math.max(0, startSeconds ?? 0);
        const margin = Math.min(3, Math.max(0.5, raw * 0.15));
        const seek = Math.max(0, raw - margin);
        if (i === index) {
          // Même clip : pause sans reset, puis seek + play.
          pauseOnly().then(() => {
            const v = videoRef.current;
            if (!v) return;
            const dur = v.duration;
            if (!Number.isFinite(dur) || dur <= 0) {
              // Durée pas encore connue (WebM Infinity) : passe par le mécanisme
              // pendingSeekRef + fixDuration, qui seek puis play après timeupdate.
              pendingSeekRef.current = seek;
              setShouldAutoPlay(true);
              fixDuration();
              return;
            }
            const target = Math.min(seek, Math.max(0, dur - 0.1));
            try {
              v.currentTime = target;
            } catch {
              /* noop */
            }
            safePlay();
          });
        } else {
          // Autre clip : on charge, l'effet de chargement appliquera pendingSeekRef.
          pendingSeekRef.current = seek;
          stopCurrent().then(() => {
            setShouldAutoPlay(true);
            setIndex(i);
          });
        }
        return true;
      },
    }),
    [clips, index, durationSec, clipUrlOverrides],
  );

  // Conteneur DOM stable créé une seule fois. On le déplace via `appendChild`
  // entre la position « normale » et la barre fixe pour préserver l'élément
  // `<video>` (pas de démontage React → la lecture continue).
  const stableHostRef = useRef<HTMLDivElement | null>(null);
  if (stableHostRef.current === null && typeof document !== "undefined") {
    const el = document.createElement("div");
    el.style.height = "100%";
    el.style.width = "100%";
    stableHostRef.current = el;
  }
  useLayoutEffect(() => {
    const host = stableHostRef.current;
    if (!host || !portalTarget) return;
    portalTarget.appendChild(host);
    return () => {
      if (host.parentElement === portalTarget) {
        portalTarget.removeChild(host);
      }
    };
  }, [portalTarget]);

  if (!clips || clips.length === 0) return null;

  const current = clips[index];
  const clipKey = current.messageId ?? current.url;
  const currentUrl = clipUrlOverrides[clipKey] ?? current.url;
  const buildAltUrl = (url: string) => {
    if (/\.webm(\?.*)?$/i.test(url)) return url.replace(/\.webm(\?.*)?$/i, ".mp4$1");
    if (/\.mp4(\?.*)?$/i.test(url)) return url.replace(/\.mp4(\?.*)?$/i, ".webm$1");
    return null;
  };
  const swapClipUrl = (nextUrl: string) => {
    setClipUrlOverrides((prev) => (prev[clipKey] === nextUrl ? prev : { ...prev, [clipKey]: nextUrl }));
  };

  // Parse `interviews/{sessionId}/q{N}.webm` pour pouvoir relancer la
  // récupération côté serveur sur ce clip précis.
  const parsedRecover = (() => {
    if (!currentUrl) return null;
    const m = currentUrl.match(/\/interviews\/([0-9a-f-]+)\/q(\d+)\.(?:webm|mp4)(?:\?.*)?$/i);
    if (!m) return null;
    return { sessionId: m[1], questionIndex: parseInt(m[2], 10) };
  })();
  const canRecover = !!parsedRecover;

  const handleRecover = async () => {
    if (!parsedRecover || recovering) return;
    setRecovering(true);
    toast({
      title: "Réparation en cours…",
      description: "Reconstruction du fichier vidéo. Cela peut prendre quelques secondes.",
    });
    try {
      const { data, error } = await supabase.functions.invoke("recover-session-video", {
        body: {
          session_id: parsedRecover.sessionId,
          question_index: parsedRecover.questionIndex,
          sync: true,
          // Forcer la reconstruction depuis les chunks : si le RH a cliqué sur
          // "Réparer", c'est que le fichier final est cassé même si son header
          // semble valide. On ne retombe plus sur le "skip" trompeur.
          force: true,
        },
      });
      if (error) throw error;
      const mode = (data as { mode?: string } | null)?.mode;
      toast({
        title: mode === "skip" ? "Vidéo déjà valide" : "Réparation terminée",
        description: mode === "skip" ? "Le fichier semble déjà sain ; rechargement du lecteur." : "Tentative de rechargement du lecteur.",
      });
      setMediaError(null);
      const v = videoRef.current;
      if (v) {
        const repairedPath = (data as { path?: string } | null)?.path ?? null;
        const repairedUrl = repairedPath
          ? supabase.storage.from("media").getPublicUrl(repairedPath).data.publicUrl
          : currentUrl;
        const u = new URL(repairedUrl, window.location.href);
        u.searchParams.set("v", String(Date.now()));
        swapClipUrl(u.toString());
        v.src = u.toString();
        try { v.load(); } catch { /* noop */ }
      }
      console.log("recover-session-video result:", data);
    } catch (e: any) {
      toast({
        title: "Réparation impossible",
        description: e?.message ?? "Le fichier n'a pas pu être récupéré.",
        variant: "destructive",
      });
    } finally {
      setRecovering(false);
    }
  };

  const goTo = async (newIndex: number, autoplay: boolean) => {
    if (newIndex === index) return;
    await stopCurrent();
    setShouldAutoPlay(autoplay);
    setIndex(newIndex);
  };

  const prev = () => goTo(Math.max(0, index - 1), true);
  const next = () => goTo(Math.min(clips.length - 1, index + 1), true);

  const handleEnded = () => {
    if (index < clips.length - 1) {
      goTo(index + 1, true);
    }
  };

  const content = (
    <Card className={cn(compact && "border-primary/30 shadow-md")}>
      <CardContent
        className={cn(
          compact ? "space-y-1 p-1.5" : "space-y-1.5 px-3 pb-3 pt-3",
        )}
      >
        <div
          className="group relative overflow-hidden rounded-lg bg-black aspect-video"
          onMouseMove={!compact ? showOverlayTemporarily : undefined}
          onMouseLeave={!compact && isPlaying ? () => setOverlayVisible(false) : undefined}
        >
          <video
            ref={videoRef}
            controls
            controlsList="nodownload"
            disablePictureInPicture={false}
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d)) setDurationSec(d);
              else if (d === Infinity) fixDuration();
              setMediaError(null);
            }}
            onError={(e) => {
              const err = e.currentTarget.error;
              const codeMap: Record<number, string> = {
                1: "Lecture interrompue.",
                2: "Réseau indisponible pour charger la vidéo.",
                3: "Fichier vidéo corrompu ou non décodable.",
                4: "Fichier vidéo introuvable ou bloqué par le navigateur.",
              };
              const code = err?.code ?? null;
              const fallback = (code && codeMap[code]) || "Vidéo indisponible.";
              console.warn("[SessionVideoNavigator] erreur média", { index, url: currentUrl, code, message: fallback });
              setMediaError({ code, message: fallback });
              setIsPlaying(false);
              setOverlayVisible(true);

              // Si code = 4 (source not supported / introuvable), on vérifie
              // réellement l'existence du fichier via HEAD. Ça évite le message
              // trompeur "introuvable" quand le fichier est en fait présent
              // mais non décodable par ce navigateur.
              if (code === 4 && currentUrl) {
                fetch(currentUrl, { method: "HEAD" })
                  .then((res) => {
                    if (res.ok) {
                      setMediaError({
                        code: 3,
                        message:
                          "Vidéo présente mais non décodable par ce navigateur. Essayez Chrome ou Firefox, ou téléchargez en MP4.",
                      });
                    } else if (res.status === 404) {
                      const altUrl = buildAltUrl(currentUrl);
                      if (!altUrl) {
                        setMediaError({ code: 4, message: "Fichier vidéo introuvable sur le serveur." });
                        return;
                      }
                      fetch(altUrl, { method: "HEAD" })
                        .then((altRes) => {
                          if (!altRes.ok) {
                            setMediaError({ code: 4, message: "Fichier vidéo introuvable sur le serveur." });
                            return;
                          }
                          const withBust = new URL(altUrl, window.location.href);
                          withBust.searchParams.set("v", String(Date.now()));
                          swapClipUrl(withBust.toString());
                          setMediaError(null);
                          const video = videoRef.current;
                          if (!video) return;
                          video.src = withBust.toString();
                          try { video.load(); } catch { /* noop */ }
                        })
                        .catch(() => {
                          setMediaError({ code: 4, message: "Fichier vidéo introuvable sur le serveur." });
                        });
                    }
                  })
                  .catch(() => { /* on garde le message fallback */ });
              }
            }}
            onEnded={handleEnded}
            className="h-full w-full object-contain"
          />
          {mediaError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 px-4 text-center text-white">
              <p className="text-sm font-medium">
                {current.audioUrl
                  ? "Vidéo indisponible — lecture audio uniquement"
                  : mediaError.message}
              </p>
              <p className="text-xs text-white/70">
                {current.questionLabel}
                {(() => {
                  const label = current.questionHint?.trim() || current.questionTitle?.trim() || current.questionText;
                  return label ? ` — ${label}` : "";
                })()}
              </p>
              {current.audioUrl && (
                <audio
                  src={current.audioUrl}
                  controls
                  autoPlay
                  className="mt-1 w-full max-w-md"
                />
              )}
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaError(null);
                    const v = videoRef.current;
                    if (!v) return;
                    try { v.load(); } catch { /* noop */ }
                  }}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
                >
                  Réessayer la vidéo
                </button>
                {canRecover && (
                  <button
                    type="button"
                    onClick={handleRecover}
                    disabled={recovering}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20 disabled:opacity-60"
                  >
                    {recovering ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wrench className="h-3 w-3" />
                    )}
                    Réparer la vidéo
                  </button>
                )}
              </div>
              {current.messageId && transcripts?.[current.messageId] && (
                <p className="mt-2 max-h-24 overflow-auto px-2 text-left text-xs italic text-white/80">
                  « {transcripts[current.messageId]} »
                </p>
              )}
            </div>
          )}
          {!compact && (
            <button
              type="button"
              aria-label={isPlaying ? "Mettre en pause" : "Lire"}
              onClick={togglePlayPause}
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                "flex h-20 w-20 items-center justify-center rounded-full",
                "bg-black/50 text-white backdrop-blur-sm transition-opacity duration-200",
                "hover:bg-black/70",
                overlayVisible ? "opacity-90" : "opacity-0 pointer-events-none",
              )}
            >
              {isPlaying ? (
                <Pause className="h-9 w-9" fill="currentColor" />
              ) : (
                <Play className="h-9 w-9 translate-x-[2px]" fill="currentColor" />
              )}
            </button>
          )}
          {!compact && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center gap-2">
                <button
                  type="button"
                  aria-label="Reculer de 10 secondes"
                  disabled={durationSec === null}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.currentTime = Math.max(0, v.currentTime - 10);
                  }}
                  className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  10s
                </button>
                <button
                  type="button"
                  aria-label="Avancer de 10 secondes"
                  disabled={durationSec === null}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    const d = Number.isFinite(v.duration) ? v.duration : (durationSec ?? 0);
                    v.currentTime = Math.min(Math.max(0, d - 0.1), v.currentTime + 10);
                  }}
                  className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
                >
                  10s
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-[2px]">
                {[2, 1.5, 1].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={`pointer-events-auto inline-flex h-[25px] w-[32px] items-center justify-center rounded-full text-[11px] font-medium transition-opacity ${
                      rate === r
                        ? "bg-white text-black opacity-100"
                        : "bg-black/50 text-white opacity-80 hover:opacity-100"
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
              {!hideDownload && (
                <div className="pointer-events-none absolute top-2 right-2">
                  <button
                    type="button"
                    aria-label="Télécharger en MP4"
                    disabled={dlStatus === "downloading" || dlStatus === "converting"}
                    onClick={async () => {
                      const safe = (current.questionText || `question-${index + 1}`)
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || `question-${index + 1}`;
                      const filename = `entretien-${String(index + 1).padStart(2, "0")}-${safe}.mp4`;
                      if (sessionId) {
                        const url = `/sessions/${sessionId}/export?question=${index + 1}`;
                        window.open(url, "_blank", "noopener");
                        return;
                      }
                      try {
                        await downloadMp4(currentUrl, filename);
                      } catch (err) {
                        toast({
                          title: "Téléchargement impossible",
                          description: (err as Error)?.message || "Réessayez plus tard.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-60 transition-opacity"
                  >
                    {!sessionId && (dlStatus === "downloading" || dlStatus === "converting") ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {Math.round(dlProgress)}%
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        MP4
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
          {!compact && (() => {
            const raw = (current.questionTitle ?? "").trim();
            const display = raw.length > 30 ? raw.slice(0, 30).trimEnd() + "…" : raw;
            if (!display) return null;
            return (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2 opacity-100 transition-opacity duration-200 group-hover:opacity-0">
                <span className="truncate text-xs font-medium text-white drop-shadow">{display}</span>
              </div>
            );
          })()}
        </div>

        {!compact && current.isFollowUp && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              Relance
            </Badge>
          </div>
        )}

        <div className={cn("grid items-center", compact ? "grid-cols-[auto_1fr_auto] gap-1" : "grid-cols-3")}>
          <div className="justify-self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-6 text-xs", compact ? "px-1" : "px-2")}
              onClick={prev}
              disabled={index === 0}
            >
              <ChevronLeft className={cn("h-3 w-3", compact ? "" : "mr-1")} />
              {!compact && "Préc"}
            </Button>
          </div>
          <div className="justify-self-center">
            <Select
              value={String(index)}
              onValueChange={(v) => goTo(Number(v), true)}
            >
              <SelectTrigger className="h-6 w-auto gap-1 border-none px-1 text-xs font-semibold shadow-none focus:ring-0">
                <SelectValue>
                  Question {index + 1}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-[56rem] max-w-[90vw]">
                {clips.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium shrink-0">Question {i + 1}</span>
                      <span className="truncate text-muted-foreground">— {c.questionHint?.trim() || c.questionTitle?.trim() || c.questionText}</span>
                      {c.isFollowUp && (
                        <Badge variant="outline" className="ml-1 text-[10px] shrink-0">
                          Relance
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="justify-self-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-6 text-xs", compact ? "px-1" : "px-2")}
              onClick={next}
              disabled={index === clips.length - 1}
            >
              {!compact && "Suiv"}
              <ChevronRight className={cn("h-3 w-3", compact ? "" : "ml-1")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!stableHostRef.current) return null;
  return createPortal(content, stableHostRef.current);
});
