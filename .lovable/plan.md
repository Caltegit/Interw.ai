## Objectif

Cadrer chaque réponse candidat à **10 minutes maximum**, avec un **avertissement à 8 minutes**, puis adapter la chaîne de transcription pour qu'une vidéo de 10 min reste traitable par Gemini.

---

## 1. Limite côté candidat (InterviewStart.tsx)

Le mécanisme existe déjà via `max_response_seconds` par question + auto-envoi quand le timer expire. On le rend systématique.

- **Plafond dur 600 s** : la valeur effective devient `min(max_response_seconds ?? 600, 600)`. Même si une question est configurée à 15 min en base, le runtime plafonne à 10 min.
- **Avertissement à 8 min** (responseElapsedSec ≥ 480) :
  - Toast `"Plus que 2 minutes pour cette réponse"` (déclenché une seule fois par question).
  - Bandeau d'état passe en orange (warning) — déjà géré quand ratio < 0,5, on s'assure que ça se déclenche bien à 480 s.
  - Dernière minute : passage en rouge (destructive) — déjà géré.
- **À 10 min** : le code existant `handleSendResponseRef.current?.()` envoie automatiquement la réponse (comportement déjà en place pour `max_response_seconds`).
- **Affichage du compte à rebours** : le label `MM:SS / 10:00` apparaît dès le début de chaque réponse (au lieu de seulement quand `max_response_seconds` est défini).

## 2. Côté serveur — re-transcription des vidéos longues (transcribe-session)

Une vidéo WebM de 10 min ≈ 80–120 Mo. La limite actuelle inline base64 (`MAX_INLINE_BYTES = 18 Mo`) bloque toute re-transcription au-delà de ~1,5 min.

- **Migrer vers l'API Files de Gemini** (upload puis référence par URI) :
  1. `POST https://generativelanguage.googleapis.com/upload/v1beta/files` (resumable upload) avec le binaire vidéo.
  2. Polling sur l'état du fichier (`ACTIVE` avant utilisation).
  3. Appel chat completions avec `file_uri` au lieu de `data:base64`.
- **Nouvelle limite haute** : 200 Mo (marge confortable pour 10 min en haute qualité). Au-delà, on log et on échoue proprement.
- **Gestion d'erreur** : si l'upload Files API échoue (clé sans accès, etc.), fallback sur l'inline base64 actuel pour les petits fichiers (<18 Mo).

> Note : l'AI Gateway Lovable proxie OpenAI-style. L'API Files de Gemini ne passe pas par cette gateway → il faudra utiliser directement `generativelanguage.googleapis.com` avec une clé `GEMINI_API_KEY`. Si cette clé n'est pas dispo, on reste sur l'inline et on documente la limite.

## 3. Pas de modif DB

Aucune migration nécessaire. La colonne `max_response_seconds` existe déjà sur `questions` ; on garde sa souplesse pour l'auteur, mais on plafonne au runtime.

---

## Fichiers modifiés

- `src/pages/InterviewStart.tsx` — plafond 600 s, toast à 480 s, affichage timer systématique.
- `supabase/functions/transcribe-session/index.ts` — Files API + nouvelle limite 200 Mo.

## Hors périmètre

- Pas de changement sur la durée totale de session (`max_duration_minutes` reste configurable par projet).
- Pas de réparation rétroactive des sessions ALBO cassées (à traiter séparément si tu veux).
- Pas de découpage côté navigateur (l'enregistrement reste continu, simplement coupé à 10 min).

---

## Question rapide

Veux-tu que je gère aussi la **clé `GEMINI_API_KEY`** pour l'API Files (sinon, on garde inline et on documente que la re-transcription manuelle reste limitée à ~1,5 min même si l'enregistrement va jusqu'à 10 min) ? Sans cette clé, le rapport sera quand même généré normalement à partir du texte du navigateur (qui, lui, n'a plus de bug de duplication).
