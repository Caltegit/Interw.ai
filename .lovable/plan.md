

## Enchaîner les questions immédiatement (traitement en background)

### Problème actuel

Quand le candidat clique sur « ✓ Ma réponse est finie », `handleSendResponse` dans `src/pages/InterviewStart.tsx` est `await`-é de bout en bout :
1. Sauvegarde du message candidat en DB
2. Appel à `ai-conversation-turn` (Lovable AI Gateway, ~2-5s)
3. Sauvegarde du message IA
4. Lecture TTS / média de la prochaine question

→ Le candidat voit un spinner « Traitement en cours… » pendant toute cette durée. Friction UX.

### Solution : fire-and-forget côté UI, pipeline en arrière-plan

On découple **le passage à la question suivante** (instantané, déterministe car la liste de questions est connue à l'avance via `projectContext.questions`) du **traitement IA** (transcription + analyse de la réponse, qui sert au rapport final mais pas au flux de l'entretien).

### Comportement cible

Au clic sur « Ma réponse est finie » :
1. **Immédiatement** (0ms) : 
   - Stop de la reconnaissance vocale
   - Snapshot du transcript candidat dans une variable locale
   - Incrément `currentQuestionIndex`
   - Affichage de la question suivante + auto-play du média (audio/vidéo) ou TTS de transition
   - Repassage en mode `isListening` dès que le média se termine
2. **En tâche de fond** (non-bloquant, pas d'`await` côté UI) :
   - `INSERT` du message candidat en DB
   - Appel `ai-conversation-turn` (sert juste à logger la transition IA pour le rapport)
   - `INSERT` du message IA
   - Erreurs loggées en console + toast discret si échec critique, mais ne bloquent JAMAIS le flux

### Cas particuliers à gérer

- **Dernière question** : après la dernière réponse, on déclenche la fin de l'entretien (navigation vers `/interview/complete`) sans attendre que les jobs background finissent. Un petit `Promise.allSettled` final avec timeout de 3s côté `handleEndInterview` pour laisser une chance aux derniers `INSERT` de finir avant la redirection — sinon on redirige quand même.
- **Question suivante de type TEXTE** : aujourd'hui le texte de transition vient de l'IA (`ai-conversation-turn`). Comme on n'attend plus l'IA, on génère localement une transition courte déterministe (ex : « Merci. Question suivante : {contenu} ») et on la lit en TTS. Le texte IA reste calculé en background pour le rapport mais n'est plus sur le chemin critique.
- **Question suivante audio/vidéo** : encore plus simple, on joue directement le média — pas besoin de l'IA pour la transition.
- **Ordre des messages en DB** : on utilise un compteur `messageOrderRef` incrémenté de façon synchrone à chaque snapshot, passé à l'`INSERT` en background → l'ordre est préservé même si les `INSERT` finissent dans le désordre.
- **État `isProcessing`** : devient inutile sur le chemin candidat. On le garde uniquement pour un petit indicateur discret en haut (« Sauvegarde… ») pendant que les jobs background tournent, sans bloquer l'interaction.

### Garde-fous

- Si `ai-conversation-turn` échoue (429, 402, 500), on log + toast non-bloquant. Le rapport final s'appuie sur les `session_messages` candidat (sauvegardés en background) + le transcript audio — la transition IA manquante n'est pas critique.
- Si l'`INSERT` du message candidat échoue, retry 1× après 2s. Si nouvel échec, toast d'avertissement + log. Le transcript local reste en mémoire jusqu'à la fin de l'entretien comme filet de sécurité.

### Fichier modifié

- `src/pages/InterviewStart.tsx` uniquement (refactor de `handleSendResponse` + ajustement de `handleEndInterview` pour le flush final).

### Hors scope

- Pas de changement de l'edge function `ai-conversation-turn` (elle reste appelée, juste plus en `await` côté UI).
- Pas de changement du flux d'auto-skip sur silence (reste un garde-fou).
- Pas de changement de la génération du rapport final.

