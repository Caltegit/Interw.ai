

## Diagnostic complet — système d'emails

### Ce que j'ai vérifié

**1. Historique d'envoi (`email_send_log`)** — 3 emails de recovery envoyés aujourd'hui à `cclemalte@gmail.com` :
- 13:06 → `pending` puis `sent` ✅
- 13:07 → `pending` puis `sent` ✅
- 13:10 → `pending` puis `sent` ✅

Tous les statuts passent à `sent` en 1-6 secondes, aucune erreur, aucun message bloqué en `pending`/`failed`/`dlq`.

**2. Logs edge function `auth-email-hook`** — réception et enqueue corrects :
```
Received auth event { emailType: "recovery", email: "cclemalte@gmail.com" }
Auth email enqueued { emailType: "recovery", ... }
```
Aucune erreur, aucun crash.

**3. Logs edge function `process-email-queue`** — boots et shutdowns réguliers (cron tourne toutes les 5s).

**4. Configuration dispatcher (`email_send_state`)** — batch 10, delay 200ms, TTL 15min auth / 60min transactional. Pas de rate-limit actif (`retry_after_until` vide).

**5. Liste de suppression (`suppressed_emails`)** — vide. Aucune adresse bloquée.

### Conclusion

**Le système d'envoi d'emails fonctionne parfaitement.** Tous les emails de reset de mot de passe envoyés aujourd'hui ont été délivrés au provider avec succès (status `sent`).

### Si tu ne reçois pas les emails malgré ça

Trois pistes possibles côté **réception** (pas côté envoi) :

1. **Spam / Promotions** — vérifie le dossier spam de Gmail, et l'onglet "Promotions" / "Notifications" (les emails de `notify.interw.ai` peuvent être catégorisés là).
2. **Filtres Gmail** — vérifie qu'aucun filtre ne classe automatiquement les emails de `noreply@notify.interw.ai`.
3. **DNS encore en propagation** — si le domaine vient d'être configuré, la réputation SPF/DKIM peut être faible les premières heures et certains emails peuvent être rejetés silencieusement par Gmail.

### Plan d'action proposé

**Aucune action de code nécessaire** — le système fonctionne. Je propose à la place de :

1. **Tester end-to-end maintenant** avec toi : déclencher un reset password, vérifier dans Gmail (inbox + spam + promotions).
2. Si l'email n'arrive pas dans Gmail malgré le statut `sent`, je peux **vérifier le statut DNS du domaine** `notify.interw.ai` (SPF/DKIM) pour confirmer qu'il est bien actif.
3. Optionnel : tester avec une **autre adresse email** (Outlook, Yahoo) pour isoler un éventuel problème spécifique à Gmail.

Veux-tu que je vérifie le statut DNS du domaine, ou préfères-tu d'abord faire un test live et regarder ton inbox + spam ?

