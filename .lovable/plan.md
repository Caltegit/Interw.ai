# Fiabiliser l'analyse orale des rapports

## Objectif

Supprimer la cause principale des analyses orales manquantes (rate-limit Gemini free tier) et rattraper automatiquement les rapports qui échouent quand même.

## Étape 1 — Migrer `analyze-paraverbal` vers la passerelle Lovable AI

Remplacer les appels directs à `GEMINI_API_KEY` par la passerelle Lovable AI, qui n'a pas la même limite de 100 req/min.

**Changements dans `supabase/functions/analyze-paraverbal/index.ts` :**

- Supprimer `uploadToGemini()` et toute la logique Files API (`fileUri`).
- Remplacer par un encodage **audio inline base64** dans le payload (pattern déjà utilisé dans `analyze-nonverbal`).
- Remplacer l'appel `fetch("generativelanguage.googleapis.com/.../generateContent")` par un appel OpenAI-compatible vers `https://ai.gateway.lovable.dev/v1/chat/completions` avec header `Lovable-API-Key: $LOVABLE_API_KEY`.
- Convertir le `TOOL_SCHEMA` (format Gemini `functionDeclarations`) en format OpenAI `tools: [{ type: "function", function: {...} }]` avec `tool_choice` forcé sur `report_paraverbal`.
- Garder le modèle `google/gemini-2.5-flash` (supporté par la passerelle, gratuit).
- Garder la logique : `MAX_ATTEMPTS=3`, retries 2s→5s→12s, statuts `running`/`ok`/`failed`/`skipped`, plafond 12 segments, ignore segments > 24 Mo, minimum 2 segments analysés.
- Gérer explicitement `429` (rate limit) et `402` (crédits) → `status: failed` avec `error: "rate_limit"` ou `"no_credits"` (au lieu de `gemini_429`).

**Impact attendu :** les 36 `gemini_429` des 14 derniers jours disparaissent. Restent uniquement les vrais cas `not_enough_audio` (7 cas) et `audio_analysis_disabled`.

## Étape 2 — Activer le cron de rattrapage

La fonction `retry-missing-analyses` existe déjà et est correcte. Elle n'est juste jamais appelée.

**Migration SQL** (extension `pg_cron` déjà active sur Lovable Cloud) :

```sql
SELECT cron.schedule(
  'retry-missing-analyses-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/retry-missing-analyses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Le service role key sera lue depuis un setting Postgres (à configurer dans la migration via `ALTER DATABASE`, ou via Vault). Approche alternative plus simple : stocker la clé dans `vault.secrets` et la lire via `vault.read_secret('service_role_key')`.

**Comportement :** toutes les 15 min, la fonction scanne les rapports des 7 derniers jours, détecte ceux dont `paraverbal_analysis` ou `nonverbal_analysis` est `null`, `failed`, ou `running` depuis plus de 10 min, et rappelle `analyze-paraverbal` / `analyze-nonverbal` avec `force: true`. Plafond 20 relances par exécution, max 3 tentatives par rapport (respecté côté analyze-*).

## Étape 3 — Validation

1. Déployer `analyze-paraverbal` et appeler manuellement avec `curl_edge_functions` sur une session récente ayant `paraverbal_analysis.status = "failed"` et `error = "gemini_429"` → vérifier que le rapport passe à `status: "ok"` avec un `profile` rempli.
2. Vérifier les logs de `analyze-paraverbal` : plus aucun `gemini_429`.
3. Déclencher manuellement `retry-missing-analyses` → vérifier le `{ retried: N, jobs: [...] }` retourné et la mise à jour des rapports concernés dans les minutes qui suivent.
4. Vérifier que le cron `retry-missing-analyses-every-15min` apparaît dans `cron.job` et que `cron.job_run_details` montre des exécutions réussies au bout de 15-30 min.

## Hors scope (à proposer plus tard)

- Option 3 : `record_video=true` par défaut sur les nouveaux projets.
- Option 4 : script one-shot de rattrapage des anciens rapports NULL (> 7 jours, donc hors fenêtre du cron).
