## Problème

Sur le dashboard, la liste "Derniers projets actifs" est actuellement triée par la date de **création** de la dernière session (y compris les sessions encore en attente, jamais passées). Résultat : un projet où un candidat a juste cliqué sur le lien (session créée mais pas faite) remonte en haut, même si aucun entretien n'a réellement eu lieu depuis.

Exemple actuel (vérifié en base) : « Morning, votre premier entretien. » apparaît en 1ᵉʳ car une session a été créée le 14/06, alors que son dernier entretien réellement complété date du 03/06. « Morning, votre premier entretien ! » (dernier entretien terminé le 12/06) devrait passer devant.

## Correctif

Dans `src/hooks/queries/useDashboardData.ts`, changer le critère de tri des `recentProjects` :

- Récupérer pour chaque projet la date de la dernière session **complétée** (`status = 'completed'`, `is_demo = false`), via `completed_at` (avec repli sur `created_at` si `completed_at` est nul).
- Trier les projets ayant au moins un entretien terminé par cette date décroissante.
- Compléter (comme aujourd'hui) avec les projets sans entretien terminé, classés par date de création du projet.

## Détails techniques

- Remplacer l'embed actuel `sessions_dates:sessions(created_at)` (qui prend toutes les sessions, y compris pending) par un embed filtré sur les sessions complétées non démo, en récupérant `completed_at, created_at, status, is_demo`.
- Calculer `lastCompletedAt = max(completed_at ?? created_at)` sur ce sous-ensemble.
- Garder le découpage actuel : 5 lignes max, complétion par projets sans entretien terminé.
- Pas de changement d'UI, pas de changement du compteur "X candidats" (qui reste basé sur `sessions(count)`).

## Hors périmètre

- Aucune modification visuelle.
- Aucun changement sur les autres blocs du dashboard ni sur la page Projets.
