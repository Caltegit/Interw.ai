/**
 * Normalisation de langue Interw.
 *
 * Règle non négociable :
 * - premier tag de la liste dont le sous-tag primaire est `fr` (insensible à la casse) → "fr"
 * - tout le reste, connu ou inconnu → "en"
 * - aucune information disponible → "en"
 */

export type AppLanguage = "fr" | "en";

export const SUPPORTED_LANGUAGES: AppLanguage[] = ["fr", "en"];
export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "interw_lang";
export const LANGUAGE_QUERY_PARAM = "lang";

/** Sous-tag primaire d'un tag BCP 47, en minuscules. `fr-BE` → `fr`. */
function primarySubtag(tag: unknown): string {
  if (typeof tag !== "string") return "";
  return tag.trim().toLowerCase().split(/[-_]/)[0] ?? "";
}

/**
 * Applique la règle « fr sinon en » à un tag ou à une liste de tags bruts.
 * Retourne toujours une langue supportée.
 */
export function normalizeLanguage(input: unknown): AppLanguage {
  const tags = Array.isArray(input) ? input : [input];
  for (const tag of tags) {
    if (primarySubtag(tag) === "fr") return "fr";
  }
  const hasInfo = tags.some((t) => typeof t === "string" && t.trim().length > 0);
  return hasInfo ? "en" : DEFAULT_LANGUAGE;
}

/** Tag brut présent dans la query string (`?lang=…`), s'il existe. */
export function queryStringLanguageTag(param = LANGUAGE_QUERY_PARAM): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(param);
  } catch {
    return null;
  }
}

/** Tag brut mémorisé dans localStorage, s'il existe. */
export function storedLanguageTag(key = LANGUAGE_STORAGE_KEY): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Tags du navigateur, du plus prioritaire au moins prioritaire. */
export function navigatorLanguageTags(): string[] {
  if (typeof navigator === "undefined") return [];
  const list = Array.isArray(navigator.languages) ? navigator.languages : [];
  const tags = [...list];
  if (navigator.language) tags.push(navigator.language);
  return tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

/**
 * Résolution complète : query string, puis localStorage, puis navigateur.
 * La première source qui fournit une information gagne, et sa valeur brute
 * est normalisée par la règle « fr sinon en ».
 */
export function resolveLanguage(options?: {
  querystring?: string | null;
  stored?: string | null;
  navigatorTags?: string[];
}): AppLanguage {
  const qs = options?.querystring ?? queryStringLanguageTag();
  if (typeof qs === "string" && qs.trim().length > 0) return normalizeLanguage(qs);

  const stored = options?.stored ?? storedLanguageTag();
  if (typeof stored === "string" && stored.trim().length > 0) return normalizeLanguage(stored);

  const nav = options?.navigatorTags ?? navigatorLanguageTags();
  if (nav.length > 0) return normalizeLanguage(nav);

  return DEFAULT_LANGUAGE;
}
