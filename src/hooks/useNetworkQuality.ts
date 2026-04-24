import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useNetworkQuality
 *
 * Combine deux signaux pour estimer la qualité réseau :
 *  1. `navigator.connection` (Chrome / Android) — `effectiveType` + `downlink`.
 *  2. Mesures runtime des appels TTS (octets reçus / durée) — EWMA pour lisser.
 *
 * Renvoie un `tier`:
 *  - "good"     : > 1.5 Mbps               → relances normales
 *  - "degraded" : 0.5 – 1.5 Mbps           → 1 relance max
 *  - "poor"     : < 0.5 Mbps ou 2g/slow-2g → aucune relance
 *
 * Le helper `recordTtsTiming(bytes, ms)` permet de nourrir l'EWMA après chaque
 * appel TTS réussi.
 */
export type NetworkTier = "good" | "degraded" | "poor";

interface NetworkQualityState {
  tier: NetworkTier;
  measuredKbps: number | null;
  effectiveType: string | null;
}

const EWMA_ALPHA = 0.4; // Poids des nouvelles mesures (réactif).

function tierFromKbps(kbps: number | null, effectiveType: string | null): NetworkTier {
  if (effectiveType === "2g" || effectiveType === "slow-2g") return "poor";
  if (kbps == null) {
    // Pas de mesure : on se fie à effectiveType.
    if (effectiveType === "3g") return "degraded";
    return "good";
  }
  if (kbps < 500) return "poor";
  if (kbps < 1500) return "degraded";
  return "good";
}

export function useNetworkQuality() {
  const ewmaRef = useRef<number | null>(null);
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
      const downlinkMbps: number | null =
        typeof conn.downlink === "number" ? conn.downlink : null;
      const downlinkKbps = downlinkMbps != null ? downlinkMbps * 1000 : null;

      // Initialise l'EWMA avec la valeur de l'API si on n'a encore aucune mesure.
      if (ewmaRef.current == null && downlinkKbps != null) {
        ewmaRef.current = downlinkKbps;
      }

      setState((prev) => ({
        tier: tierFromKbps(ewmaRef.current ?? downlinkKbps, effectiveType),
        measuredKbps: ewmaRef.current ?? downlinkKbps,
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
    // kbps = (bytes * 8 / 1000) / (ms / 1000) = bytes * 8 / ms
    const kbps = (bytes * 8) / ms;
    const prev = ewmaRef.current;
    const next = prev == null ? kbps : prev * (1 - EWMA_ALPHA) + kbps * EWMA_ALPHA;
    ewmaRef.current = next;

    const conn: any =
      typeof navigator !== "undefined" ? (navigator as any).connection : null;
    const effectiveType: string | null = conn?.effectiveType ?? null;
    setState({
      tier: tierFromKbps(next, effectiveType),
      measuredKbps: next,
      effectiveType,
    });
  }, []);

  // Helper pour obtenir le plafond de relances selon le tier.
  // 0 = aucune relance, 1 = max 1, undefined = pas d'override.
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
