## Bug : "Refaire" ne relance pas l'enregistrement

### Cause exacte

Dans `src/components/media/MediaRecorderField.tsx`, le bouton "Refaire" appelle directement `startRecording` sans nettoyer l'état précédent. Trois problèmes se cumulent :

1. **`previewUrl` reste défini** → le composant continue d'afficher la phase "preview" au lieu de basculer en "recording", car la condition `if (previewUrl)` est évaluée avant `if (recording)` dans le rendu. Le clic démarre bien `getUserMedia` mais l'UI ne montre jamais l'écran d'enregistrement (pas de preview vidéo, pas de bouton "Arrêter" visible côté utilisateur).

2. **Le blob URL précédent n'est jamais révoqué** → fuite mémoire à chaque "Refaire".

3. **`startRecording` est `async` et fait `await getUserMedia(...)` avant `new MediaRecorder()`** → conforme au gesture utilisateur sur la première fois, mais combiné au point 1, l'utilisateur a l'impression que rien ne se passe.

L'ordre des branches de rendu actuel :
```
if (recording) → écran d'enregistrement
if (previewUrl) → écran de preview   ← bloque "Refaire"
sinon → écran vide
```

Quand on clique "Refaire", `recording` passe à `true` mais `previewUrl` est aussi vrai → conflit possible selon l'ordre exact des `setState`. Même si React bascule, on garde l'ancien blob attaché aux refs `audioRef`/`playbackVideoRef`.

### Correctif

Modifier uniquement `src/components/media/MediaRecorderField.tsx` :

1. **Nouveau handler "Refaire"** qui :
   - Révoque l'ancien `previewUrl` s'il commence par `blob:`.
   - Reset `previewUrl`, `duration`, `playing` à zéro.
   - Stoppe la lecture en cours (`audioRef`/`playbackVideoRef`).
   - Appelle `startRecording()` immédiatement (toujours dans le même gesture utilisateur).

2. **Réordonner le rendu** pour que `recording` ait toujours la priorité absolue :
   ```
   if (recording) → enregistrement
   else if (previewUrl) → preview
   else → vide
   ```
   (déjà le cas, mais on sécurise en s'assurant que `previewUrl` est vidé avant d'appeler `startRecording`).

3. **Garantir le nettoyage des refs media** : remettre `srcObject = null` et `src = ""` sur les éléments audio/vidéo de preview avant de relancer.

4. **Bonus fiabilité** : s'assurer que `chunksRef.current = []` est bien remis à zéro (déjà fait ligne 106) et que `mediaRecorderRef.current` est remis à `null` après l'ancien `onstop` pour éviter qu'un appel à `stopRecording` lors d'un nouveau cycle ne stoppe l'ancien recorder.

### Test (à valider après build)

1. Enregistrer une vidéo intro → arrêter → "Refaire" → l'aperçu caméra réapparait, le bouton "Arrêter" est visible, l'enregistrement repart à 0:00.
2. Idem pour l'audio (intro et bibliothèque).
3. Faire 3 cycles enregistre/refaire de suite → toujours fonctionnel, pas de fuite (caméra/micro libérés entre chaque).
4. Tester sur viewport mobile (≤697px) → bouton "Arrêter" toujours accessible.

### Hors champ

- Pas de changement d'API du composant ni des intégrations (`StepIntro`, `IntroLibrary`, `QuestionFormDialog`).
- Pas de refonte visuelle.
