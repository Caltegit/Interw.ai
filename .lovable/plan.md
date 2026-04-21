

## Plan — Mode « salle d'examen » pour l'entretien candidat

Quatre protections à ajouter autour de la session d'entretien, dans `src/pages/InterviewStart.tsx` (et un petit ajout BDD pour la reprise).

### 1. Plein écran au démarrage

- Au clic sur « Commencer la session » (ou dès la première question lue), appel `document.documentElement.requestFullscreen()`.
- Si le candidat sort du plein écran (touche Échap), on n'interrompt pas l'entretien mais on affiche un bandeau discret en haut : « Revenir en plein écran » (bouton). Pas de blocage agressif.
- Sur mobile (où le plein écran est limité / non pertinent), on détecte et on n'essaie pas — pas d'erreur visible.

### 2. Avertissement avant fermeture

- Pendant que la session est `in_progress`, on attache un listener `beforeunload` qui déclenche le prompt natif du navigateur.
- On retire le listener dès que la session passe en `completed` ou est explicitement abandonnée, pour ne pas bloquer la redirection finale.

### 3. Reprise de session

- **BDD** : ajouter `sessions.last_question_index` (int, défaut 0) et `sessions.last_activity_at` (timestamptz). Migration simple, pas d'impact sur l'existant.
- **Côté candidat** : à l'ouverture de `/interview/:slug/start/:token`, si la session existe déjà avec `status = 'in_progress'` et au moins un message dans `session_messages`, afficher un écran « Reprendre votre entretien ? » avec deux boutons : *Reprendre* (recharge l'historique depuis `session_messages` et repart à `last_question_index`) ou *Recommencer* (réinitialise les messages et repart à 0).
- Mise à jour de `last_question_index` à chaque passage de question, et `last_activity_at` au fil de l'eau (heartbeat léger toutes les 30 s).

### 4. Verrouillage de la navigation

- Bloquer le retour arrière du navigateur pendant l'entretien : `history.pushState` au démarrage + listener `popstate` qui re-pousse l'état (le bouton retour ne fait rien).
- Aucun lien sortant n'est affiché pendant l'entretien (à vérifier dans le layout candidat — déjà minimal, juste le logo org en header). Si besoin, retirer tout lien cliquable du header pendant `in_progress`.

### Fichiers touchés

- `src/pages/InterviewStart.tsx` — plein écran, beforeunload, blocage popstate, heartbeat, écran de reprise.
- `src/components/CandidateLayout.tsx` — désactiver le clic sur le logo pendant l'entretien (mode `minimal`).
- **Migration SQL** — ajouter `last_question_index` et `last_activity_at` à `sessions`.

### Hors champ

- Pas de plein écran forcé / verrouillé (impossible techniquement sans extension, et hostile UX).
- Pas de détection de changement d'onglet / triche (sujet séparé, à traiter plus tard si besoin).
- Pas de modification du flux RH ni des autres pages candidat.

