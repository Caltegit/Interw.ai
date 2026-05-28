## Objectif

Empêcher qu'un entretien démarre sans micro fonctionnel, sans ajouter de surveillance pendant l'entretien (zéro risque de faux positif en cours de session).

Couverture estimée : ~95 % des cas (mauvais micro par défaut, mute hardware, permissions, casque mal branché) + les cas où le candidat change de device entre le test et le start (détecté au warmup).

Non couvert volontairement : débranchement physique ou coupure système **pendant** l'entretien (sera traité plus tard si nécessaire, après observation des cas réels).

## Ce qui change

### 1. Test technique réellement bloquant (`src/pages/InterviewDeviceTest.tsx`)

Aujourd'hui le test mesure le micro mais on peut passer outre. On rend le passage obligatoire :

- Le bouton **« Continuer »** reste désactivé tant que la mesure n'a pas validé `peak >= MIC_THRESHOLDS.TEST_PEAK_MIN` (0.10) **et** `activeMs >= MIC_THRESHOLDS.TEST_ACTIVE_MS_MIN` (800 ms).
- Si la mesure échoue : message clair (« On ne vous a pas entendu. Vérifiez que le bon micro est sélectionné, parlez plus fort, puis relancez le test. ») + bouton **« Refaire le test »**. Pas de contournement.
- À la validation, on persiste dans `sessionStorage` sous la clé `mic-test-validated:${sessionId}` :
  ```json
  { "deviceId": "<deviceId>", "validatedAt": <timestamp>, "peak": 0.21, "activeMs": 1340 }
  ```

### 2. Warmup bloquant à l'entrée d'entretien (`src/pages/InterviewStart.tsx`)

Au moment où le stream micro est acquis (avant la 1ère question), on fait une mesure courte de **1,5 s** via `measureMicLevel()` déjà existant.

Deux contrôles séquentiels :

**a. Vérification du device** : on compare `streamRef.current.getAudioTracks()[0].getSettings().deviceId` au `deviceId` stocké dans `sessionStorage`. S'ils diffèrent → on n'échoue pas tout de suite, on continue la mesure (le candidat a peut-être délibérément changé de micro et celui-ci fonctionne).

**b. Vérification du niveau** : si `peak <= MIC_THRESHOLDS.WARMUP_SILENCE_MAX` (0.01) OU `track.muted === true` → on bloque le démarrage.

En cas de blocage, on affiche un nouveau composant `MicBlockingDialog` (modal plein écran, non-dismissible) :

- Titre : **« Micro non détecté »**
- Texte : explique que le micro semble coupé ou inaudible, propose de vérifier le sélecteur système / le casque.
- Sélecteur de micro (réutilise `DeviceSelector`) pour basculer sans quitter l'écran.
- Bouton **« Refaire le test technique »** → redirige vers `/interview/:slug/test` en effaçant la validation `sessionStorage`.
- Bouton **« Réessayer »** → relance le warmup.

Le stream existant est conservé (pas de re-`getUserMedia` si le candidat ne change pas de device), pour éviter les race conditions avec le MediaRecorder.

### 3. Aucun listener pendant l'entretien

On ne touche **pas** au reste de `InterviewStart.tsx`. Pas de `track.onmute`, pas de `devicechange`, pas de circuit breaker. La détection a posteriori dans le rapport (lot précédent déjà livré) reste le filet de sécurité pour les rares cas qui passent entre les mailles.

## Détails techniques

**Fichiers modifiés :**
- `src/pages/InterviewDeviceTest.tsx` — désactiver le bouton tant que le seuil n'est pas atteint, persister la validation.
- `src/pages/InterviewStart.tsx` — appel `measureMicLevel(stream, 1500)` après acquisition du stream, avant le démarrage de la 1ère question. Affichage conditionnel du dialog.
- `src/components/interview/MicBlockingDialog.tsx` — **nouveau**, basé sur le `Dialog` shadcn existant.

**Fichiers non modifiés :** `src/lib/micLevel.ts` (les seuils existent déjà), pas de migration BDD, pas d'edge function.

**Tests :**
- Le test E2E `candidate-journey.spec.ts` continuera de passer car Playwright utilise `--use-fake-device-for-media-stream` qui génère un signal audible (au-dessus des seuils).
- Ajout possible d'un test ciblé pour vérifier que le dialog s'affiche quand on force `peak = 0`, mais optionnel.

## Hors scope

- Détection des coupures pendant l'entretien (option B/C discutées plus tôt).
- Nouvelle UI sur l'écran de test (on garde le visuel existant, on ajoute juste l'état désactivé et le message d'échec).
