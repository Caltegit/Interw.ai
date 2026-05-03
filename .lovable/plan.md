## Objectif

Générer le rapport et envoyer l'email **côté serveur** dès qu'une session passe en `completed`, sans dépendre du navigateur du candidat (qui peut être fermé avant la fin du traitement).

## Cause racine

Aujourd'hui, à la fin de l'entretien, le navigateur du candidat appelle séquentiellement `transcribe-session` (jusqu'à 60 s) puis `generate-report`. Si le candidat ferme l'onglet juste après « Merci pour ta participation », ces appels sont annulés et aucun rapport n'est créé. C'est ce qui s'est passé pour la session de Vincent MARIE le 02/05 (statut `completed`, 20 messages, mais 0 rapport).

## Solution

### 1. Déclencheur base de données sur `sessions`

Quand `status` passe à `completed`, lancer automatiquement le pipeline côté serveur via `pg_net` (extension HTTP de Postgres). Plus besoin que le navigateur reste ouvert.

```text
sessions.status = 'completed'
   → trigger AFTER UPDATE
   → pg_net.http_post → finalize-session (Edge Function)
       → invoke transcribe-session
       → invoke generate-report (qui envoie l'email)
```

Cela rend la génération **résiliente** : peu importe ce que fait le candidat après avoir terminé.

### 2. Nouvelle Edge Function `finalize-session`

Petite fonction qui :
- vérifie que la session existe et est bien `completed`
- vérifie qu'il n'existe pas déjà un rapport (idempotence — le déclencheur peut tirer plusieurs fois si `completed_at` est mis à jour)
- enchaîne `transcribe-session` puis `generate-report` en utilisant `EdgeRuntime.waitUntil` pour ne pas être tuée par le timeout
- répond immédiatement 202 au déclencheur Postgres

Fonction publique côté Postgres (pas d'auth utilisateur nécessaire), authentification interne via la `SUPABASE_SERVICE_ROLE_KEY` injectée dans le payload `pg_net`.

### 3. Filet de sécurité : cron de rattrapage

Étendre `cleanup-abandoned-sessions` (déjà planifié) pour qu'il détecte aussi les sessions :
- `status = 'completed'`
- `completed_at` plus vieux que 5 minutes
- aucun `report` correspondant

et relance `finalize-session` pour elles. Cela rattrape :
- les sessions historiques sans rapport (comme celle de Vincent)
- les éventuels échecs ponctuels du déclencheur (timeout réseau, erreur transitoire de l'IA)

### 4. Côté navigateur candidat

On garde l'appel à `generate-report` dans `InterviewStart.tsx` pour le confort (rapport prêt plus vite quand le candidat reste sur la page), mais il devient une **optimisation** plutôt qu'un point de défaillance unique. La fonction `generate-report` est déjà idempotente (elle vérifie `existingReport` avant d'insérer).

## Détails techniques

- **Migration** : créer la fonction trigger + l'attacher en `AFTER UPDATE OF status ON sessions WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')`. Le trigger appelle `pg_net.http_post(url := '<SUPABASE_URL>/functions/v1/finalize-session', headers := jsonb_build_object('Authorization', 'Bearer ' || vault.read_secret('service_role_key')), body := jsonb_build_object('session_id', NEW.id))`.
- **Vault** : stocker la `service_role_key` dans Vault (pattern déjà utilisé par `process-email-queue`).
- **Edge function** `finalize-session/index.ts` : `verify_jwt = false` (appelée par Postgres), valide la clé service role en entête.
- **Cron** : modifier `cleanup-abandoned-sessions` pour aussi requêter `sessions LEFT JOIN reports WHERE status='completed' AND reports.id IS NULL AND completed_at < now() - interval '5 minutes'` et appeler `finalize-session` pour chacune.
- **Aucune modification** de `generate-report` ni de `transcribe-session` — elles sont déjà idempotentes.

## Effet sur la session de Vincent

Une fois la migration appliquée et le cron de rattrapage activé, sa session sera détectée et son rapport généré automatiquement dans les 5 minutes. Pas besoin d'action manuelle.

## Fichiers touchés

- migration SQL : nouveau trigger + extension `pg_net` (déjà active normalement)
- nouveau : `supabase/functions/finalize-session/index.ts`
- nouveau : `supabase/functions/finalize-session/deno.json` si besoin
- modifié : `supabase/functions/cleanup-abandoned-sessions/index.ts` (rattrapage)
- modifié : `supabase/config.toml` si `verify_jwt` doit être explicité
- inchangé : `src/pages/InterviewStart.tsx`, `generate-report`, `transcribe-session`
