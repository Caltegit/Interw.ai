

## Plan : Stabiliser séquence candidat + pause/reprise relit la question

### 🔴 Bugs identifiés en lecture

**1. Pause/Reprise ne relit PAS la question (le bug remonté)**
- `pauseInterview` détecte `duringQuestion = isSpeaking || !isListening` → faux pour les questions **texte écrit pur** (TTS lit le greeting puis on devrait écouter, mais si on pause pendant un état transitoire ça part en faux positif).
- À la reprise, `featuredPlayerRef.current?.restart()` ne marche **que pour audio/video** (média avec `<audio>`/`<video>`). Pour une **question lue par TTS via `speak()`**, il n'y a aucun replay → on relance seulement le watchdog mais pas la voix IA.
- Conclusion : il faut **stocker le texte/média en cours** + à la reprise, rejouer **selon le type** (TTS pour texte, restart() pour média).

**2. STT — closure stale sur `isListening` (déjà identifié)**
- `recognition.onend` lit `isListening` depuis la closure → toujours `false` à la création. La reconnaissance ne redémarre jamais quand Chrome la coupe naturellement (~30-60s) → micro mort silencieusement.
- Fix : utiliser `isListeningRef`.

**3. STT — pas d'auto-restart sur `onerror` "no-speech"**
- Chrome déclenche souvent `no-speech` → end → micro coupé pour le reste de la question.
- Fix : sur `no-speech`, redémarrer automatiquement si toujours en phase d'écoute.

**4. `MicVolumeMeter` — AudioContext peut rester `suspended`**
- Sur Chrome strict, `new AudioContext()` démarre `suspended` sans user gesture immédiat → vu-mètre figé à 0.
- Fix : `ctx.resume()` après création + retry si encore suspendu.

**5. Pause pendant intro IA (greeting) avant Q1**
- Si on met en pause pendant que l'IA dit "Bonjour…", à la reprise rien ne se passe (greeting perdu).
- Fix : tracker aussi le **texte TTS en cours** dans une ref + rejouer.

### ✅ Solution

**A. Tracker la "présentation en cours"**
Nouveau ref `currentPresentationRef` avec :
```ts
{ kind: 'tts' | 'media', text?: string, mediaType?: 'audio'|'video' }
```
- Renseigné à chaque appel à `speak()` et avant `setShouldAutoPlay(true)`.
- Cleared quand on passe en `listening`.

**B. `pauseInterview`**
- Considérer "pendant question" si `currentPresentationRef.current !== null`.
- Cancel TTS, stop player, stop STT (déjà fait).

**C. `resumeInterview`**
- Si `currentPresentationRef.current.kind === 'tts'` → `await speak(text)` puis enchaîner sur `forceStartListening()`.
- Si `kind === 'media'` → `featuredPlayerRef.current?.restart()` + watchdog (déjà fait, mais on s'assure que `shouldAutoPlay` est remis).
- Sinon → reprise phase d'écoute (déjà fait).

**D. STT robuste**
- Ajouter `isListeningRef = useRef(false)` synchronisé avec `setIsListening`.
- `recognition.onend` : si `isListeningRef.current` → restart.
- `recognition.onerror` : sur `no-speech` → restart si toujours en écoute, ne pas couper.

**E. MicVolumeMeter**
- Après `new AudioContext()` → `await ctx.resume()`.
- Si `ctx.state !== 'running'` après 500ms → log warning.

**F. Texte du bouton "Mettre en pause"**
- Aujourd'hui sur le footer toujours visible → OK.
- Préciser dans l'overlay : "La question va être rejouée depuis le début" (déjà fait pour média, étendre à TTS).

### Fichiers modifiés
- `src/pages/InterviewStart.tsx` — ref de présentation, pause/reprise complète, STT robuste avec ref
- `src/components/interview/MicVolumeMeter.tsx` — `ctx.resume()`

### Test final
1. Lancer entretien → pause pendant greeting IA → reprendre → l'IA redit "Bonjour…" depuis le début, puis on enchaîne Q1.
2. Pause pendant question audio → reprendre → audio rejoué depuis 0.
3. Pause pendant question vidéo → reprendre → vidéo rejouée depuis 0.
4. Pause pendant question texte lue par TTS → reprendre → TTS relit toute la question.
5. Pendant réponse candidat, parler 70s sans interruption → micro ne doit plus couper (auto-restart STT).
6. Vérifier vu-mètre réagit dès la 1ère question (plus figé à 0).
7. Vérifier logs `[interview]` en console pour tracer chaque transition.

