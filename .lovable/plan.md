## Objectif
Supprimer la cause racine du bug pause/reprise plutôt que d'essayer de le rattraper : interdire la mise en pause pendant que l'IA parle ou qu'un média de question est en lecture.

## Constat
- Le bug n'apparaît que lorsque la pause est déclenchée pendant la lecture TTS / média (état `isSpeaking = true`).
- Dans ce cas, le snapshot de reprise doit rejouer du média et relancer la STT, et un état intermédiaire (`isProcessing`, `isSpeaking`) reste parfois figé → le bouton « Ma réponse est terminée » ne réapparaît pas.
- Pendant la phase d'écoute du candidat, en revanche, la pause/reprise fonctionne sans souci (rien à rejouer côté IA).

## Changement (1 seul fichier)

**`src/pages/InterviewStart.tsx`** — bouton « Mettre en pause » (≈ ligne 3002) :

1. Ajouter `disabled={isSpeaking || isProcessing}` sur le `<Button>`.
2. Ajouter `disabled:opacity-40 disabled:cursor-not-allowed` à la classe.
3. Ajouter un `title` discret : « Disponible pendant votre réponse ».
4. Garder la pause automatique sur silence prolongé telle quelle — elle ne se déclenche déjà que pendant l'écoute, donc sans risque.

## Hors périmètre (volontairement)
- On ne touche pas à la logique interne de `pauseInterview` / `resumeInterview` : pas de régression possible sur les cas qui marchent déjà.
- Pas de watchdog supplémentaire ni de lien d'urgence dans l'overlay.

## Validation
- Pendant que l'IA pose une question (TTS ou média) → bouton « Mettre en pause » grisé.
- Dès que le bouton « Ma réponse est terminée » apparaît → bouton de pause cliquable.
- Reprise après pause → le bouton « Ma réponse est terminée » revient correctement (cas déjà fiable).