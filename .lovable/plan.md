## Plan retenu

Paramètres validés : cron toutes les 15 min, plafond 3 tentatives, bouton RH uniquement, pas de backfill one-shot.

### 1. `analyze-paraverbal` — toujours écrire un statut
Aujourd'hui, les branches `audio_analysis_disabled`, `no_audio`, `not_enough_audio` renvoient un JSON mais n'écrivent rien dans `reports.paraverbal_analysis`. Conséquence : impossible de distinguer « jamais tenté » de « skippé volontairement ». Aligner sur `analyze-nonverbal` :
- Au début : écrire `{ status: "running", attempt: N, started_at }`.
- Skip / échec : écrire `{ status: "skipped"|"failed", reason, attempt, failed_at }`.
- Succès : ajouter `status: "ok"` au payload pour cohérence.

### 2. Plafond 3 tentatives (les deux fonctions)
Lire `attempt` de l'analyse existante, incrémenter à chaque exécution. Si la dernière trace est `failed` avec `attempt >= 3`, refuser de relancer (la fonction sort en `skipped: "max_attempts"`).

### 3. Nouvelle edge function `retry-missing-analyses`
- `verify_jwt = true` (déclenchée par cron, pas par un user).
- Cherche les rapports des 7 derniers jours où :
  - **paraverbal** : (`paraverbal_analysis IS NULL` OR `status IN ('failed','running')`) ET `projects.audio_analysis_enabled` ET `attempt < 3`. Pour `running`, ne relancer que si `started_at > 10 min`.
  - **nonverbal** : pareil avec `projects.record_video`.
- Pour chaque candidate : déclenche `analyze-paraverbal` / `analyze-nonverbal` avec `force: true` en fire-and-forget.
- Plafonne à 20 relances par exécution pour éviter de saturer Gemini.

### 4. Cron pg_cron toutes les 15 min
Via `supabase--insert` (pas migration, contient l'anon key) :
```sql
select cron.schedule('retry-missing-analyses', '*/15 * * * *', $$
  select net.http_post(url:='…/functions/v1/retry-missing-analyses', headers:='…', body:='{}') $$);
```

### 5. UI — pas de changement
Les boutons « Relancer » côté RH existent déjà dans `NonverbalTabContent` et `SessionDetail` (onglet Orale). Le statut `failed` y est déjà géré. Rien à toucher côté front.

---

### Risques / notes
- Le cron tournera silencieusement même quand il n'y a rien à faire (coût négligeable).
- Les rapports déjà NULL des 30 derniers jours seront rattrapés naturellement par le cron sur 7 jours glissants ; au-delà, ils resteront en l'état (pas de backfill demandé).

OK pour exécuter ?