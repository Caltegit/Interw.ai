import { useEffect, useState } from "react";

interface AudioDebugPanelProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioBlocked: boolean;
}

interface Snapshot {
  hasInstance: boolean;
  paused: boolean;
  currentTime: number;
  duration: number;
  readyState: number;
  networkState: number;
  src: string;
  muted: boolean;
  volume: number;
  ended: boolean;
}

const READY_STATE_LABEL = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT", "HAVE_FUTURE", "HAVE_ENOUGH"];
const NETWORK_STATE_LABEL = ["EMPTY", "IDLE", "LOADING", "NO_SOURCE"];

/**
 * Panneau de diagnostic affiché en bas à droite quand l'URL contient
 * ?debug=audio. Permet de vérifier en direct l'état de l'instance Audio
 * principale (utile pour déboguer iOS Safari).
 */
export default function AudioDebugPanel({ audioRef, audioBlocked }: AudioDebugPanelProps) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ua] = useState(() => (typeof navigator !== "undefined" ? navigator.userAgent : ""));

  useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (!a) {
        setSnap({
          hasInstance: false,
          paused: true,
          currentTime: 0,
          duration: 0,
          readyState: 0,
          networkState: 0,
          src: "",
          muted: false,
          volume: 1,
          ended: false,
        });
        return;
      }
      setSnap({
        hasInstance: true,
        paused: a.paused,
        currentTime: a.currentTime,
        duration: isFinite(a.duration) ? a.duration : 0,
        readyState: a.readyState,
        networkState: a.networkState,
        src: a.currentSrc || a.src || "",
        muted: a.muted,
        volume: a.volume,
        ended: a.ended,
      });
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [audioRef]);

  if (!snap) return null;

  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const srcShort = snap.src ? snap.src.slice(0, 40) + (snap.src.length > 40 ? "…" : "") : "(aucune)";

  return (
    <div
      className="fixed bottom-2 right-2 z-[110] rounded-lg border text-xs font-mono shadow-xl"
      style={{
        background: "hsl(var(--l-bg) / 0.95)",
        borderColor: "hsl(var(--l-fg) / 0.2)",
        color: "hsl(var(--l-fg))",
        maxWidth: collapsed ? 140 : 280,
      }}
      data-testid="audio-debug-panel"
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1 border-b"
        style={{ borderColor: "hsl(var(--l-fg) / 0.15)" }}
      >
        <span className="font-semibold">Audio debug</span>
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: audioBlocked
              ? "hsl(0 84% 60%)"
              : !snap.hasInstance
                ? "hsl(var(--l-fg) / 0.4)"
                : snap.paused
                  ? "hsl(45 93% 55%)"
                  : "hsl(142 71% 45%)",
          }}
        />
      </button>
      {!collapsed && (
        <div className="space-y-0.5 p-2">
          <div>iOS : <b>{isIOS ? "oui" : "non"}</b></div>
          <div>Instance : <b>{snap.hasInstance ? "OK" : "—"}</b></div>
          <div>État : <b>{audioBlocked ? "BLOQUÉ" : snap.paused ? "pause" : "lecture"}</b></div>
          <div>currentTime : <b>{snap.currentTime.toFixed(2)}s</b></div>
          <div>duration : <b>{snap.duration ? snap.duration.toFixed(2) + "s" : "—"}</b></div>
          <div>ended : <b>{snap.ended ? "oui" : "non"}</b></div>
          <div>readyState : <b>{snap.readyState}</b> ({READY_STATE_LABEL[snap.readyState] ?? "?"})</div>
          <div>networkState : <b>{snap.networkState}</b> ({NETWORK_STATE_LABEL[snap.networkState] ?? "?"})</div>
          <div>volume : <b>{snap.volume.toFixed(2)}</b>{snap.muted ? " (muted)" : ""}</div>
          <div className="break-all opacity-70">src : {srcShort}</div>
        </div>
      )}
    </div>
  );
}
