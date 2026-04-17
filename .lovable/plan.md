

## Bouton "Mettre en pause" candidat — version finale

### 1. Base de données
Migration : ajouter colonne `allow_pause` (boolean, NOT NULL, default `false`) sur `projects`.

### 2. Création / édition de projet — étape "Publication"
Fichiers : `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx`
- State `allowPause` (défaut `false`)
- Switch après "Passage auto 3s" :
  - Label : **"Autoriser le candidat à mettre en pause"**
  - Aide : "Affiche un bouton 'Pause' pendant l'entretien. Le candidat peut figer l'interview et reprendre exactement où il s'était arrêté."
- Sauvegarde `allow_pause` dans `insert` / `update`
- Récap : "Pause autorisée : Oui/Non"

### 3. Interface candidat — comportement de pause
Fichier : `src/pages/InterviewStart.tsx`

**Bouton Pause (en bas, à droite de "Arrêter l'entretien")**
- Affiché uniquement si `project?.allow_pause === true`
- Icône `Pause` + label "Mettre en pause"
- Au clic → déclenche le mode pause

**Mode pause (gel total de l'interface)**
Quand `isPaused === true` :
- **STT** : `stopListening()` (arrête la reconnaissance vocale)
- **TTS** : `window.speechSynthesis.cancel()` + `setIsSpeaking(false)`
- **Recording** : `questionRecorderRef.current?.pause()` (MediaRecorder pause natif)
- **Tous les timers** clearés : silence, max-duration, auto-skip, countdown
- **Snapshot du temps écoulé** stocké pour reprendre le timer max-duration au bon endroit (`pausedElapsedRef`)

**Overlay visuel "figé / grisé"**
- Overlay plein écran `fixed inset-0 z-50` au-dessus de toute l'interface candidat
- Fond : `bg-[#1a1a1a]/85 backdrop-blur-md` (assombrit + flou tout ce qu'il y a derrière)
- Centré : grand bouton **"REPRENDRE"**
  - Très grande taille : `h-20 px-12 text-xl font-semibold`
  - Style doré Morning : `bg-gradient-to-r from-[#d4a574] to-[#c4955e] text-[#1a1a1a]`
  - Icône `Play` (24px) à gauche du texte
  - Halo : `shadow-2xl shadow-[#d4a574]/40`
- Petit texte au-dessus : "Entretien en pause" (crème `text-[#f5f0e8]/70`)
- Petit texte en dessous : "Cliquez pour reprendre exactement où vous vous êtes arrêté(e)"

**Reprise (`resumeInterview`)**
- `questionRecorderRef.current?.resume()` (reprend l'enregistrement)
- Recalcul du temps restant max-duration : `remaining = maxDurationMs - pausedElapsedRef`
- Relance `maxDurationTimerRef` avec `remaining`
- Relance `startListening()` (STT) + `resetSilenceTimer()`
- `setIsPaused(false)` → l'overlay disparaît, l'interview reprend exactement au même point

### Fichiers touchés
- 1 migration SQL
- `src/pages/ProjectNew.tsx` — switch + state + insert + récap
- `src/pages/ProjectEdit.tsx` — switch + state + update
- `src/pages/InterviewStart.tsx` — bouton Pause conditionnel + overlay REPRENDRE + logique pause/resume avec préservation du temps écoulé

