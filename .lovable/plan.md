

## Plan — Brancher `logger.error` sur les points critiques d'`InterviewStart`

Ajouter de la visibilité sur les bugs production dans le fichier le plus sensible (`InterviewStart.tsx`), sans rien refactoriser. Uniquement de l'instrumentation.

### Points d'instrumentation

Dans `src/pages/InterviewStart.tsx`, brancher `logger.error` sur les blocs `catch` critiques avec un contexte structuré :

1. **Accès média (getUserMedia)** — événement `interview_media_access_failed` avec `{ sessionId, mode: "audio"|"video", error }`
2. **MediaRecorder (start/stop/dataavailable)** — événement `interview_recorder_failed` avec `{ sessionId, phase, error }`
3. **Upload des segments audio/vidéo vers Storage** — événement `interview_upload_failed` avec `{ sessionId, questionIndex, segmentType, error }`
4. **Speech-to-Text (Web Speech API erreurs + onerror)** — événement `interview_stt_failed` avec `{ sessionId, errorCode, error }`
5. **Appels à l'edge function `ai-conversation-turn`** — événement `interview_ai_turn_failed` avec `{ sessionId, questionIndex, error }`
6. **Appel à l'edge function `tts-elevenlabs`** — événement `interview_tts_failed` avec `{ sessionId, voiceId, error }`
7. **Génération du rapport (`generate-report`)** — événement `interview_report_generation_failed` avec `{ sessionId, error }`
8. **Mise à jour de la session (status, completed_at, etc.)** — événement `interview_session_update_failed` avec `{ sessionId, fields, error }`

### Règles d'instrumentation

- Utiliser `logger.error` (pas `console.error`) pour que ça parte dans le buffer interne et soit prêt pour un futur Sentry.
- Toujours passer `sessionId` quand disponible.
- Ne JAMAIS logger de PII candidat (nom, email, contenu des transcripts).
- Garder les `toast` existants côté UI : le logger n'est qu'un ajout, pas un remplacement.
- Garder les `console.warn` non-critiques tels quels (debug local).

### Hors champ

- Aucun changement de comportement, d'UI ou de logique.
- Pas de refacto d'`InterviewStart` (Lot 2, plus tard avec tests).
- Pas de service externe type Sentry — le logger garde déjà un buffer en mémoire, prêt à être branché plus tard.

### Fichier touché

- `src/pages/InterviewStart.tsx` (modifications ciblées dans les `catch` blocs uniquement)

