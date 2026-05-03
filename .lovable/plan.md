## Problème

Sur mobile, quand le candidat verrouille / ferme l'onglet pendant la dernière question :
- `MediaRecorder` est interrompu sans que `stopAndUploadQuestionVideo()` ne tourne → le blob final `q{i}.webm` n'est jamais écrit (seuls les chunks 1 s ont été poussés au fil de l'eau).
- `endInterview()` n'est jamais appelé → `sessions.status` reste `in_progress`, aucun rapport n'est généré.
- `cleanup-abandoned-sessions` ne purge la session qu'après **2 h**, et ne génère pas de rapport — il supprime tout. Donc l'entretien est perdu.

## Stratégie : 3 filets de sécurité

### 1) Manifest progressif (côté client)

Dans `startQuestionRecording` / `ondataavailable` (`src/pages/InterviewStart.tsx`) : après chaque upload de chunk réussi, mettre à jour `interviews/{sessionId}/q{idx}/manifest.json` (upsert, en arrière-plan, throttlé à ~1/3 s). Ainsi, même sans `stop()`, le serveur sait reconstituer la vidéo à partir des chunks.

### 2) Flush + finalize au `pagehide` / `visibilitychange=hidden`

Dans le même `useEffect` que `beforeunload` :
- Mobile (`hidden` ou `pagehide`) → tenter `questionRecorderRef.current?.requestData()` puis `.stop()` (synchrone côté API, déclenche un dernier `ondataavailable`).
- Envoyer un `navigator.sendBeacon()` vers une nouvelle edge function `finalize-abandoned-session` avec `{ session_id, last_question_index }`. `sendBeacon` est conçu exactement pour ça : il part même si la page meurt.
- Conserver `beforeunload` pour desktop.

### 3) Edge function `finalize-abandoned-session` (nouvelle)

Prend `session_id` + `last_question_index`. Service role.
- Si `sessions.status === 'completed'` → no-op (idempotent).
- Pour la dernière question, lister les chunks sous `interviews/{sessionId}/q{idx}/` (objets `chunk-*.webm`).
- Si `q{idx}.webm` n'existe pas et qu'il y a au moins 1 chunk : télécharger les chunks dans l'ordre, concaténer (Blob), uploader en `q{idx}.webm`. Écrire/mettre à jour le manifest.
- `update sessions set status='completed', completed_at=now(), duration_seconds=...`.
- Le trigger Postgres existant déclenche déjà `finalize-session` (transcription + rapport) → rien à ajouter de ce côté.

### 4) Filet final côté cron

Modifier `cleanup-abandoned-sessions` :
- Ajouter une passe **avant** la suppression : pour les sessions `in_progress` avec `last_activity_at` > 10 min, appeler `finalize-abandoned-session` au lieu de purger immédiatement.
- Ne purger (suppression dure) que si la session n'a **aucun** chunk uploadé (vrai abandon avant toute réponse).

## Fichiers touchés

- `src/pages/InterviewStart.tsx` — manifest progressif + handler `pagehide`/`visibilitychange` + `sendBeacon`.
- `supabase/functions/finalize-abandoned-session/index.ts` *(nouveau)* — assemblage chunks → `q{i}.webm` + update session.
- `supabase/functions/cleanup-abandoned-sessions/index.ts` — appel de la nouvelle fonction avant purge des sessions avec chunks.

## Effets de bord

- Idempotence garantie par checks `status==='completed'` et `q{i}.webm` existant.
- Aucune régression sur le flux normal (clic sur Terminer) : le manifest progressif est juste écrasé par le manifest final.
- `sendBeacon` ne nécessite pas d'auth : la function valide juste `session_id` + qu'elle n'est pas déjà completed.
