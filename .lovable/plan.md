

## Cause confirmée

Logs de `generate-report` :
```
Failed to send report email: 401 {"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}
```

`send-transactional-email` est en `verify_jwt = true`. Le `SUPABASE_SERVICE_ROLE_KEY` injecté actuellement dans l'environnement des edge functions est un token au nouveau format (signing keys / ES256) que la passerelle Supabase n'accepte pas comme JWT classique → rejet 401 avant d'atteindre le code. La fonction `interview-report` n'est donc jamais exécutée, aucun email n'est jamais enfilé. C'est pour ça que `email_send_log` ne contient rien et que rien n'arrive.

Le précédent fix (passer du SDK à `fetch` direct avec `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) ne suffit pas : c'est la passerelle elle-même qui refuse le token.

## Correctif

Court-circuiter l'appel HTTP vers `send-transactional-email` (et donc la passerelle) en faisant directement, à l'intérieur de `generate-report`, ce que fait `send-transactional-email` :

1. Vérifier la suppression du destinataire dans `suppressed_emails`.
2. Récupérer / créer le token d'unsubscribe dans `email_unsubscribe_tokens`.
3. Rendre le template `interview-report` avec `renderAsync` (HTML + texte).
4. Logger `pending` dans `email_send_log`.
5. Appeler `supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: { … } })`.

Le dispatcher `process-email-queue` (cron toutes les 5s) prendra ensuite le relais et enverra réellement l'email avec retry/backoff comme pour la demande de démo qui, elle, fonctionne.

Avantage : on reste 100% côté serveur avec le service-role, on évite tout passage par la passerelle JWT, et on réutilise toute l'infra email existante (file, suppression, unsubscribe, logs).

### Détails techniques

- Ajouter dans `supabase/functions/generate-report/index.ts` :
  - imports `react`, `renderAsync` (`npm:@react-email/components@0.0.22`) et le template `../_shared/transactional-email-templates/interview-report.tsx`.
  - constantes `SITE_NAME = "interw"`, `SENDER_DOMAIN = "notify.interw.ai"`, `FROM_DOMAIN = "notify.interw.ai"` (mêmes valeurs que `send-transactional-email/index.ts`).
  - helper `generateToken()` (32 octets hex) identique.
- Remplacer le bloc `fetch(... /functions/v1/send-transactional-email ...)` par la séquence ci-dessus.
- Conserver `replyTo = session.candidate_email`, `idempotency_key = report-${session_id}`, `label = 'interview-report'`.
- Ne pas toucher à `config.toml`, à `send-transactional-email`, ni au flux de la demande de démo (qui marche avec un JWT anon).

### Test

1. Lancer un nouvel entretien complet jusqu'à la fin.
2. Vérifier `email_send_log` : ligne `template_name = 'interview-report'`, status `pending` puis `sent` dans les ~5 secondes.
3. Vérifier la réception de l'email côté recruteur (dont spam).
4. Vérifier en cas de re-clic / retry que l'idempotency key empêche les doublons.

