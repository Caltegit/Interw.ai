# Plan — correction Q15 Léa Fulco

## Cause racine confirmée

Sur la transition entre deux questions, des callbacks `ondataavailable` tardifs pouvaient encore arriver après le démarrage du recorder suivant. Comme plusieurs états d'upload étaient partagés globalement (`mime`, liste des chunks, compteur, buffers), des chunks de Q15 partaient dans `q13/` pendant que d'autres partaient dans `q14/`.

Sur la session de Léa (`d7014025…`) :

- `q14/` contient les chunks impairs,
- `q13/` contient une partie des chunks pairs de la fin,
- le `manifest.json` de `q14/` référence déjà ce mélange inter-dossiers,
- le backend ne suivait pas ce manifest pour reconstruire, donc `q14.webm` manquait.

## Correctifs appliqués

### Front

`src/pages/InterviewStart.tsx`

- l'enregistrement actif est désormais encapsulé dans un objet par question (`activeQuestionRecordingRef`) ;
- chaque recorder capture son propre `questionIndex`, `mime`, buffers, uploads et manifest ;
- `startQuestionRecording` attend l'arrêt d'un éventuel recorder précédent avant de repartir ;
- `stopAndUploadQuestionVideo` travaille sur le snapshot du recorder exact, attend la fin des uploads de chunks en vol, puis écrit le manifest avec les vrais chemins capturés.

### Backend

`supabase/functions/recover-session-video/index.ts`

- lecture du `manifest.json` si présent ;
- reconstruction à partir de la liste exacte des chunks, même s'ils vivent dans plusieurs dossiers ;
- détection de format basée d'abord sur les extensions réellement listées dans le manifest, avant de regarder `mimeType`.

`supabase/functions/finalize-abandoned-session/index.ts`

- même logique de lecture du manifest ;
- assemblage possible depuis des chemins inter-dossiers ;
- manifest réécrit avec les vrais chemins sources utilisés.

## Validation à exécuter

- redéployer les 2 fonctions backend ;
- reconstruire `session_id=d7014025-a3a6-4fa1-9167-c18eee5ac3a1`, `question_index=14` ;
- vérifier que `q14.webm` existe et répond en 200 ;
- refaire un entretien complet pour confirmer qu'aucun chunk ne fuit de `qN/` vers `qN-1/`.
