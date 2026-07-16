## Problème

Le rapport de la session `0979b322…` n'a pas changé malgré la régénération.

En base, `report_jobs` a bien été « touché » (`updated_at = 20:00:28`) mais `status = 'done'` et `completed_at = 15:27` — le worker n'a donc rien retraité.

Cause racine dans la fonction SQL `enqueue_report_job` :

```sql
ON CONFLICT (session_id) DO UPDATE
  SET status = CASE
    WHEN report_jobs.status IN ('done','processing') THEN report_jobs.status
    ELSE 'queued'
  END,
  next_attempt_at = LEAST(next_attempt_at, now()),
  updated_at = now();
```

Quand un job est déjà `done`, le statut est **conservé** à `done`. Résultat : la ligne est mise à jour mais le worker `process-report-queue` ne la reprend jamais (il ne claim que les jobs `queued`/`failed` avec `next_attempt_at <= now()`). L'utilisateur voit la modale se fermer sur timeout et l'ancien rapport reste affiché.

## Correction

Migration SQL qui remplace `enqueue_report_job` :

- Si le job est `processing` → ne rien changer (évite double-run concurrent).
- Sinon (`done`, `failed`, `queued`) → forcer :
  - `status = 'queued'`
  - `attempts = 0`
  - `locked_at = NULL`, `locked_until = NULL`
  - `last_error = NULL`
  - `completed_at = NULL`
  - `next_attempt_at = now()`
  - `updated_at = now()`

Ainsi, un clic sur « Régénérer » remet toujours le job en file, et le worker le reprend au prochain tick (cron toutes les minutes, plus le déclenchement immédiat déjà présent côté client via `supabase.functions.invoke('process-report-queue')` s'il existe — sinon la modale attendra le prochain tick).

## Vérification

Après migration, relancer la régénération sur la session `0979b322…` et vérifier que :
1. `report_jobs.status` passe à `queued` puis `processing` puis `done`.
2. `reports.updated_at` (ou le score) évolue.
3. La modale se ferme sur succès et le rapport affiché est le nouveau.

## Hors périmètre

- Pas de changement UI (la modale et le polling sont déjà en place et corrects).
- Pas de changement du worker `process-report-queue`.