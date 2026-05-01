import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useNetworkQuality
 *
 * Combine deux signaux pour estimer la qualité réseau :
 *  1. `navigator.connection` (Chrome / Android) — `effectiveType` + `downlink`.
 *  2. Mesures runtime des appels TTS (octets reçus / durée) — EWMA pour lisser.
 *
 * Renvoie un `tier`:
 *  - "good"     : > 600 kbps                → relances normales
 *  - "degraded" : 150 – 600 kbps            → 1 relance max
 *  - "poor"     : < 150 kbps soutenus, ou 2g/slow-2g → aucune relance
 *
 * Stratégie anti-faux-positifs :
 *  - Le premier appel TTS est ignoré (cold-start ElevenLabs).
 *  - Il faut au moins 3 échantillons avant de pouvoir dégrader le tier.
 *  - Le passage en "poor" exige 2 mesures consécutives sous le seuil.
 *  - EWMA très lissée (alpha = 0.15) pour absorber les pics ponctuels.
 */
export type NetworkTier = "good" | "degraded" | "poor";

interface NetworkQualityState {
  tier: NetworkTier;
  measuredKbps: number | null;
  effectiveType: string | null;
}

const EWMA_ALPHA = 0.15;
const MIN_SAMPLES_BEFORE_DOWNGRADE = 3;
const POOR_THRESHOLD_KBPS = 150;
const DEGRADED_THRESHOLD_KBPS = 600;

function rawTierFromKbps(kbps: number | null, effectiveType: string | null): NetworkTier {
  if (effectiveType === "2g" || effectiveType === "slow-2g") return "poor";
  if (kbps == null) {
    if (effectiveType === "3g") return "degraded";
    return "good";
  }
  if (kbps < POOR_THRESHOLD_KBPS) return "poor";
  if (kbps < DEGRADED_THRESHOLD_KBPS) return "degraded";
  return "good";
}

export function useNetworkQuality() {
  const ewmaRef = useRef<number | null>(null);
  const samplesCountRef = useRef<number>(0);
  const consecutiveLowRef = useRef<number>(0);
  const [state, setState] = useState<NetworkQualityState>({
    tier: "good",
    measuredKbps: null,
    effectiveType: null,
  });

  // Lecture initiale + écoute des changements de l'API connection.
  useEffect(() => {
    const conn: any =
      typeof navigator !== "undefined" ? (navigator as any).connection : null;
    if (!conn) return;

    const refresh = () => {
      const effectiveType: string | null = conn.effectiveType ?? null;
      // On ne dérive plus de tier mesuré depuis navigator.connection (downlink
      // est une estimation très optimiste). On garde uniquement effectiveType
      // comme garde-fou pour 2g/slow-2g.
      setState((prev) => ({
        tier: resolveTier(ewmaRef.current, effectiveType, samplesCountRef.current, consecutiveLowRef.current),
        measuredKbps: ewmaRef.current,
        effectiveType,
      }));
    };

    refresh();
    try {
      conn.addEventListener?.("change", refresh);
    } catch {}
    return () => {
      try {
        conn.removeEventListener?.("change", refresh);
      } catch {}
    };
  }, []);

  const recordTtsTiming = useCallback((bytes: number, ms: number) => {
    if (!Number.isFinite(bytes) || !Number.isFinite(ms) || bytes <= 0 || ms <= 0) {
      return;
    }
    samplesCountRef.current += 1;

    // Cold-start ElevenLabs : le premier appel n'alimente pas la moyenne.
    if (samplesCountRef.current === 1) {
      return;
    }

    const kbps = (bytes * 8) / ms;
    const prev = ewmaRef.current;
    const next = prev == null ? kbps : prev * (1 - EWMA_ALPHA) + kbps * EWMA_ALPHA;
    ewmaRef.current = next;

    if (kbps < POOR_THRESHOLD_KBPS) {
      consecutiveLowRef.current += 1;
    } else {
      consecutiveLowRef.current = 0;
    }

    const conn: any =
      typeof navigator !== "undefined" ? (navigator as any).connection : null;
    const effectiveType: string | null = conn?.effectiveType ?? null;
    setState({
      tier: resolveTier(next, effectiveType, samplesCountRef.current, consecutiveLowRef.current),
      measuredKbps: next,
      effectiveType,
    });
  }, []);

  const getForceMaxFollowUps = useCallback((): number | undefined => {
    switch (state.tier) {
      case "poor":
        return 0;
      case "degraded":
        return 1;
      default:
        return undefined;
    }
  }, [state.tier]);

  return {
    tier: state.tier,
    measuredKbps: state.measuredKbps,
    effectiveType: state.effectiveType,
    recordTtsTiming,
    getForceMaxFollowUps,
  };
}

/**
 * Résout le tier final en appliquant les règles anti-faux-positifs :
 *  - 2g/slow-2g => "poor" sans condition (priorité au signal navigateur).
 *  - Moins de 3 échantillons mesurés => on reste "good" (sauf 2g).
 *  - "poor" requiert 2 mesures consécutives sous le seuil (sinon "degraded" max).
 */
function resolveTier(
  kbps: number | null,
  effectiveType: string | null,
  samplesCount: number,
  consecutiveLow: number,
): NetworkTier {
  if (effectiveType === "2g" || effectiveType === "slow-2g") return "poor";

  if (samplesCount < MIN_SAMPLES_BEFORE_DOWNGRADE) {
    return "good";
  }

  const raw = rawTierFromKbps(kbps, effectiveType);
  if (raw === "poor" && consecutiveLow < 2) {
    return "degraded";
  }
  return raw;
}
