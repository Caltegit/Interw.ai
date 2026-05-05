## Objectif

Fiabiliser le test technique candidat (`InterviewDeviceTest.tsx`) sur toutes les configurations : iOS Safari, Android Chrome, Firefox desktop, Brave, navigateurs in-app, mode silencieux iOS, périphériques multiples, micros/caméras occupés par une autre app.

Périmètre : **Lots 1 et 2** uniquement (le réseau et la désactivation auto-start iOS sont reportés).

## Lot 1 — Fiabilité de base

### A. Diagnostic d'erreur précis

Capturer le `DOMException.name` retourné par `getUserMedia` et afficher un message ciblé au lieu d'un texte générique.

| Erreur navigateur | Message affiché au candidat |
|---|---|
| `NotAllowedError` / `PermissionDeniedError` | « Vous avez refusé l'accès. Cliquez sur l'icône cadenas dans la barre d'adresse, autorisez le micro/la caméra, puis rechargez la page. » |
| `NotFoundError` / `DevicesNotFoundError` | « Aucun micro/caméra détecté. Branchez un appareil puis réessayez. » |
| `NotReadableError` / `TrackStartError` | « Un autre logiciel utilise déjà votre micro/caméra (Zoom, Teams, autre onglet…). Fermez-le puis réessayez. » |
| `OverconstrainedError` | « Votre matériel ne répond pas aux contraintes demandées. Réessayez. » |
| Page non HTTPS / `SecurityError` | « Cette page doit être ouverte en HTTPS pour autoriser le micro et la caméra. » |
| Autre | message générique actuel |

Au mount, appeler `navigator.permissions.query({ name: 'microphone' })` et `'camera'` (quand l'API existe) pour pré-détecter un refus persistant et afficher direct le bon message sans relancer un prompt qui sera refusé en silence.

### B. Reconnaissance vocale rendue non-bloquante

Aujourd'hui `sttStatus === "ok"` est requis pour activer « Commencer la session » → blocage total sur Firefox desktop, Brave, certains Android.

Changement :
- Retirer `sttStatus === "ok"` de `canContinue`.
- En cas d'échec, repasser le statut en **avertissement ambre** (pas erreur rouge) avec :
  > « La transcription en direct ne fonctionnera pas sur ce navigateur. L'entretien reste possible : vos réponses sont enregistrées et transcrites après coup. »
- Le candidat peut continuer normalement.

### C. Sérialisation des tests micro

`testMic` et `testRecorder` ouvrent actuellement deux `getUserMedia({audio})` en parallèle au mount → conflit de device sur Windows/Linux.

Fusion en un seul flux :
1. Un seul `getUserMedia({ audio })`.
2. On y branche **simultanément** l'`AnalyserNode` (niveau) et le `MediaRecorder` (test chunk).
3. À la fin (3 s), on ferme tout proprement.

### D. Vérification active du niveau micro

Aujourd'hui le test passe « ok » même si le candidat n'a rien dit (micro muet matériel, mauvais device, micro Bluetooth déconnecté).

Nouveau comportement :
- Pendant les 3 s, on garde un `peakLevel` (max observé).
- Si `peakLevel < 0.05` → statut **warning** :
  > « Nous n'avons pas détecté votre voix. Parlez plus fort, ou choisissez un autre micro ci-dessous. »
- Bouton « Refaire le test ».
- Reste non bloquant (warning), mais visible.

### F. Confirmation explicite du son

`playBeep` détecte l'autoplay bloqué mais pas le mode silencieux iPhone (interrupteur physique). Le contexte WebAudio « progresse » sans son audible.

Nouveau flow :
1. Clic « Tester le son » → joue le bip.
2. Affiche immédiatement : « Avez-vous entendu le bip ? » avec deux boutons **[Oui]** / **[Non, refaire]**.
3. **Oui** → `soundStatus = "ok"`.
4. **Non** → message :
   > « Vérifiez le bouton silencieux (côté gauche de l'iPhone), montez le volume, et débranchez vos écouteurs si besoin. »
   + relance `testSound`.

Si `playBeep` retourne `false` (autoplay bloqué) → on affiche directement l'erreur sans la question.

## Lot 2 — Confort

### E. Sélecteur de périphériques

Sous chaque carte Caméra et Micro, ajouter un `<Select>` listant `navigator.mediaDevices.enumerateDevices()` filtré par `kind` (`audioinput` / `videoinput`).

Comportement :
- Liste rafraîchie à `devicechange`.
- Changement de sélection → relance le test ciblé avec `{ deviceId: { exact: id } }`.
- Persistance dans `localStorage` (`interview.preferredAudioDeviceId` / `interview.preferredVideoDeviceId`).
- `InterviewStart.tsx` lira ces clés (lecture seule, fallback sur défaut système si absent).
- Sur navigateurs qui ne donnent les labels qu'après autorisation, on relance `enumerateDevices()` après le 1ᵉʳ `getUserMedia` réussi.

### I. Bandeau de bilan en haut quand bloqué

Quand au moins un test est en erreur **bloquante**, afficher en haut de page un encart résumé condensé :
- Liste 1-line de ce qui bloque (« Caméra refusée », « Aucun son »…).
- Bouton « Copier le lien pour ouvrir sur un autre appareil » (réutilise `copyLink` existant).

Évite au candidat de scroller pour comprendre le problème.

### J. Bouton « Passer les tests » contextuel

- Reste discret (lien minuscule actuel) tant qu'aucun test n'a échoué.
- Devient un **vrai bouton secondaire** visible quand :
  - Seuls des warnings non-bloquants restent (STT, niveau micro faible), OU
  - Le même test a échoué ≥ 2 fois (compteur de retries par test).
- Texte : « Continuer quand même ».

## Détails techniques

### Fichiers touchés

- **`src/pages/InterviewDeviceTest.tsx`** : refonte des handlers de test, nouveau state (warnings, peakLevel, deviceId courant, retryCount), UI bandeau + sélecteurs + question son.
- **`src/lib/deviceDiagnostics.ts`** *(nouveau)* :
  - `classifyMediaError(err: unknown): { kind, message }`
  - `queryPermissions(): Promise<{ mic: PermissionState | 'unknown', cam: ... }>`
  - `listDevices(): Promise<{ audio: MediaDeviceInfo[], video: MediaDeviceInfo[] }>`
- **`src/components/interview/DeviceSelector.tsx`** *(nouveau)* : petit `<Select>` réutilisable basé sur `@/components/ui/select`.
- **`src/pages/InterviewStart.tsx`** : lecture des `deviceId` préférés depuis `localStorage`, ajout aux `constraints` de `getUserMedia` si présents (modif minimale).

### Aucun changement

- Pas de migration BDD.
- Pas d'edge function.
- Pas de modification de `MicVolumeMeter` / `MicLevelMeter` / `MediaRecorderField`.
- Pas de refonte visuelle (mêmes cartes, mêmes couleurs).

### Reporté (pas dans cette itération)

- Lot 3 : test réseau enrichi (latence + upload), désactivation de l'auto-start sur iOS.