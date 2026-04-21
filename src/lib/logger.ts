/**
 * Petit utilitaire de logs structurés côté front.
 *
 * - Niveaux : debug / info / warn / error
 * - Contexte automatique : route, user_id (si dispo)
 * - Sortie console formatée + buffer en mémoire (utile pour debug)
 * - Prêt à brancher sur un service externe (Sentry, Logtail, etc.)
 *
 * Usage :
 *   import { logger } from "@/lib/logger";
 *   logger.error("upload_failed", { sessionId, error: err.message });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  route: string;
  userId?: string | null;
  data?: Record<string, unknown>;
}

const BUFFER_MAX = 200;
const buffer: LogEntry[] = [];
let currentUserId: string | null = null;

const isDev = import.meta.env.DEV;

function getRoute(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function emit(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    route: getRoute(),
    userId: currentUserId,
    data,
  };

  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.shift();

  // Toujours afficher warn/error, debug seulement en dev
  if (level === "debug" && !isDev) return;

  const prefix = `[${level.toUpperCase()}] ${event}`;
  const payload = { route: entry.route, userId: entry.userId, ...data };

  switch (level) {
    case "error":
      console.error(prefix, payload);
      break;
    case "warn":
      console.warn(prefix, payload);
      break;
    case "info":
      console.info(prefix, payload);
      break;
    case "debug":
      console.debug(prefix, payload);
      break;
  }

  // Hook pour brancher un service externe plus tard
  // ex : Sentry.captureMessage(event, { level, extra: payload });
}

export const logger = {
  setUser(userId: string | null) {
    currentUserId = userId;
  },
  debug(event: string, data?: Record<string, unknown>) {
    emit("debug", event, data);
  },
  info(event: string, data?: Record<string, unknown>) {
    emit("info", event, data);
  },
  warn(event: string, data?: Record<string, unknown>) {
    emit("warn", event, data);
  },
  error(event: string, data?: Record<string, unknown>) {
    emit("error", event, data);
  },
  /** Récupère les derniers logs (utile pour exporter un rapport de bug) */
  getRecent(): LogEntry[] {
    return [...buffer];
  },
};
