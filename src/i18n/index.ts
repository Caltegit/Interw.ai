import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector, { type CustomDetector } from "i18next-browser-languagedetector";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_QUERY_PARAM,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  navigatorLanguageTags,
  queryStringLanguageTag,
  resolveLanguage,
  storedLanguageTag,
} from "./detect";

/**
 * Chargement statique des traductions : tout est dans le bundle,
 * aucun appel HTTP, donc aucun flash de contenu non traduit.
 */
const modules = import.meta.glob<Record<string, unknown>>("./locales/*/*.json", {
  eager: true,
  import: "default",
});

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, content] of Object.entries(modules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  resources[lng][ns] = content;
}

export const NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "projects",
  "sessions",
  "candidate",
  "projectWizard",
  "resources",
  "report",
  "settings",
  "landing",
  "pricing",
  "faq",
] as const;

/**
 * Détecteur personnalisé placé en tête de l'ordre : il lit les mêmes sources
 * que le plugin (querystring, localStorage, navigator), dans le même ordre,
 * puis applique la normalisation « fr sinon en ». Le plugin renvoyant des tags
 * bruts (zh-CN, nl-BE), cette couche est indispensable.
 */
const interwDetector: CustomDetector = {
  name: "interw",
  lookup(options) {
    return resolveLanguage({
      querystring: queryStringLanguageTag(options?.lookupQuerystring ?? LANGUAGE_QUERY_PARAM),
      stored: storedLanguageTag(options?.lookupLocalStorage ?? LANGUAGE_STORAGE_KEY),
      navigatorTags: navigatorLanguageTags(),
    });
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(interwDetector);

void i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    returnNull: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["interw", "querystring", "localStorage", "navigator"],
      lookupQuerystring: LANGUAGE_QUERY_PARAM,
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

function syncHtmlLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lng);
  }
}

syncHtmlLang(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
