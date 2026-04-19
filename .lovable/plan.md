

## Problème
Le rapport est bien généré (sauvé en DB) mais l'email au recruteur n'est pas envoyé. Logs de `generate-report` :
```
ERROR Failed to send report email: Edge Function returned a non-2xx status code
```
Aucun log côté `send-transactional-email` → la requête est rejetée à la passerelle Supabase avant d'atteindre la fonction.

## Cause
`send-transactional-email` est configurée avec `verify_jwt = true` dans `supabase/config.toml`. Quand `generate-report` l'appelle via `supabase.functions.invoke(...)` avec un client construit à partir du `SERVICE_ROLE_KEY`, le SDK n'attache pas automatiquement le service-role en `Authorization: Bearer`. La passerelle rejette donc l'appel (401).

## Fix
Dans `supabase/functions/generate-report/index.ts`, remplacer l'appel `supabase.functions.invoke(...)` par un `fetch` direct vers l'URL de la fonction avec les headers explicites :
```ts
await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ templateName: 'interview-report', ... }),
})
```
Cela garantit que le service-role est bien envoyé en Bearer et passe `verify_jwt`.

## Fichiers
- `supabase/functions/generate-report/index.ts` — remplacer le bloc `supabase.functions.invoke("send-transactional-email", ...)` par un `fetch` direct, avec gestion d'erreur (lire le body en cas de non-2xx pour logger la vraie raison).

## Test
1. Refaire un entretien complet de bout en bout.
2. Vérifier dans `email_send_log` qu'une ligne `template_name = 'interview-report'` apparaît avec `status = 'sent'`.
3. Vérifier la réception de l'email côté recruteur.

