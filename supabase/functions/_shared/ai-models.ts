// Identifiants des modèles IA utilisés par les fonctions Edge.
// Point unique de changement : modifier un modèle ici le change partout.

/** Modèle rapide, utilisé pour la transcription, les analyses et la conversation. */
export const MODEL_FAST = "google/gemini-3.7-flash";

/** Modèle principal du scoring (matrice de fit et rapport). */
export const MODEL_SCORING = "google/gemini-3.7-flash";

/** Filet de sécurité si le modèle principal échoue sur le scoring. */
export const MODEL_FALLBACK = "openai/gpt-5.6-terra";

/**
 * Adapte un corps de requête chat-completions au fournisseur du modèle.
 * Les modèles OpenAI GPT-5.x refusent `max_tokens` et `temperature`, et
 * rejettent les appels avec outils si `reasoning_effort` n'est pas "none".
 */
export function buildChatBody(
  model: string,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...base, model };
  if (model.startsWith("openai/")) {
    if ("max_tokens" in body) {
      body.max_completion_tokens = body.max_tokens;
      delete body.max_tokens;
    }
    delete body.temperature;
    body.reasoning_effort = "none";
  }
  return body;
}
