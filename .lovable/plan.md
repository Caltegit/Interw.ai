## Diagnostic

L'API renvoie une erreur Postgres `42702 : column reference "created_at" is ambiguous` lors de l'appel à `admin_search_sessions`. Résultat : la liste affiche « Aucune session » alors que la base contient bien des sessions réelles (visibles dans les stats du haut).

Cause : dans la fonction PL/pgSQL `admin_search_sessions`, les paramètres OUT déclarés dans `RETURNS TABLE(... created_at ..., started_at ..., completed_at ...)` portent les mêmes noms que des colonnes utilisées dans l'`ORDER BY` final (`f.completed_at`, `f.created_at`). PL/pgSQL ne sait pas résoudre la référence et avorte la requête.

La précédente tentative de correctif (migration) n'a jamais été appliquée — la fonction en base est toujours l'ancienne version.

## Correctif

Recréer `admin_search_sessions` à l'identique en ajoutant en tête du corps PL/pgSQL la directive :

```
#variable_conflict use_column
```

Cela force la résolution des références non qualifiées vers les colonnes de la table plutôt que vers les paramètres OUT. Aucun changement de signature, ni de comportement, ni de permissions.

## Vérification après application

1. Recharger `/admin/sessions-queue` → la liste paginée doit afficher les sessions réelles (et masquer les démos quand le toggle est activé).
2. Tester recherche par email, filtres statuts, toggles « Anomalies » et « Exclure démos ».
3. Confirmer qu'un utilisateur non super_admin reçoit toujours `forbidden`.

## Hors scope

- Pas de modification de `admin_sessions_queue_stats` (déjà OK, c'est cette fonction qui alimente les cartes en haut).
- Pas de changement UI — le bug est 100 % SQL.
