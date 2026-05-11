// Détection de la compatibilité navigateur pour l'entretien.
// Utilisé par la page de vérification technique pour afficher la carte
// « Navigateur » et pour journaliser chaque tentative en BDD.

export type CompatLevel = "ok" | "warning" | "blocked";

export interface BrowserCompatResult {
  level: CompatLevel;
  reason?: string;
  // Détails parsés pour log + affichage
  browser: string;
  browserVersion?: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  isInAppWebview: boolean;
  webviewHost?: string;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  userAgent: string;
}

interface WebviewMatch {
  host: string;
  pattern: RegExp;
  reason: string;
}

const WEBVIEWS: WebviewMatch[] = [
  { host: "Outlook", pattern: /OutlookMobile|Outlook-iOS|Outlook-Android/i, reason: "Vous utilisez le navigateur intégré à Outlook. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Teams", pattern: /Teams\/|MSTeams/i, reason: "Vous utilisez le navigateur intégré à Microsoft Teams. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Gmail", pattern: /GoogleApp|GSA\//i, reason: "Vous utilisez le navigateur intégré à l'application Gmail. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "WhatsApp", pattern: /WhatsApp/i, reason: "Vous utilisez le navigateur intégré à WhatsApp. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "WeChat", pattern: /MicroMessenger/i, reason: "Vous utilisez le navigateur intégré à WeChat. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Instagram", pattern: /Instagram/i, reason: "Vous utilisez le navigateur intégré à Instagram. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Facebook", pattern: /FBAN|FBAV|FB_IAB/i, reason: "Vous utilisez le navigateur intégré à Facebook. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Snapchat", pattern: /Snapchat/i, reason: "Vous utilisez le navigateur intégré à Snapchat. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "TikTok", pattern: /musical_ly|TikTok|Bytedance/i, reason: "Vous utilisez le navigateur intégré à TikTok. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "LinkedIn", pattern: /LinkedInApp/i, reason: "Vous utilisez le navigateur intégré à LinkedIn. Il ne permet pas l'accès au micro et à la caméra." },
  { host: "Line", pattern: /Line\//i, reason: "Vous utilisez le navigateur intégré à Line. Il ne permet pas l'accès au micro et à la caméra." },
];

function parseBrowser(ua: string): { name: string; version?: string } {
  // Ordre important : Edge avant Chrome, etc.
  const tests: Array<[string, RegExp]> = [
    ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/i],
    ["Opera", /OPR\/([\d.]+)/i],
    ["Firefox iOS", /FxiOS\/([\d.]+)/i],
    ["Chrome iOS", /CriOS\/([\d.]+)/i],
    ["Firefox", /Firefox\/([\d.]+)/i],
    ["Chrome", /Chrome\/([\d.]+)/i],
    ["Safari", /Version\/([\d.]+).*Safari/i],
    ["Safari", /Safari\/([\d.]+)/i],
  ];
  for (const [name, re] of tests) {
    const m = ua.match(re);
    if (m) return { name, version: m[1] };
  }
  return { name: "Inconnu" };
}

function parseOS(ua: string): string {
  if (/iPhone OS (\d+)[._](\d+)/.test(ua)) {
    const m = ua.match(/iPhone OS (\d+)[._](\d+)/)!;
    return `iOS ${m[1]}.${m[2]}`;
  }
  if (/iPad.*OS (\d+)[._](\d+)/.test(ua)) {
    const m = ua.match(/OS (\d+)[._](\d+)/)!;
    return `iPadOS ${m[1]}.${m[2]}`;
  }
  if (/Android (\d+(?:\.\d+)?)/.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/)!;
    return `Android ${m[1]}`;
  }
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X (\d+)[._](\d+)/.test(ua)) {
    const m = ua.match(/Mac OS X (\d+)[._](\d+)/)!;
    return `macOS ${m[1]}.${m[2]}`;
  }
  if (/Linux/.test(ua)) return "Linux";
  return "Inconnu";
}

function parseDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  if (/Android/i.test(ua)) return "tablet";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

export function detectBrowserCompat(): BrowserCompatResult {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const deviceType = parseDeviceType(ua);

  const hasGetUserMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = typeof window !== "undefined" && "MediaRecorder" in window;
  const hasAudioContext = typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
  const hasSpeechRecognition = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const base = {
    browser: browser.name,
    browserVersion: browser.version,
    os,
    deviceType,
    hasGetUserMedia,
    hasMediaRecorder,
    hasAudioContext,
    userAgent: ua,
  };

  // 1) Webview intégrée
  for (const w of WEBVIEWS) {
    if (w.pattern.test(ua)) {
      return { ...base, level: "blocked", reason: w.reason, isInAppWebview: true, webviewHost: w.host };
    }
  }
  // Android WebView générique
  if (/; wv\)/.test(ua)) {
    return { ...base, level: "blocked", reason: "Vous utilisez un navigateur intégré à une application. Ouvrez ce lien dans Chrome ou Safari.", isInAppWebview: true, webviewHost: "Android WebView" };
  }

  // 2) Firefox sur iOS : pas d'enregistrement audio fiable
  if (/FxIOS|FxiOS/.test(ua)) {
    return { ...base, level: "blocked", reason: "Firefox sur iPhone ne permet pas l'enregistrement audio. Utilisez Safari.", isInAppWebview: false };
  }

  // 3) APIs absentes
  if (!hasMediaRecorder) {
    return { ...base, level: "blocked", reason: "Votre navigateur ne prend pas en charge l'enregistrement audio.", isInAppWebview: false };
  }
  if (!hasGetUserMedia) {
    return { ...base, level: "blocked", reason: "Votre navigateur ne permet pas l'accès au micro et à la caméra.", isInAppWebview: false };
  }
  if (!hasAudioContext) {
    return { ...base, level: "blocked", reason: "Votre navigateur ne prend pas en charge l'audio Web.", isInAppWebview: false };
  }
  if (!hasSpeechRecognition) {
    return { ...base, level: "blocked", reason: "Votre navigateur ne prend pas en charge la reconnaissance vocale nécessaire à l'entretien. Ouvrez ce lien dans Chrome (Android, Mac, PC) ou Safari (iPhone).", isInAppWebview: false };
  }

  // 4) Avertissements (compatible mais à risque)
  const major = browser.version ? parseInt(browser.version.split(".")[0], 10) : 0;
  if (browser.name === "Safari" && major > 0 && major < 14) {
    return { ...base, level: "warning", reason: "Votre version de Safari est ancienne. Mettez-la à jour pour éviter tout souci.", isInAppWebview: false };
  }
  if (browser.name === "Firefox" && major > 0 && major < 100) {
    return { ...base, level: "warning", reason: "Votre version de Firefox est ancienne. Mettez-la à jour pour éviter tout souci.", isInAppWebview: false };
  }
  if (browser.name === "Edge" && major > 0 && major < 110) {
    return { ...base, level: "warning", reason: "Votre version de Edge est ancienne. Mettez-la à jour pour éviter tout souci.", isInAppWebview: false };
  }

  return { ...base, level: "ok", isInAppWebview: false };
}
