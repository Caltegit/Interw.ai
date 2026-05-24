## Objectif

Quand la session est mise en pause automatiquement pour silence prolongé (20 s sans transcription), arrêter de dire seulement *« Reprenez dans 2 minutes »* et **guider le candidat sur la piste micro**.

## Ce qu'on change

### 1. Message de la pause auto-silence — `InterviewStart.tsx` (~lignes 547-559)

Remplacer le `toast` actuel par une **modale dédiée** non bloquante (Dialog shadcn), qui s'ouvre uniquement quand `pauseSource === "auto-silence"`.

Contenu :
- **Titre** : *« Nous ne vous entendons plus »*
- **Sous-titre** : *« Si vous parliez bien, c'est probablement votre micro. »*
- **3 vérifications rapides** (liste avec icônes) :
  1. Vérifier l'icône cadenas du navigateur — le micro doit être autorisé.
  2. Vérifier que le micro système n'est pas coupé (touche dédiée du clavier, prise jack).
  3. Essayer un autre micro ci-dessous.
- **`DeviceSelector`** (composant déjà existant) listant les `audioinput` détectés. À la sélection :
  - met à jour `interview.preferredAudioDeviceId`,
  - relance `startVideoStream()` (qui réutilise le device préféré).
- **Boutons** :
  - *« Reprendre l'entretien »* (primary) → ferme la modale + `resumeInterview()`.
  - *« Signaler un problème »* (ghost) → ouvre le dialog `report-interview-issue` déjà câblé.

La TTS d'annonce actuelle (*« Je vais mettre la session en pause »*) reste, on n'y touche pas.

### 2. Adapter `pauseInterviewRef.current?.("auto-silence")`

Le state `pauseSource` existe déjà (type `PauseSource`). On l'utilise pour conditionner l'affichage : la modale ne s'ouvre que pour `auto-silence`, pas pour `manual` ou `auto-network`.

### 3. Nouveau composant

`src/components/interview/MicSilencePauseDialog.tsx` — Dialog shadcn + `DeviceSelector` + les 3 conseils. Props : `open`, `onResume`, `onReport`, `currentDeviceId`, `onDeviceChange`, `audioDevices`.

### 4. Logger

À l'ouverture de la modale, `logger.warn("interview_silence_pause_shown", { sessionId, questionIndex })` pour mesurer la fréquence.

## Ce qu'on ne touche pas

- Les timings (6 s / 12 s / 20 s / 2 min) — déjà bien calibrés.
- La logique de reset basée sur `liveTranscript`.
- Le watchdog STT existant.
- L'auto-arrêt après 2 min sans reprise.

## Test après implémentation

1. Lancer une session candidat en local, débrancher/couper le micro système avant la 1ʳᵉ question.
2. Vérifier qu'au bout de 20 s la modale apparaît avec la liste des micros détectés.
3. Sélectionner un autre micro → vérifier que le stream est relancé sur le bon device.
4. Cliquer « Reprendre » → vérifier que la session repart normalement.
