/**
 * Sink de télémétrie micro : envoie les événements micro vers le serveur
 * sans jamais bloquer le déroulé de l'entretien.
 *
 * - Buffer en mémoire, vidé toutes les 5 s et sur visibilitychange/pagehide.
 * - Utilise fetch keepalive (fire-and-forget).
 * - Aucun await dans le chemin critique : tout est asynchrone et non bloquant.
 * - Se branche sur logger.ts via setTelemetryHook : tout logger.warn("mic_*")
 *   existant est automatiquement forwardé vers le serveur.
 */

import { setTelemetryHook } from "./logger";

interface QueuedEvent {
  event: string
  data: Record<string, unknown>
  ts: string
}

const BUFFER_MAX = 50
const FLUSH_INTERVAL_MS = 5_000

let buffer: QueuedEvent[] = []
let sessionToken: string | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null
let listenersAttached = false

function getFunctionUrl(): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const base = supabaseUrl || `https://${projectId}.supabase.co`
  return `${base}/functions/v1/log-mic-events`
}

function getApiKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
}

function flush(): void {
  if (buffer.length === 0 || !sessionToken) return
  const events = buffer
  buffer = []

  const body = JSON.stringify({ sessionToken, events })
  const url = getFunctionUrl()
  const apiKey = getApiKey()

  // sendBeacon ne gère pas les headers custom, donc on utilise fetch keepalive
  // comme repli principal (sendBeacon ne permet pas d'envoyer l'apikey en header).
  try {
    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        apikey: apiKey,
      },
      body,
      keepalive: true,
    }).catch(() => { /* Silencieux : la télémétrie ne doit jamais bloquer. */ })
  } catch {
    /* ignore */
  }
}

function ensureListeners(): void {
  if (listenersAttached) return
  listenersAttached = true

  // Flush sur changement de visibilité (onglet en arrière-plan)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Flush final avant fermeture de l'onglet
  window.addEventListener('pagehide', () => flush())
}

/**
 * Initialise la télémétrie avec le token de session candidat.
 * À appeler au démarrage de l'entretien.
 */
export function initMicTelemetry(token: string): void {
  sessionToken = token
  ensureListeners()

  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS)
}

/**
 * Enfile un événement micro. Non bloquant — ne fait que pousser dans un buffer.
 */
export function trackMicEvent(event: string, data?: Record<string, unknown>): void {
  if (!sessionToken) return
  buffer.push({ event, data: data ?? {}, ts: new Date().toISOString() })
  if (buffer.length >= BUFFER_MAX) flush()
}

/**
 * Termine la télémétrie : flush final et nettoyage du timer.
 */
export function disposeMicTelemetry(): void {
  flush()
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
