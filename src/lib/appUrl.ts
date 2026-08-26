/**
 * Domaine public unique de l'application.
 * Toute URL absolue affichée ou envoyée doit passer par ces constantes.
 */
export const PUBLIC_APP_URL = "https://interw.com";
export const PUBLIC_APP_HOST = "interw.com";

/** Adresse de contact affichée dans l'interface. */
export const CONTACT_EMAIL = "hello@interw.ai";

export function appUrl(path = "/"): string {
  return `${PUBLIC_APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
