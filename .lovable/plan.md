# Les 142 candidats n'apparaissent plus sur « Première étape Castalie »

## Cause confirmée

La page projet charge bien les 744 sessions du projet (réponse 200, 473 Ko). Ensuite, elle demande les rapports en listant **tous les identifiants de session dans l'URL** : l'adresse fait 29 000 caractères et le serveur répond **400 Bad Request**.

Or la liste des candidats n'affiche qu'une session « terminée **et** avec rapport ». Sans rapports, la liste est vide : `0 / 0` et toutes les pastilles à zéro. Le problème apparaît dès qu'un projet dépasse quelques centaines de sessions — d'où Castalie, et pas les projets plus petits.

## Correctif

Dans `src/pages/ProjectDetail.tsx` :

1. Remplacer la requête `reports ... .in("session_id", [744 ids])` par une requête filtrée **par projet** via la jointure :
   `from("reports").select("id, session_id, overall_score, recommendation, sessions!inner(project_id)").eq("sessions.project_id", id)`
   → une seule requête courte, quel que soit le nombre de sessions.
2. Garder un repli par lots (paquets de 200 identifiants) si la jointure renvoie une erreur, pour ne rien casser.
3. Afficher un message d'erreur explicite si le chargement des rapports échoue, au lieu d'une liste vide silencieuse.

## Vérification

Recharger la page du projet Castalie : le compteur doit afficher les candidats évalués, et les pastilles de sélection doivent être renseignées. Contrôle également sur un projet de petite taille pour vérifier l'absence de régression.
