## Objectif
Fiabiliser définitivement la lecture de la question 15 sans supprimer l’autoplay tant que ce n’est pas prouvé nécessaire.

## Ce que j’ai confirmé
- Les sessions touchées ont bien **15 messages candidat et 15 clips vidéo** : le problème restant n’est donc pas simplement “la Q15 n’existe pas”.
- Les journaux de récupération montrent un motif systématique sur `q14.webm` : des **octets parasites avant l’en-tête EBML** ont été tronqués sur plusieurs sessions, ce qui confirme un défaut côté enregistrement/finalisation de la dernière question.
- Le code actuel de lecture vidéo a bien de l’autoplay, mais rien ne montre pour l’instant qu’il casse spécifiquement la Q15. Le symptôme historique pointe beaucoup plus vers un **recorder relancé trop tôt / plusieurs chemins qui démarrent l’écoute et l’enregistrement**.

## Plan
1. **Auditer le passage vers l’écoute après une question média**
   - Verrouiller le flux Q14 → Q15 pour qu’un seul chemin puisse lancer `startQuestionRecording()` et `startListening()`.
   - Neutraliser les doubles déclenchements possibles via fin de lecture, watchdog, reprise, ou bouton de secours.

2. **Rendre l’enregistrement idempotent par question**
   - Ajouter un garde-fou explicite par index/bloc actif pour empêcher qu’un ancien cycle démarre ou finalise un recorder sur la mauvaise question.
   - Séparer encore mieux l’état du recorder courant de tout callback obsolète.

3. **Améliorer le diagnostic visible et les traces**
   - Journaliser clairement : question visée, bloc courant, raison du démarrage, nombre de démarrages pour une même question, et cause exacte d’une récupération “skip / truncate / rebuild”.
   - Ajouter un état d’erreur plus précis côté lecteur si la vidéo existe mais échoue à charger ou si le clip ciblé ne correspond pas au message demandé.

4. **Vérifier le rattachement rapport → clip**
   - Sécuriser la correspondance entre `messageId`, `question_id` et clip vidéo dans le rapport pour éviter qu’un extrait Q15 valide soit mal ciblé ou qu’un refetch fasse sauter le mauvais clip.

5. **Valider avant de conclure**
   - Vérifier sur les cas touchés que la Q15 se recharge bien dans le lecteur.
   - Tester que les autres questions média et les relances ne régressent pas.

## Détails techniques
- Fichiers probablement concernés :
  - `src/pages/InterviewStart.tsx`
  - `src/components/session/SessionVideoNavigator.tsx`
  - `src/components/session/SessionReportView.tsx`
  - éventuellement `supabase/functions/recover-session-video/index.ts` si les traces doivent être enrichies
- Je **ne prévois pas de retirer l’autoplay en premier** : ce serait plutôt un contournement risqué qu’un correctif de fond. Si l’audit montre qu’il participe au double déclenchement, je le limiterai de façon ciblée, pas globalement.