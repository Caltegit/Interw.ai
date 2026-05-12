# Correction du bug Attitude — Passerelle IA Lovable

## Diagnostic

L'analyse a échoué avec **HTTP 429 — quota Gemini Free Tier épuisé** sur `gemini-2.5-pro`. La fonction `analyze-nonverbal` appelle l'API Google directe via `GEMINI_API_KEY` (clé gratuite à zéro), au lieu de la passerelle IA Lovable.

En base : `reports.nonverbal_analysis = { status: "failed", error: "gemini_429" }` → l'UI affiche « La dernière analyse corporelle a échoué ».

## Correctif

Réécriture de `supabase/functions/analyze-nonverbal/index.ts` pour utiliser la passerelle IA Lovable (`LOVABLE_API_KEY`, endpoint `https://ai.gateway.lovable.dev/v1/chat/completions`, format OpenAI).

### Changements clés

1. **Suppression de l'upload Gemini Files API** (non disponible via la passerelle). Envoi de chaque segment vidéo en **inline base64** (`data:video/webm;base64,...`) dans un message multimodal.
2. **Cap durci pour rester dans la limite inline** : 4 segments max, 15 Mo par segment.
3. **Payload OpenAI-compatible** :
   - `model: "google/gemini-2.5-pro"`
   - `tools: [{ type: "function", function: TOOL_SCHEMA }]` + `tool_choice` forcé sur `report_nonverbal`
   - `messages` avec parties `text` + `image_url` (la passerelle accepte la vidéo via ce canal pour Gemini)
4. **Gestion d'erreurs explicite** :
   - `429` → `nonverbal_analysis = { status: "rate_limited" }`
   - `402` → `status: "no_credits"`
   - autres → `status: "failed"`
5. **Schéma de sortie identique** (`profile`, `micro_tensions`, `summary`) → aucun changement front nécessaire côté affichage des données.
6. **État « en cours »** : avant l'appel, on écrit `status: "running"` pour que l'UI ne reste pas bloquée sur « échouée ».

### UI

`NonverbalProfileCard` (et son parent dans `SessionDetail.tsx` / `SharedReport.tsx`) : afficher trois nouveaux états avec messages clairs et un bouton « Réessayer » :
- `running` → spinner + « Analyse corporelle en cours… »
- `rate_limited` → « Trop de requêtes, réessayez dans quelques minutes »
- `no_credits` → « Crédits IA épuisés, ajoutez des crédits dans Workspace → Usage »

## Fichiers touchés

- `supabase/functions/analyze-nonverbal/index.ts` — réécriture complète du transport.
- `src/pages/SessionDetail.tsx` + `src/pages/SharedReport.tsx` — rendu des nouveaux statuts dans l'onglet Attitude (le composant `NonverbalProfileCard` ne change que pour exposer le statut au parent).

## Test

1. Re-déployer `analyze-nonverbal`.
2. Sur la session « Olivier Vernet », cliquer « Régénérer ».
3. Vérifier les logs → 200 via passerelle Lovable.
4. Vérifier que `reports.nonverbal_analysis.profile` est rempli et que l'onglet Attitude affiche les 4 scores.

Si beaucoup de segments dépassent 15 Mo après ce premier test, on évaluera l'ajout d'une compression `ffmpeg` (option B mise de côté pour l'instant, comme convenu).