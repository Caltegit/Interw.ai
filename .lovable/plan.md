# Plan : Télémétrie micro pilotable (ON/OFF + purge 30j)

## Objectif
La collecte d'événements micro (`mic_events`) est actuellement **toujours active**. On veut la rendre **désactivée par défaut**, activable manuellement depuis l'admin, avec une **purge automatique à 30 jours** des données collectées.

## État actuel (confirmé)
- `mic_events` table existe avec RLS super-admin only.
- `log-mic-events` Edge Function valide le token candidat puis insère — toujours actif.
- `src/lib/micTelemetry.ts` : buffer fire-and-forget, flush toutes les 5s, non bloquant.
- `InterviewStart.tsx` ligne 1394-1398 : `initMicTelemetry(token)` au montage.
- `MicQualityTab.tsx` : visualisation des incidents (lecture seule, pas de toggle).
- `pg_cron` est disponible et déjà utilisé (pattern `cron.schedule` avec SQL direct ou `net.http_post`).

## Changements

### 1. Table de configuration `mic_telemetry_config` (migration)
Singleton (une seule ligne, id=1), pattern identique à `email_send_state` :
- `id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1)`
- `enabled boolean NOT NULL DEFAULT false`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `updated_by uuid` (qui a basculé le switch)

Seed : `INSERT INTO mic_telemetry_config (id, enabled) VALUES (1, false) ON CONFLICT DO NOTHING;`

Grants : `SELECT` pour `authenticated` (l'admin lit), `ALL` pour `service_role` (l'Edge Function écrit/consulte via service key). RLS : lecture pour super_admin uniquement.

### 2. Edge Function `log-mic-events` — gate côté serveur
Au début du handler, après validation du token :
```ts
const { data: cfg } = await supabase.from('mic_telemetry_config').select('enabled').eq('id', 1).single()
if (!cfg?.enabled) return json(200, { ok: true, disabled: true, inserted: 0 })
```
Quand désactivé : retourne 200 avec `disabled: true`, **n'insère rien**. Le client reçoit la réponse sans erreur.

### 3. Client `micTelemetry.ts` — auto-stop
Dans `flush()`, on lit la réponse. Si `disabled: true`, on pose un flag `telemetryDisabled = true` qui :
- Stoppe le `setInterval` de flush
- Retire le hook logger (`setTelemetryHook(null)`)
- Les futurs appels `trackMicEvent` deviennent no-op

Résultat : un seul cycle de flush gaspillé après activation/désactivation, puis plus rien. Non bloquant, sans risque pour l'expérience candidat.

### 4. Admin `MicQualityTab.tsx` — toggle ON/OFF
Ajout d'un composant `Switch` en haut de la page avec :
- État actuel (Activé / Désactivé)
- Bouton pour basculer (écrit dans `mic_telemetry_config` via `supabase.from().update()`)
- Date de dernière modification (`updated_at`) et qui l'a modifié (`updated_by` → lookup profil)
- Petit texte explicatif : "Active la collecte d'événements micro côté candidat. Désactivé par défaut."

### 5. Purge automatique 30 jours (pg_cron)
Migration qui programme un job quotidien via `pg_cron` :
```sql
SELECT cron.schedule(
  'purge-mic-events-daily',
  '0 3 * * *',  -- 3h UTC tous les jours
  $$ DELETE FROM public.mic_events WHERE created_at < now() - interval '30 days' $$
);
```
SQL direct (pas besoin d'Edge Function pour un simple DELETE). Pas d'impact sur les performances : index sur `created_at` déjà existant.

## Ce qui ne change pas
- Aucune modification de la logique d'acquisition audio (`useMicHealthWatcher`, `InterviewStart`)
- Aucun changement du parcours candidat quand la télémétrie est OFF (un seul flush vide, puis silence)
- La table `mic_events` et ses indexes restent identiques
- Les autres fonctionnalités (dashboard, rapports, etc.) non touchées

## Risques
- **Candidat** : zéro impact. Le `flush()` est déjà fire-and-forget avec `.catch(() => {})`. Lire la réponse pour le flag `disabled` est non bloquant.
- **Build** : pas de dépendance nouvelle. `Switch` est un composant shadcn déjà présent.
- **DB** : une nouvelle table standalone + un job pg_cron. Aucune modification de table existante.
- **Admin** : un simple toggle lecture/écriture, protégé par RLS super_admin.
