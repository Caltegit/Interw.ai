## Objectif
Supprimer la possibilité de choisir une autre voix qu'ElevenLabs. ElevenLabs devient le seul provider TTS.

## Changements

### `src/components/project/ProjectForm.tsx`
- Supprimer le bloc Switch "Voix premium ElevenLabs" (lignes ~443-457) et son texte explicatif sur le crédit.
- Garder uniquement le sélecteur de genre + le bouton "Modifier la voix" (toujours visible, plus conditionné par `ttsProvider === "elevenlabs"`).
- Forcer `ttsProvider = "elevenlabs"` à l'initialisation et à la sauvegarde (état conservé pour compat backend, mais figé).
- Retirer la logique `onCancel` qui repassait à `"browser"`.

### `loadInterviewTemplate.ts` / payload import
- Quand un template charge `tts_provider: "browser"`, le réécrire en `"elevenlabs"` côté form (sans toucher la DB des templates existants).

### Vérifs annexes (lecture seule, pas de migration)
- `InterviewStart.tsx` et la session continueront d'envoyer `tts_provider`. Comme il sera toujours `"elevenlabs"`, aucun changement DB nécessaire.
- Pas de suppression de la colonne `tts_provider` en DB (rétro-compat sessions existantes).

## Hors scope
- Pas de migration DB.
- Pas de changement sur la voix clonée (déjà intégrée via `VoiceSelectorDialog`).
- Le mode `browser` reste fonctionnel côté runtime au cas où d'anciennes sessions le référencent, mais devient inaccessible depuis l'UI.
