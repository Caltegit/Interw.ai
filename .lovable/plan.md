## Ce qui est en place aujourd'hui

Il y a **5 couches de vérif micro** qui s'empilent, dont 3 actives simultanément pendant l'entretien :

1. **Test technique** (`InterviewDeviceTest.tsx`) — avant l'entretien
   - `getUserMedia` + mesure RMS 6 s via `measureMicLevel` + `MediaRecorder` en parallèle.
   - Valide si `peak ≥ 0.10` ET `activeMs ≥ 800 ms`.
   - Si OK : stocke `sessionStorage["mic-test-validated:{token}"]` avec `deviceId + validatedAt + peak`.

2. **Warmup bloquant** (`InterviewStart.tsx` lignes 2384-2451) — juste après « Démarrer »
   - Remesure 1.5 s via `measureMicLevel`.
   - Si piste muted OU `peak ≤ 0.01` → ouvre `MicBlockingDialog` bloquante (« Réessayer / Refaire le test »).
   - Boucle while jusqu'à OK.
   - **C'est lui qui s'est déclenché chez toi alors que le test était bon.**

3. **useMicHealthWatcher** (pendant l'entretien) — surveillance continue
   - Écoute `track.onmute / onended` → bascule en `"track-dead"` (bannière rouge bloquante + bouton réacquérir).
   - Mesure RMS en continu : 12 s sans signal + 2 ticks consécutifs → `"silent"` (bannière jaune).
   - Affiche `MicFailureBanner`.

4. **STT watchdog** (`InterviewStart.tsx` lignes 1240-1286) — toutes les 2 s
   - Son propre `AudioContext` + `analyser` redondants avec ceux du watcher.
   - Si STT muet >10 s ET RMS plat >10 s → `noMicSignal=true` (autre bannière).
   - Si STT muet >10 s → relance `recognition.stop()` (course condition avec le watcher).

5. **Auto-pause silence** (`resetSilenceTimer`) — fin du palier silence
   - Met l'entretien en pause + annonce TTS « vérifiez votre micro ».

**Bugs principaux** :
- Trois `AudioContext` concurrents sur le même `MediaStream` (warmup → watcher → STT watchdog) → certains navigateurs renvoient des mesures à zéro sur le 2ᵉ et 3ᵉ.
- Le warmup re-mesure ce qui vient d'être validé 30 s plus tôt par le test → faux positifs si le candidat n'a pas reparlé entre-temps.
- `track.muted` est un évènement *transient* sur Chrome/macOS au démarrage : `useMicHealthWatcher` peut basculer en `track-dead` à tort.
- STT watchdog qui `recognition.stop()` pendant que le watcher mesure encore → relance la recognition, qui re-déclenche `track.onmute` sur certains setups → boucle.

## Plan de simplification

**Principe** : une fois le test technique passé (< 30 min), on fait confiance. On enlève la mesure bloquante au démarrage, on supprime le STT watchdog redondant, et on durcit le test technique pour qu'il soit vraiment fiable.

### 1. Renforcer le test technique (`InterviewDeviceTest.tsx`)
- Garder la mesure RMS 6 s + MediaRecorder.
- **Ajouter** une vérification finale `track.readyState === "live" && !track.muted` avant validation.
- **Ajouter** une passe SpeechRecognition de 3 s pour confirmer que le STT capte au moins un résultat (skipped silencieusement si l'API n'est pas dispo).
- Persister la validation **30 min** (au lieu de 10) avec `deviceId` exact.

### 2. Supprimer le warmup bloquant (`InterviewStart.tsx`, ~2384-2451)
- Si `sessionStorage["mic-test-validated:{token}"]` existe ET < 30 min ET la piste audio actuelle a le **même `deviceId`** ET `readyState === "live"` → **on saute la mesure de warmup, on démarre directement**.
- Sinon (cas rare : refresh, nouveau périphérique) : `MicBlockingDialog` qui propose **« Refaire le test technique »** comme unique action, plus de boucle de remesure.
- Le hook `MicBlockingDialog` reste, mais ne sert plus que pour ce cas.

### 3. Supprimer le STT watchdog redondant
- Retirer le bloc lignes 1240-1286 (`micAnalyserRef` + `sttWatchdogRef` + état `noMicSignal`).
- Conserver uniquement le redémarrage de `recognition` après 10 s sans résultat (logique pure STT, sans mesure RMS).

### 4. Adoucir `useMicHealthWatcher`
- `silentThresholdMs` 12 s → **20 s** ; `SILENT_CONFIRM_TICKS` 2 → **3**.
- **Ne plus basculer en `track-dead` sur `track.muted`** (event transient non fiable). Garder seulement `track.onended` (= micro vraiment débranché) et `readyState !== "live"`.
- Supprimer la grâce 1.5 s `track_muted_initial` qui devient inutile.

### 5. Mutualiser l'analyser RMS
- Nouveau hook `useSharedMicLevel(stream, active)` qui ouvre **un seul** `AudioContext` + `AnalyserNode` par stream et expose `rmsRef` (ref polled à 60 fps).
- `useMicHealthWatcher` et `MicVolumeMeter` lisent ce ref au lieu d'instancier leurs propres analysers.

### 6. Réacquisition micro
- Inchangée, mais ne plus déclencher automatiquement : reste uniquement le bouton manuel dans `MicFailureBanner` lorsque `track.ended` est avéré.

## Hors périmètre

- Pas de changement de l'auto-pause silence (UX volontaire pour le candidat).
- Pas de modif du test caméra / son.
- Pas de changement de l'overlay boot ni des stats serveur.

## Détails techniques

| Fichier | Changement |
|---|---|
| `src/lib/micLevel.ts` | Ajouter helper `isMicTestStillValid(token, currentDeviceId)` |
| `src/pages/InterviewDeviceTest.tsx` | Vérif `readyState/muted` finale + passe STT + TTL 30 min |
| `src/pages/InterviewStart.tsx` | Supprimer warmup loop + STT watchdog ; nouveau garde `isMicTestStillValid` |
| `src/hooks/useMicHealthWatcher.ts` | Seuils élargis, retrait du `track.muted` initial |
| `src/hooks/useSharedMicLevel.ts` *(nouveau)* | Analyser unique mutualisé |
| `src/components/interview/MicVolumeMeter.tsx` | Consomme `useSharedMicLevel` |
| `src/components/interview/MicBlockingDialog.tsx` | Mode « test technique requis » uniquement |
