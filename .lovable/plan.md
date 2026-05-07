## Objectif

Récupérer les vraies réponses de Sarah De Oliveira (les vidéos/audios existent en storage) et régénérer son rapport IA. Puis corriger la cause racine pour éviter que ça se reproduise.

## Étape 1 — Réinitialiser les messages candidat de la session

Pour la session `8321e3fa-e806-4310-8e99-366380c35de8` uniquement :
- Remettre `transcription_status = 'pending'` sur tous les messages candidat (y compris ceux marqués `failed`).
- Vider `content` (mettre `''`) afin que la transcription Gemini réécrive vraiment le texte (sinon le code conserve l'ancienne valeur `"[Question passée]"` si Gemini renvoie vide).

Migration SQL ciblée sur ce session_id uniquement.

## Étape 2 — Lancer la re-transcription

Appeler la fonction edge `transcribe-session` avec `{ session_id, force: true }`. Comme il y a 10 segments et que `MAX_SEGMENTS_PER_RUN = 8`, on appelle 2 fois.

Vérifier que `transcription_status` passe à `done` et que `content` contient bien le verbatim.

## Étape 3 — Régénérer le rapport

Supprimer le rapport existant puis appeler `generate-report` (même logique que le hook `useRegenerateReport`).

Vérifier en base que `overall_score`, `criteria_scores` et `executive_summary` sont cohérents.

## Étape 4 — Corriger la cause racine de l'auto-skip

Dans `src/pages/InterviewStart.tsx`, l'auto-skip silence (`project.auto_skip_silence`) déclenche `handleSkipQuestion` qui écrit `"[Question passée]"` dans `content` ET conserve la vidéo/audio. Si la transcription échoue ou si la candidate a parlé mais que le micro n'a rien détecté, on perd définitivement la réponse.

Deux corrections :

**a)** Dans `handleSkipQuestion`, si un `videoSegmentUrl`/`audioSegmentUrl` a bien été uploadé, ne PAS écrire `"[Question passée]"` mais laisser `content = ''` avec `transcription_status = 'pending'`. Le pipeline de transcription se chargera ensuite de récupérer le verbatim (et si vraiment rien n'a été dit, Gemini renverra vide → statut `skipped` qui sera bien interprété comme "passée").

**b)** Dans `transcribe-session/index.ts`, retirer `failed` de la liste des statuts terminaux quand on appelle avec `force: true` (déjà OK), mais aussi : quand `cleaned` est vide ET qu'il y avait déjà du contenu type `"[Question passée]"`, le réécrire vraiment au lieu de le conserver.

## Détails techniques

```sql
UPDATE session_messages
SET transcription_status = 'pending', content = ''
WHERE session_id = '8321e3fa-e806-4310-8e99-366380c35de8'
  AND role = 'candidate';
```

Puis (script ou via le bouton "Régénérer le rapport" qui existe déjà dans `SessionDetail`) :
- `supabase.functions.invoke('transcribe-session', { body: { session_id, force: true } })` × 2
- `DELETE FROM reports WHERE session_id = …`
- `supabase.functions.invoke('generate-report', { body: { session_id } })`

## Question

Souhaitez-vous que je :

1. **Fasse uniquement la récupération de Sarah** (étapes 1 → 3), sans toucher au code → résultat immédiat pour ce candidat, le bug pourrait se reproduire pour d'autres.
2. **Récupération + correction du bug** (étapes 1 → 4) → recommandé, évite de futurs cas similaires.
