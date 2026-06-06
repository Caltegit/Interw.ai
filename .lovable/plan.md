## Diagnostic actuel

Quatre chemins peuvent déclencher `generate-report` aujourd'hui :

```
1. Navigateur fin d'entretien   →  generate-report  (fire-and-forget)
2. Bouton « Générer le rapport »  →  generate-report
3. trigger Postgres sessions.status='completed'  →  finalize-session  →  generate-report
4. cron horaire cleanup-abandoned-sessions  →  finalize-session  →  generate-report
```

Problèmes :

- **Aucune file persistante** : si l'IA renvoie 429/5xx ou si la fonction timeout, le job est simplement perdu jusqu'au prochain passage du cron (1 h).
- **Pas d'observabilité** : 32 sessions orphelines aujourd'hui sans qu'on sache *pourquoi* `generate-report` a échoué.
- **Concurrence** : navigateur + trigger + cron peuvent tirer simultanément sur la même session → appels IA gâchés + race sur l'insert dans `reports`.
- **Pas de lissage** : si 20 entretiens se terminent en même temps, on enchaîne 20 appels IA en parallèle → risque de saturer la quota Lovable AI.
- **Pas de retry stratégique** : exponential backoff inexistant, max attempts inexistant, donc soit on retry à l'infini, soit on abandonne silencieusement.

---

## Architecture cible

Une vraie file `report_jobs` table-based (visible, debuggable) avec un worker unique cadencé par pg_cron. Pas de pgmq ici : un job = une session = une ligne, c'est plus simple à inspecter qu'une queue binaire.

```
[trigger DB on status=completed]
[bouton UI "Régénérer"]                ─►  upsert report_jobs (queued)
[fin d'entretien navigateur]
[backfill / cleanup]

                                                  ▼
                                  cron */1 * * * *   (pg_cron)
                                                  ▼
                                  process-report-queue   ── 3 jobs / run, espacés 10 s
                                                  ▼
                                          generate-report
                                                  ▼
                              succès ─► report_jobs.status='done' + thank-you email
                              échec  ─► attempts++, next_attempt_at = now + backoff
```

---

## Plan

### 1. Schéma DB — table `report_jobs`

Migration :

```sql
CREATE TYPE report_job_status AS ENUM ('queued','processing','done','failed','cancelled');

CREATE TABLE public.report_jobs (
  session_id uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  status report_job_status NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_until timestamptz,
  last_error text,
  organization_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX report_jobs_pickup_idx
  ON report_jobs (status, next_attempt_at)
  WHERE status IN ('queued','processing');

-- GRANTS + RLS : admin org peut lire, edge functions service_role écrit
```

Politiques RLS : seuls les membres de l'organisation propriétaire (via `organization_id`) peuvent lire ; aucune politique d'écriture côté utilisateur (tout passe par les edge functions service_role).

### 2. RPC d'enqueue idempotent

```sql
CREATE FUNCTION enqueue_report_job(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO report_jobs (session_id, organization_id)
  SELECT s.id, s.organization_id FROM sessions s WHERE s.id = p_session_id
  ON CONFLICT (session_id) DO UPDATE
    SET status = CASE
      WHEN report_jobs.status IN ('done','processing') THEN report_jobs.status
      ELSE 'queued'
    END,
    next_attempt_at = LEAST(report_jobs.next_attempt_at, now()),
    updated_at = now();
END $$;
```

Idempotente : appeler 10 fois ne crée qu'une ligne, ne re-tire pas un job `done`, et ne perturbe pas un job `processing`.

### 3. Trigger Postgres : on enqueue dès qu'une session passe à `completed`

```sql
CREATE FUNCTION trg_enqueue_report_on_completed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed'
     AND COALESCE(OLD.status,'') <> 'completed'
     AND NEW.is_demo = false THEN
    PERFORM enqueue_report_job(NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER sessions_enqueue_report
AFTER INSERT OR UPDATE OF status ON sessions
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_report_on_completed();
```

Remplace l'ancien trigger `trigger_finalize_session` (à dropper). Plus de risque de double-fire navigateur + trigger.

### 4. Worker `process-report-queue` (nouvelle edge function)

```ts
// Pseudo-code
const BATCH_SIZE = 3
const SPACING_MS = 10_000
const LOCK_DURATION_MS = 5 * 60 * 1000  // 5 min

// SELECT ... FOR UPDATE SKIP LOCKED garantit qu'un seul worker prend un job
const jobs = await rpc('claim_report_jobs', { p_limit: BATCH_SIZE, p_lock_ms: LOCK_DURATION_MS })

for (const job of jobs) {
  try {
    // 1. transcrire les segments restants (loop jusqu'à remaining=0 ou timeout 3min)
    // 2. appeler generate-report
    // 3. envoyer thank-you email (avec idempotence existante)
    await markDone(job.session_id)
  } catch (e) {
    await markFailed(job.session_id, e.message)  // attempts++, backoff exp
  }
  await sleep(SPACING_MS)
}
```

RPC SQL pour la prise atomique :

```sql
CREATE FUNCTION claim_report_jobs(p_limit int, p_lock_ms int)
RETURNS SETOF report_jobs LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  UPDATE report_jobs SET
    status = 'processing',
    locked_at = now(),
    locked_until = now() + (p_lock_ms || ' ms')::interval,
    attempts = attempts + 1,
    updated_at = now()
  WHERE session_id IN (
    SELECT session_id FROM report_jobs
    WHERE status = 'queued'
      AND next_attempt_at <= now()
    ORDER BY next_attempt_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END $$;
```

Aussi : `requeue_stuck_processing()` qui re-passe en `queued` tout job dont `locked_until < now()` (worker crashed).

### 5. Backoff exponentiel + max attempts

```
attempt 1 → next + 1 min
attempt 2 → next + 5 min
attempt 3 → next + 15 min
attempt 4 → next + 1 h
attempt 5 → next + 4 h
attempt 6 → next + 12 h
attempts >= 6 → status='failed', alerte
```

Cap à 6 tentatives pour éviter de retenter à vie un job structurellement cassé.

### 6. Cadencement pg_cron

```sql
SELECT cron.schedule(
  'process-report-queue-every-minute', '* * * * *',
  $$ SELECT net.http_post(...process-report-queue...) $$
);
```

Throughput max : 3 jobs × 60 runs = **180 rapports/h max**, espacés de 10 s → bien sous la limite Lovable AI. Si on observe du retard on monte `BATCH_SIZE` à 5 ou 8.

### 7. Simplifications côté code existant

- **`finalize-session`** : devient un thin wrapper qui ne fait qu'`enqueue_report_job` et termine. Plus de boucle transcription + appel `generate-report` ici (déplacés dans le worker).
- **`InterviewStart.tsx` (l. 3378)** : l'appel direct à `generate-report` côté navigateur est supprimé. Le trigger DB s'en occupe quand la session passe à `completed`.
- **`useSessionDetail.ts` (l. 179)** : le bouton « Générer le rapport » appelle `enqueue_report_job` via RPC + refresh.
- **`cleanup-abandoned-sessions`** : on enlève le bloc « filet de sécurité » qui réinvoque `finalize-session` (le worker s'en charge). Garde uniquement le nettoyage des sessions abandonnées sans média.
- **`backfill-orphan-reports`** : devient un simple « INSERT INTO report_jobs … FROM sessions WHERE status='completed' AND no report ». 5 lignes.

### 8. Observabilité — page admin `/admin/report-jobs`

Tableau filtrable :
- session_id (lien)
- candidate / project
- status (badge)
- attempts / max
- next_attempt_at
- last_error (tronqué, hover pour full)
- bouton « Forcer retry » → `UPDATE … SET status='queued', attempts=0, next_attempt_at=now()`
- bouton « Annuler » → status='cancelled'

Réservée aux `super_admin`. Stats en haut : queued / processing / failed (24 h) / done (24 h).

### 9. Migration des 32 orphelines actuelles

Une fois la table créée :

```sql
INSERT INTO report_jobs (session_id, organization_id)
SELECT s.id, s.organization_id
FROM sessions s
LEFT JOIN reports r ON r.session_id = s.id
WHERE s.status = 'completed' AND s.is_demo = false AND r.id IS NULL
ON CONFLICT DO NOTHING;
```

Le worker les reprendra naturellement, 3 par minute.

### 10. Vérifications

- Lancer un entretien démo end-to-end → vérifier qu'une ligne `report_jobs` apparaît avec `status=queued`, puis `processing`, puis `done`, et que `reports` est bien rempli.
- Forcer un échec côté `generate-report` (mock) → vérifier que `attempts` incrémente et que `next_attempt_at` recule de 1 min, 5 min, etc.
- Lancer 10 sessions simultanées (script) → vérifier que `process-report-queue` les traite par lot de 3 espacés de 10 s, sans double génération.
- Couper le worker en plein traitement → après 5 min, vérifier que `requeue_stuck_processing` reset le job.
- Charger la page admin et vérifier le rendu + les boutons.

---

## Hors-scope

- Pas de pgmq pour ce flux : une table Postgres simple suffit, est plus debuggable, et permet UPDATE/UPSERT idempotents triviaux.
- Pas de retry sur `transcribe-session` au-delà de la boucle existante (4 min) — sa stabilité est correcte.
- Pas de redesign de `generate-report` lui-même cette fois ; on enveloppe juste sa fragilité.
- Pas d'alerting externe (Slack/email) sur `failed` dans cette itération — la page admin suffit pour démarrer.

---

## Détails techniques pour info

- `FOR UPDATE SKIP LOCKED` garantit qu'on peut lancer plusieurs workers en parallèle plus tard sans modifier le code.
- La colonne `locked_until` permet de récupérer les jobs orphelins quand un worker crashe (pas de leader election à gérer).
- Le trigger DB est `AFTER UPDATE OF status` pour ne fire qu'une fois lors de la transition `in_progress → completed`.
- Le RPC `enqueue_report_job` est `SECURITY DEFINER` pour pouvoir être appelé depuis n'importe quel contexte (RLS bypass contrôlé).
