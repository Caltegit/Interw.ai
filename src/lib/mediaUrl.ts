import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET = "media";

/**
 * Adresse publique d'un fichier « vitrine » (logo, avatar, vidéo de question,
 * page publique). Le stockage étant privé, ces fichiers sont servis par le
 * serveur, qui n'autorise qu'une liste stricte de dossiers.
 */
export function publicAssetUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${SUPABASE_URL}/functions/v1/public-asset/${clean
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Extrait le chemin de stockage d'une adresse (absolue, signée ou déjà chemin). */
export function toStoragePath(input?: string | null): string | null {
  if (!input) return null;
  let path = String(input).trim();
  for (const marker of [
    `/object/public/${BUCKET}/`,
    `/object/sign/${BUCKET}/`,
    `/functions/v1/public-asset/`,
  ]) {
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      path = path.slice(idx + marker.length);
      break;
    }
  }
  path = path.split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* déjà décodé */
  }
  path = path.replace(/^\/+/, "");
  if (!path || path.includes("..")) return null;
  return path;
}

/** Vrai si l'adresse pointe vers un enregistrement d'entretien (accès restreint). */
export function isInterviewMedia(input?: string | null): boolean {
  const p = toStoragePath(input);
  return !!p && p.startsWith("interviews/");
}

interface CacheEntry {
  url: string;
  expiresAt: number;
}

interface ResolveOptions {
  forceRefresh?: boolean;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Résout une adresse d'enregistrement d'entretien en lien temporaire signé.
 * Les autres adresses sont renvoyées telles quelles.
 */
export async function resolveMediaUrl(
  input?: string | null,
  candidateToken?: string | null,
  options: ResolveOptions = {},
): Promise<string | null> {
  if (!input) return null;
  if (!isInterviewMedia(input)) return input;
  // Les rapports partagés reçoivent déjà une adresse signée de leur fonction
  // d'autorisation. Ne pas tenter de la signer à nouveau sans session utilisateur.
  if (input.includes(`/object/sign/${BUCKET}/`) && !options.forceRefresh) return input;
  const path = toStoragePath(input);
  if (!path) return null;
  const key = `${path}|${candidateToken ?? ""}`;

  if (options.forceRefresh) cache.delete(key);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase.functions.invoke("get-interview-media-url", {
      body: { path, token: candidateToken ?? undefined },
    });
    if (error || !data?.url) return null;
    const expiresIn = typeof data.expiresIn === "number" ? data.expiresIn : 3600;
    cache.set(key, { url: data.url as string, expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000 });
    return data.url as string;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export function invalidateMediaUrl(input?: string | null, candidateToken?: string | null) {
  const path = toStoragePath(input);
  if (path) cache.delete(`${path}|${candidateToken ?? ""}`);
}

/** Résout plusieurs adresses d'une même session en un seul appel. */
export async function resolveMediaUrls(
  inputs: Array<string | null | undefined>,
  candidateToken?: string | null,
): Promise<Record<string, string>> {
  const paths = Array.from(
    new Set(
      inputs
        .filter((u) => isInterviewMedia(u))
        .map((u) => toStoragePath(u)!)
        .filter(Boolean),
    ),
  );
  if (paths.length === 0) return {};

  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    const hit = cache.get(`${p}|${candidateToken ?? ""}`);
    if (hit && hit.expiresAt > Date.now()) result[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length === 0) return result;

  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    const { data, error } = await supabase.functions.invoke("get-interview-media-url", {
      body: { paths: chunk, token: candidateToken ?? undefined },
    });
    if (error || !data?.urls) continue;
    for (const [path, url] of Object.entries(data.urls as Record<string, string>)) {
      cache.set(`${path}|${candidateToken ?? ""}`, {
        url,
        expiresAt: Date.now() + 50 * 60 * 1000,
      });
      result[path] = url;
    }
  }
  return result;
}

/** Hook : renvoie l'adresse lisible d'un enregistrement (ou null en attente). */
export function useMediaUrl(input?: string | null, candidateToken?: string | null) {
  const [url, setUrl] = useState<string | null>(() =>
    input && !isInterviewMedia(input) ? input : null,
  );
  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setUrl(null);
      return;
    }
    if (!isInterviewMedia(input)) {
      setUrl(input);
      return;
    }
    resolveMediaUrl(input, candidateToken).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [input, candidateToken]);
  return url;
}

/** Adresse temporaire renouvelable à la demande, pour les lecteurs interactifs. */
export function useRefreshableMediaUrl(input?: string | null, candidateToken?: string | null) {
  const [url, setUrl] = useState<string | null>(() =>
    input && !isInterviewMedia(input) ? input : null,
  );
  const [loading, setLoading] = useState(!!input && isInterviewMedia(input));

  const refresh = useCallback(async () => {
    if (!input) {
      setUrl(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    invalidateMediaUrl(input, candidateToken);
    const next = await resolveMediaUrl(input, candidateToken, { forceRefresh: true });
    setUrl(next);
    setLoading(false);
    return next;
  }, [input, candidateToken]);

  useEffect(() => {
    let cancelled = false;
    setLoading(!!input && isInterviewMedia(input));
    resolveMediaUrl(input, candidateToken).then((next) => {
      if (!cancelled) {
        setUrl(next);
        setLoading(false);
      }
    });
    // Renouvellement avant l'expiration serveur d'une heure.
    const timer = input && isInterviewMedia(input) && !input.includes(`/object/sign/${BUCKET}/`)
      ? window.setInterval(() => { void refresh(); }, 50 * 60 * 1000)
      : null;
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [input, candidateToken, refresh]);

  return { url, loading, refresh };
}

/** Hook : résout une liste d'adresses, renvoie une fonction de résolution synchrone. */
export function useMediaUrls(
  inputs: Array<string | null | undefined>,
  candidateToken?: string | null,
) {
  const key = useMemo(() => inputs.filter(Boolean).join("|"), [inputs]);
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    resolveMediaUrls(inputs, candidateToken).then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, candidateToken]);

  return (input?: string | null): string | null => {
    if (!input) return null;
    if (!isInterviewMedia(input)) return input;
    const p = toStoragePath(input);
    return (p && map[p]) || null;
  };
}
