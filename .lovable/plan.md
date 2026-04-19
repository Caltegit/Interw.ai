

## Plan : Fiabiliser l'enchaînement des questions côté candidat

### Diagnostic

Le freeze sur "Préparation…" arrive parce que la transition vers la question suivante dépend d'une **chaîne fragile d'événements asynchrones** qui peut casser à plusieurs endroits :

1. **TTS (synthèse vocale IA)** : si `speechSynthesis.speak()` ne déclenche pas son `onend` (cas connus : navigateur en arrière-plan, Chrome qui coupe après 15s, voix non chargée), l'UI reste figée.
2. **Appel à `ai-conversation-turn`** : si l'edge function met du temps ou échoue silencieusement, on attend la réponse texte sans timeout côté client.
3. **Lecture du média question (audio/vidéo)** : on a déjà mis un watchdog dans `QuestionMediaPlayer`, mais la transition qui *précède* la lecture (intro IA → média) n'a pas de garde-fou.
4. **Pas d'état machine clair** : on enchaîne `setState` (`isPreparing`, `isAiSpeaking`, `isPlayingQuestion`, `isListening`) qui peuvent se croiser et bloquer si un event manque.

### Solution

**A. Watchdog global "Préparation…"**
Dans `InterviewStart.tsx`, dès qu'on entre en état `isPreparing` (ou équivalent), armer un timer de **10 secondes**. Si on n'a pas avancé dans la machine d'état → forcer le passage à l'étape suivante (lecture média ou écoute candidat) + log warning.

**B. Bouton de secours visible après 4s**
Si "Préparation…" dure > 4s, afficher un petit bouton ghost **"Continuer →"** sous l'indicateur, qui force manuellement l'avancée. Le candidat n'est plus jamais bloqué.

**C. Timeout sur l'appel `ai-conversation-turn`**
Wrapper l'appel `supabase.functions.invoke('ai-conversation-turn', …)` avec `Promise.race` + timeout 8s. Si timeout → fallback : on saute la transition IA et on enchaîne directement sur la lecture du média de la question suivante.

**D. TTS robuste**
- Ajouter `onerror` sur l'utterance.
- Armer un timer de sécurité = `(longueur texte / 15) + 4s` qui force `onend` si rien ne se passe.
- Si la voix demandée n'est pas dispo (`voices` vide), enchaîner directement sans TTS.

**E. État machine simplifié**
Introduire un seul `phase` enum : `idle | ai_intro | playing_question | listening | processing_answer | finished`. Toutes les transitions passent par une fonction `goToPhase(next)` qui clear les watchdogs précédents et arme le nouveau. Évite les états croisés.

**F. Logs de diagnostic**
Ajouter `console.log("[interview] phase:", from, "→", to, reason)` à chaque transition pour qu'on puisse débugger les prochains cas en regardant les logs.

### Fichiers modifiés
- `src/pages/InterviewStart.tsx` — phase machine + watchdogs + bouton secours + timeout invoke + TTS robuste

### Test final
1. Entretien complet nominal → enchaînement fluide
2. Couper le réseau juste avant la question 2 → watchdog 10s débloque OU bouton "Continuer" visible à 4s
3. Onglet en arrière-plan pendant que l'IA parle → TTS watchdog débloque
4. Question média qui ne charge pas → on passe quand même à l'écoute (watchdog déjà en place dans QuestionMediaPlayer)
5. Vérifier logs `[interview] phase: …` dans la console pour tracer chaque transition

