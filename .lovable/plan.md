# Les candidats n'apparaissent plus sur « Première étape Castalie »

## Ce que disent les données

Pour ce projet : 747 sessions au total, **142 terminées**, dont **130 avec un rapport généré**.
Le tableau de bord affiche 142 (sessions terminées) ; la page projet, elle, n'affiche que les sessions terminées **avec rapport**, soit 130.

## Cause confirmée

La règle actuelle est déjà « terminée + rapport » — donc ta proposition correspond au comportement voulu, ce n'est pas elle le problème.

Le vrai bug : la page charge les rapports en listant **tous les identifiants de session dans l'URL**. Avec 747 sessions, l'adresse fait 29 000 caractères et le serveur répond **400 Bad Request**. Aucun rapport n'est reçu → la liste tombe à `0 / 0` et toutes les pastilles à zéro. Le souci n'apparaît que sur les projets à fort volume.

Réponse directe : oui, en corrigeant ce chargement, les candidats remontent — **130** dans la liste projet (les 12 restants sont terminés sans rapport exploitable).

## Correctif

Dans `src/pages/ProjectDetail.tsx` :

1. Charger les rapports **par projet** au lieu de par liste d'identifiants :
   `from("reports").select("id, session_id, overall_score, recommendation, sessions!inner(project_id)").eq("sessions.project_id", id)`
   → une requête courte quel que soit le volume.
2. Repli par lots de 200 identifiants si la jointure échoue, pour ne rien casser.
3. Afficher une erreur explicite si le chargement des rapports échoue, au lieu d'une liste vide silencieuse.
4. Conserver la règle « terminée + rapport » pour la liste, et aligner le compteur du tableau de bord sur la même règle pour éviter l'écart 142 / 130.

## Vérification

Recharger la page Castalie : la liste doit afficher les candidats évalués et les pastilles de sélection renseignées. Contrôle aussi sur un petit projet pour vérifier l'absence de régression.
