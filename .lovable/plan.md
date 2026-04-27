## Problème
Le projet `poylo-la-derni-re-copy-moh630ur` a `intro_mode = 'tts'` mais `tts_provider = 'browser'`. L'edge function `tts-elevenlabs` répond donc `{ skip: true, reason: 'not_enabled' }`. Le client (`InterviewLanding.tsx`) détecte que la réponse n'est pas de l'audio et appelle directement `setMediaFinished(true)` → l'écran passe à « message écouté » sans qu'aucune voix ne soit lue.

## Correctif

Dans `src/pages/InterviewLanding.tsx`, fonction `handlePlayMedia` (branche `introMediaType === "tts"`) :

1. Extraire la lecture en fallback dans une fonction interne `playWithBrowserTts()` qui utilise `window.speechSynthesis` :
   - Crée une `SpeechSynthesisUtterance(text)` avec `lang = "fr-FR"`.
   - `onend` / `onerror` → `setMediaPlaying(false)` + `setMediaFinished(true)`.
   - Stocke un objet `{ pause: () => synth.cancel() }` dans `ttsAudioRef.current` pour que `stopAllIntroMedia` puisse l'arrêter (compatible avec le code existant).
   - `synth.speak(utterance)` puis `setMediaPlaying(true)`.

2. Quand la réponse `tts-elevenlabs` n'est pas de l'audio (provider non configuré côté projet) → appeler `playWithBrowserTts()` au lieu de `setMediaFinished(true)`.

3. Idem dans le `catch` réseau : tenter le fallback navigateur.

## Hors-périmètre
- Pas de changement DB : on ne force pas le projet sur ElevenLabs.
- L'edge function `tts-elevenlabs` reste inchangée (son comportement « skip si non activé » est correct).
- `stopAllIntroMedia` n'a pas besoin d'être modifié : le shim `{ pause }` injecté est compatible avec le code `t.pause()` existant.

## Vérification
Recharger `/session/poylo-la-derni-re-copy-moh630ur`, démarrer la session, cliquer « Écouter le message » → la voix du navigateur lit le texte d'intro, puis le bouton « Commencer la session » apparaît.
