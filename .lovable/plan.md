## Problème

Sur la page Stats, "Entretiens démarrés" reste à 0 même quand des sessions sont complétées ou réellement démarrées.

**Cause racine** : la colonne `sessions.started_at` n'est jamais renseignée en base. Sur les 497 sessions du projet (430 `completed`, 60 `cancelled`, 7 `pending`), **aucune** n'a `started_at` rempli. L'écriture dans `InterviewStart.tsx` ne se propage pas (probable blocage RLS côté candidat anonyme), mais la correction de cette écriture est hors périmètre de ce ticket d'affichage.

Le KPI est donc structurellement bloqué à 0, ce qui rend la métrique "0 démarré / 1 complété" incohérente.

## Correctif (affichage uniquement)

Dans `src/hooks/queries/useProjectStats.ts`, calculer `started` à partir de signaux fiables au lieu de `started_at` :

Une session est considérée "démarrée" si **au moins une** des conditions est vraie :
- `status ∈ { completed, cancelled }` (forcément passé par l'entretien)
- `started_at` est renseigné (compat future)
- `last_activity_at` est renseigné (pending qui a progressé)

Les `pending` sans aucun signal restent comptées comme "non démarrées".

Même logique appliquée au compteur `abandoned` (qui s'appuie aussi sur `started_at`) : on considère une session abandonnée si elle est `pending` ET a un signal d'activité (`started_at` ou `last_activity_at`) plus vieux que 30 min.

Et `pendingNotStarted` = `pending` sans aucun signal.

## Résultat attendu sur l'exemple

1 session `completed` ⇒ Clics 1, Formulaires 1, **Démarrés 1**, Complétés 1.

## Hors périmètre

- Pas de fix du write `started_at` côté `InterviewStart` (autre ticket).
- Pas de modification du RPC `get_project_stats_timeseries` (la courbe "started" peut rester à 0 jusqu'au fix de l'écriture).
- Pas de schéma / pas de backfill.