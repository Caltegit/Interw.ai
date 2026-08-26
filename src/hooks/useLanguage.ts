import { useTranslation } from "react-i18next";
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, type AppLanguage } from "@/i18n/detect";

/** Lecture et changement de la langue courante. Le choix manuel est persisté. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const setLanguage = (next: AppLanguage) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // stockage indisponible : on change quand même la langue en mémoire
    }
    void i18n.changeLanguage(next);
  };

  return { language, setLanguage };
}
