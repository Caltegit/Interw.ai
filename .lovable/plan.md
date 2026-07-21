# Candidats à repasser — surveillance continue (version finale)

## Point 2 clarifié : cas "repassée puis re-cassée"

**Comportement garanti** : 1 candidat impacté = 1 seule ligne, jamais de doublon, jamais de disparition.

Concrètement dans le RPC :
- On liste les sessions anomalies dont l'id **n'apparaît pas** dans `session_reinvitations.new_session_id` (c-à-d les sessions "origine", jamais les reprises).
- Pour chaque origine, on regarde **toutes** ses reprises (`session_reinvitations` WHERE `original_session_id = <origine>`), donc l'historique complet des N tentatives.
- Le cycle de vie devient :
  - **`repassed`** : au moins UNE des reprises est `completed` ET non-`unusable` (TS check).
  - **`resent`** : au moins un envoi, mais aucune reprise n'a réussi (toutes `pending`, `cancelled`, ou `completed` mais `unusable`).
  - **`todo`** : aucun envoi.

**Cas Inès qui recasse 2 fois** :
- Ligne d'Inès reste visible en `resent` (aucune reprise réussie).
- Colonne « Historique » : `2 renvois` (dépliable → dates + statuts mail + statut de chaque reprise).
- Dernière reprise affichée avec son motif d'échec (ex. `audio_failed`), badge inline « Reprise re-cassée ».
- Bouton **Renvoyer** toujours actif → crée une 3e reprise, s'ajoute à l'historique.
- Ligne disparaît uniquement quand une reprise réussit (`repassed`) — et même là, elle reste affichée avec le badge vert (filtre par défaut = `todo + resent`, filtre `repassed` disponible).

**Zéro trou** : tant qu'aucune reprise n'est saine, la ligne d'origine reste toujours dans le radar avec tout son historique.

## Autres arbitrages actés

1. **Date de bascule** : `p_since = '2026-07-20 00:00:00'::timestamptz` avec `>=`. Vérifié : Inès (2026-07-20 17:51 UTC) passe, les 23 cas du 8-15 juillet sont exclus.
2. **Source unique `isReportUnusable`** (option B). Le RPC retourne les signaux bruts (`audio_health`, `executive_summary`, `job_status`, `has_media`, `status`), l'UI applique la fonction TS existante (`useDashboardData.ts:38`).
3. **Historique INSERT** dans `session_reinvitations`. Drop de l'index unique partiel. Garde anti-double-clic : 429 côté edge function si envoi `sent` < 10s.
4. **Fixture `empty_summary`** : seed temporaire sur session demo, rollback immédiat.

## Vérifs préalables faites

- **`send-transactional-email` dédup 5min** : ne se déclenche que si `idempotencyKey` fourni ET ≠ `messageId`. `resend-impacted-candidate` n'en passe pas → dédup inactive, aucun blocage silencieux.
- **onConflict / index unique** : disparaît avec le DROP INDEX.
- **Grep appelants** : `admin_list_impacted_candidates` et `resend-impacted-candidate` uniquement référencés dans `AdminCandidatesToRecover.tsx`.
- **Session Inès** : `created_at = 2026-07-20 17:51:07 UTC` — passe le filtre `>=`.

## Migration DB

```sql
DROP INDEX IF EXISTS session_reinvitations_original_sent_uniq;

CREATE OR REPLACE FUNCTION public.admin_list_recoverable_candidates(
  p_since timestamptz DEFAULT '2026-07-20 00:00:00'::timestamptz
)
RETURNS TABLE (
  session_id uuid, candidate_name text, candidate_email text,
  project_id uuid, project_title text,
  organization_id uuid, organization_name text,
  session_status text, completed_at timestamptz,
  has_media boolean, audio_health jsonb, executive_summary text,
  report_job_status text,
  reinvitations jsonb  -- array complet : [{id, sent_at, status, new_session_id, new_session_status, new_audio_health, new_summary, new_job_status, new_has_media}]
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  -- Filtres amont : is_demo=false, status IN ('completed','cancelled'),
  -- status <> 'cancelled_partial', created_at >= p_since,
  -- ET id NOT IN (SELECT new_session_id FROM session_reinvitations WHERE new_session_id IS NOT NULL)
  -- Le filtrage final unusable est appliqué côté TS.
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_recoverable_candidates TO authenticated;
DROP FUNCTION IF EXISTS public.admin_list_impacted_candidates(timestamptz);
```

## Edge function `resend-impacted-candidate`

- Retirer la vérif basée sur l'index unique.
- Garde anti-double-clic 10s (429 si dernier envoi `sent` < 10s).
- Autoriser renvois multiples au-delà.
- Ne PAS passer d'`idempotencyKey`.

## UI `AdminCandidatesToRecover.tsx`

- Compteurs en header : `À renvoyer`, `Déjà renvoyée`, `Session repassée`.
- Filtres : cycle de vie + motif (`missing_media`, `audio_failed`, `empty_summary`, `job_failed`).
- Colonne « Historique » dépliable : N envois avec dates, statuts mail, et **statut de chaque reprise** (badge motif si re-cassée).
- Bouton « Renvoyer » actif sauf sur `repassed`.
- Pagination client 50/page au-delà de 100 lignes.

## Tests manuels obligatoires (session demo)

1. `missing_media` — cas Inès reproduit.
2. `audio_failed` — session avec `audio_health.verdict='failed'`.
3. `empty_summary` — **fixture** : UPDATE report SET executive_summary=''. Renvoi. **Rollback immédiat**.
4. `job_failed` — session avec `report_jobs.status='failed'`.

Cycle validé pour chaque motif : ligne visible → clic Renvoyer → nouvelle session pending → mail parti (`email_send_log`) → statut passe à `resent` → historique dépliable affiche l'envoi.

**Bonus test** : simuler reprise cassée → vérifier que la ligne reste en `resent`, historique montre 2 tentatives, bouton Renvoyer toujours actif.

## Risques identifiés

- Types Supabase régénérés → `admin_list_impacted_candidates` disparaît. Grep déjà fait : uniquement dans page recover.
- Volume premier chargement → pagination client si >100.
- `useDashboardData.isReportUnusable` inchangée → dashboard principal intact.
