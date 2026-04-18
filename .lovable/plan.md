

## Diagnostic complet — Pourquoi tu ne reçois pas les emails

### Ce que j'ai vérifié (tout fonctionne côté envoi)

| Vérification | Résultat |
|---|---|
| Logs `email_send_log` | ✅ 16/16 emails `sent` (dernier 19:19:19) |
| Dispatcher actif | ✅ batch 10, delay 200ms, pas de rate-limit |
| Liste de suppression | ✅ Vide |
| Edge function `auth-email-hook` | ✅ Reçoit et enqueue sans erreur |
| SPF `notify.interw.ai` | ✅ `v=spf1 include:mailgun.org ~all` |
| MX `notify.interw.ai` | ✅ Mailgun EU |
| NS délégation | ✅ ns3/ns4.lovable.cloud |

### 🔴 Problème identifié : DKIM manquant + DMARC strict

```
=== DKIM smtp._domainkey.notify.interw.ai ===
(VIDE — aucune réponse)

=== DMARC interw.ai ===
v=DMARC1; p=quarantine; adkim=r; aspf=r;
```

**Deux problèmes combinés :**

1. **DKIM absent** : la requête sur `smtp._domainkey.notify.interw.ai` ne retourne rien. Sans DKIM, Mailgun signe les emails mais Gmail ne peut pas vérifier la signature → les emails finissent **directement en spam ou sont rejetés silencieusement** par Gmail.

2. **DMARC `p=quarantine` sur le domaine racine** : ta politique DMARC (gérée par GoDaddy/Infomaniak sur `interw.ai`) demande aux serveurs de réception de **mettre en quarantaine** (= dossier spam) tous les emails qui échouent SPF ou DKIM. Comme DKIM n'est pas configuré, **chaque email passe en quarantaine systématiquement**.

### Cause racine

Le sous-domaine `notify.interw.ai` est délégué à Lovable (NS records OK), mais la **zone Cloudflare gérée par Lovable ne contient pas le record DKIM**. C'est probablement parce que la provision DNS Mailgun n'a pas terminé proprement, ou que le selector DKIM utilisé par Mailgun est différent de `smtp` (parfois `mta` ou un selector custom).

### Plan d'action

**Étape 1 — Vérifier le statut de provisioning du domaine côté Lovable**
Utiliser `email_domain--check_email_domain_status` pour voir si le domaine est `active` ou s'il est resté en `awaiting_dns` / `provisioning_failed`. Si pas `active`, relancer le setup depuis **Cloud → Emails → Manage Domains → Rerun Setup**.

**Étape 2 — Vérifier le bon selector DKIM**
Tester aussi `mta._domainkey.notify.interw.ai`, `k1._domainkey.notify.interw.ai`, et `mailo._domainkey.notify.interw.ai` pour identifier le selector réel utilisé par Mailgun via Lovable.

**Étape 3 — Si DKIM toujours absent après Rerun Setup**
Le problème est côté infrastructure Lovable Cloud — le record DKIM n'a pas été créé dans la zone Cloudflare déléguée. Dans ce cas tu peux :
- soit attendre la propagation (jusqu'à 24h après provisioning)
- soit supprimer le domaine et le recréer depuis zéro via le dialog email setup

**Étape 4 — Test cross-provider en attendant**
Demande un reset de mot de passe avec une adresse **Outlook** ou **ProtonMail** (DMARC moins strict que Gmail). Si l'email arrive là-bas mais pas sur Gmail, c'est confirmé que c'est DKIM + DMARC qui bloquent.

**Étape 5 (optionnel) — Assouplir temporairement DMARC**
Sur ton DNS GoDaddy/Infomaniak, passer le DMARC du domaine racine de `p=quarantine` à `p=none` le temps de débugger. Ça arrête de mettre en quarantaine pendant que tu fixes DKIM. À ne PAS laisser en `p=none` long terme.

### Ce qui sera fait au prochain run (mode default)

1. Appel `email_domain--check_email_domain_status` pour status précis
2. Tests DKIM sur plusieurs selectors
3. Selon résultat : Rerun Setup ou recréation du domaine
4. Te dire exactement quoi faire côté GoDaddy/Infomaniak si le DMARC racine doit être ajusté

