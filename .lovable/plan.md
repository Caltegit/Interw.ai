

## Lien "Passer la question" sous la colonne recruteur

### Comportement

Dans `src/pages/InterviewStart.tsx`, ajouter un lien discret « Passer la question » sous la colonne de gauche (côté IA/recruteur, qui contient l'avatar/vidéo IA + le bloc question), juste en dessous du `QuestionMediaPlayer`.

- Style : petit lien souligné, `text-xs text-muted-foreground hover:text-foreground` — cohérent avec le lien « Passer » de l'écran de vérification technique (`InterviewDeviceTest.tsx`).
- Aligné à gauche, avec un petit espace au-dessus.
- Visible uniquement quand l'entretien n'est pas terminé et qu'on n'est pas en train de traiter une réponse (`!interviewFinished && !isProcessing`).
- Désactivé/caché à la dernière question (sinon « passer » mène nulle part) — on l'affiche seulement si `currentQuestionIndex < questions.length - 1`.

### Action au clic — `handleSkipQuestion`

Réutiliser la logique existante de transition vers la question suivante :

1. Stop écoute + reset transcript en cours (`stopListening()`, `candidateTranscriptRef.current = ""`, `setLiveTranscript("")`, `clearAutoSkip()`).
2. Stop l'enregistrement vidéo de la question en cours et upload (`stopAndUploadQuestionVideo`) — comme dans `handleSendResponse`.
3. Persister un message candidat marqueur (« [Question passée] ») lié à la question courante, avec le `videoSegmentUrl` éventuel — pour que le rapport sache que la question a été sautée.
4. Avancer à la question suivante : `setCurrentQuestionIndex(prev => prev + 1)`, mettre à jour `messages` avec un message AI court de transition (ex : « Passons à la question suivante. ») + le contenu de la question suivante, et déclencher la lecture média/TTS comme le fait `handleSendResponse` (auto-play pour audio/vidéo, ou TTS + start listening pour écrite).
5. Pas d'appel à l'edge function `ai-conversation-turn` — on saute directement, pas besoin de générer une relance IA.

### Hors scope
- Pas de confirmation modale (le lien reste discret, c'est intentionnel).
- Pas de comptage du nombre de questions passées dans le rapport (le marqueur en DB suffit pour l'instant).

