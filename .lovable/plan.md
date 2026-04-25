## Diagnostic

Session `f3632288...` : 5 vidéos candidat bien enregistrées en base, mais le rapport a `question_evaluations: {}` et `highlight_clips: []`. L'IA Gemini n'a pas renvoyé l'évaluation par question (champ non obligatoire dans le tool call + très peu de paroles candidat : 1124 caractères pour 5 questions, durée 1m58).

Conséquences :
- **Onglet Questions** vide car la boucle d'affichage est pilotée uniquement par `question_evaluations` → les vidéos existantes ne sont jamais montrées
- **Onglet Best-of** vide car `highlight_clips` est vide
- **Stats** : pas de "top moment"

## Plan en 3 volets

### 1. Fix UI : toujours afficher les vidéos candidat (`SessionDetail.tsx`)

Refondre l'onglet **Questions** pour qu'il affiche **toujours** les vidéos du candidat, même sans évaluation IA :
- Construire la liste à partir des `candidateVideos` (avec `question_id`), pas de `question_evaluations`
- Pour chaque vidéo, joindre l'évaluation IA correspondante via `question_id` (matching fiable au lieu de l'index fragile)
- Afficher le score + commentaire IA quand dispo, sinon juste la vidéo + le texte de la question (récupéré depuis le message AI précédent ou la table `questions`)
- Ajouter un message discret "Évaluation IA non disponible pour cette question" si pertinent

Fallback **Best-of** : si `highlight_clips` est vide mais qu'on a des vidéos, proposer un mini best-of basé sur l'ordre chronologique (top 3 vidéos par défaut), au lieu d'afficher "Best-of indisponible".

### 2. Fix génération : rapport robuste (`generate-report/index.ts`)

- Ajouter `question_evaluations` à `required` du tool call → force Gemini à le produire
- Renforcer le prompt système : exiger une évaluation pour **chaque question posée** (lister explicitement les N questions dans le user prompt)
- Améliorer le mapping vidéo → utiliser `question_id` du message candidat plutôt que l'index dans le tableau (plus fiable avec follow-ups)
- Fallback côté code : si `question_evaluations` est vide après l'appel IA, générer un évaluation minimale par défaut (question + score 0 + "non évaluée") pour que les vidéos s'affichent quand même
- Highlights par défaut : si pas d'évaluations, prendre les 3 premières vidéos chronologiques

### 3. Régénérer le rapport de la session signalée

Une fois les fixes déployés :
- Supprimer le rapport actuel de `f3632288-da28-46a8-be5a-54b784cf6d2e` via migration ponctuelle (ou le supprimer manuellement via `read_query` + delete)
- Relancer `generate-report` pour cette session via `curl_edge_functions`
- Vérifier que les vidéos et le best-of apparaissent bien sur la page

## Hors scope
- Refonte du player Best-of (déjà fonctionnel)
- Réenregistrement des vidéos manquantes (toutes présentes en base)
- Migration pour stocker un mapping `message_id → highlight_clip` (pas nécessaire)
