/**
 * Helpers de diagnostic pour les permissions et les périphériques média.
 * Centralise la classification des erreurs `getUserMedia` afin d'afficher
 * un message ciblé au candidat sur l'écran de test technique.
 */

export type MediaErrorKind =
  | "denied"
  | "not-found"
  | "in-use"
  | "overconstrained"
  | "insecure"
  | "unsupported"
  | "unknown";

export interface ClassifiedMediaError {
  kind: MediaErrorKind;
  /** Message générique (sans préciser micro vs caméra). */
  message: string;
}

/**
 * Classe une exception levée par `getUserMedia` pour produire un message
 * d'aide adapté au candidat.
 */
export function classifyMediaError(err: unknown, target: "mic" | "cam" | "media" = "media"): ClassifiedMediaError {
  const device = target === "mic" ? "le micro" : target === "cam" ? "la caméra" : "le micro et la caméra";
  const Device = target === "mic" ? "Le micro" : target === "cam" ? "La caméra" : "Le micro et la caméra";

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      kind: "insecure",
      message: `Cette page doit être ouverte en HTTPS pour autoriser ${device}.`,
    };
  }

  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
    return {
      kind: "unsupported",
      message: `Votre navigateur ne permet pas d'accéder ${target === "media" ? "au micro et à la caméra" : `à ${device}`}.`,
    };
  }

  const name = (err as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        kind: "denied",
        message: `Accès refusé. Cliquez sur l'icône cadenas dans la barre d'adresse, autorisez ${device}, puis rechargez la page.`,
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        kind: "not-found",
        message: `${Device} n'a pas été détecté${target === "media" ? "s" : ""}. Branchez un appareil puis réessayez.`,
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        kind: "in-use",
        message: `Un autre logiciel utilise déjà ${device} (Zoom, Teams, autre onglet…). Fermez-le puis réessayez.`,
      };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return {
        kind: "overconstrained",
        message: `${Device} ne répond pas aux contraintes demandées. Réessayez ou choisissez un autre appareil.`,
      };
    case "SecurityError":
      return {
        kind: "insecure",
        message: `Cette page doit être ouverte en HTTPS pour autoriser ${device}.`,
      };
    default:
      return {
        kind: "unknown",
        message: `Impossible d'accéder à ${device}. Vérifiez les permissions du navigateur.`,
      };
  }
}

export interface PermissionsSnapshot {
  mic: PermissionState | "unknown";
  cam: PermissionState | "unknown";
}

/**
 * Interroge l'API Permissions pour pré-détecter un refus persistant avant
 * même de relancer un prompt `getUserMedia`. Renvoie « unknown » si l'API
 * n'est pas disponible (Safari < 16, Firefox).
 */
export async function queryPermissions(): Promise<PermissionsSnapshot> {
  const out: PermissionsSnapshot = { mic: "unknown", cam: "unknown" };
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return out;

  const safe = async (name: PermissionName): Promise<PermissionState | "unknown"> => {
    try {
      const status = await navigator.permissions.query({ name });
      return status.state;
    } catch {
      return "unknown";
    }
  };

  out.mic = await safe("microphone" as PermissionName);
  out.cam = await safe("camera" as PermissionName);
  return out;
}

export interface DeviceLists {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
}

/** Liste les périphériques d'entrée disponibles, regroupés par type. */
export async function listInputDevices(): Promise<DeviceLists> {
  const empty: DeviceLists = { audio: [], video: [] };
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return empty;
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      audio: all.filter((d) => d.kind === "audioinput"),
      video: all.filter((d) => d.kind === "videoinput"),
    };
  } catch {
    return empty;
  }
}

export const PREFERRED_AUDIO_KEY = "interview.preferredAudioDeviceId";
export const PREFERRED_VIDEO_KEY = "interview.preferredVideoDeviceId";

export function getStoredDeviceId(kind: "audio" | "video"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(kind === "audio" ? PREFERRED_AUDIO_KEY : PREFERRED_VIDEO_KEY);
  } catch {
    return null;
  }
}

export function setStoredDeviceId(kind: "audio" | "video", deviceId: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = kind === "audio" ? PREFERRED_AUDIO_KEY : PREFERRED_VIDEO_KEY;
    if (deviceId) window.localStorage.setItem(key, deviceId);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
