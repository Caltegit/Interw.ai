## Problèmes constatés

1. **Plein écran absent en démo** : `requestFullscreen()` est appelé depuis `beginInterview()` lui-même déclenché par un `useEffect` (auto-start démo). Sans geste utilisateur, le navigateur refuse silencieusement.
2. **L'intro du projet (étape 2) n'est pas jouée** : la démo crée la session puis saute directement à `InterviewStart`, qui ne gère que le greeting IA (`ai_intro_*`). L'intro projet (`intro_mode` / `intro_text` / `intro_audio_url` / `intro_video_url` / `presentation_video_url`) n'est jouée que par `InterviewLanding`, qui est court-circuité.

## Correctifs

### 1) `src/pages/InterviewDemoLanding.tsx` — refonte
Remplacer l'auto-création silencieuse par un écran minimal avec **un seul bouton « Démarrer la démo »** qui fournit le geste utilisateur indispensable.

Au clic, dans cet ordre :
1. `document.documentElement.requestFullscreen()` (desktop uniquement, ignoré sur mobile).
2. Création de la session démo (mêmes champs qu'aujourd'hui : `is_demo: true`, `candidate_name: "Démo"`, `candidate_email: "demo@interw.local"`, `consent_accepted_at`).
3. Si une intro projet existe (mêmes règles que `InterviewLanding` : `intro_enabled !== false` + un `intro_mode` valide OU `presentation_video_url` OU `intro_audio_url`) → afficher inline le lecteur d'intro (audio / vidéo / texte / TTS via `tts-elevenlabs`), réutilisant la logique de `InterviewLanding`. Bouton « Passer » disponible.
4. Quand l'intro se termine (ou immédiatement si aucune intro) → `navigate('/session/:slug/start/:token')`.

### 2) `src/pages/InterviewStart.tsx` — durcir le plein écran démo
- Conserver l'auto-start démo (`demoAutoStartedRef`).
- Dans `beginInterview()`, si `session?.is_demo` et que le plein écran n'a pas été accordé (vérifié via `document.fullscreenElement`), ne pas relancer un `requestFullscreen()` silencieux : le `FullscreenPrompt` existant ré-apparaîtra naturellement et permettra au candidat de cliquer « Revenir en plein écran ». Comme on l'aura déjà demandé sur le clic « Démarrer la démo » de l'étape précédente, dans 99 % des cas il sera déjà actif.
- Aucune autre modification de flux.

### 3) Aucun changement back-end nécessaire
Les colonnes `intro_*` et `is_demo` existent déjà.

## Résultat attendu
- Démo : un clic « Démarrer la démo » → plein écran activé → intro projet jouée (si configurée) → enchaînement direct sur la 1ère question, sans l'écran « Prêt à démarrer ? ».
- Lien candidat : inchangé.

Aucun texte superflu n'est ajouté (titre court, un seul bouton).