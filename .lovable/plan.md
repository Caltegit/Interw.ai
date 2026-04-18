

## Lecture du screenshot Infomaniak

L'utilisateur me montre l'interface Infomaniak qui dit :
- **"Aucun enregistrement SPF n'a été détecté"** sur le domaine racine `interw.ai`
- Infomaniak recommande d'ajouter : `v=spf1 include:spf.infomaniak.ch -all`
- Note : "Le domaine n'étant pas sur votre compte, il est nécessaire de copier l'enregistrement chez le prestataire gérant le domaine" → confirme que le DNS de `interw.ai` est bien chez **GoDaddy**, pas Infomaniak.

## Ce que ça change au diagnostic

Oui, ça aide énormément. Ça révèle un **deuxième problème** que je n'avais pas vu :

### Le domaine racine `interw.ai` n'a AUCUN SPF

Conséquence concrète : quand quelqu'un t'envoie un email à `xxx@interw.ai` (ta boîte Infomaniak), tout va bien côté réception. Mais quand **tu envoies** depuis cette adresse Infomaniak, les destinataires ne peuvent pas vérifier que le serveur Infomaniak a le droit d'envoyer pour `interw.ai` → tes emails personnels partent aussi en spam potentiellement.

### Mais surtout : impact sur les emails Lovable

Tu as un DMARC `p=quarantine` sur `interw.ai` qui exige SPF **OU** DKIM aligné. Sur le sous-domaine `notify.interw.ai` :
- ✅ SPF présent (`include:mailgun.org`)
- ❌ DKIM absent

Le SPF de `notify.interw.ai` aligne en mode "relaxed" (`aspf=r` dans ton DMARC) avec le domaine racine `interw.ai` → donc **SPF passe DMARC normalement** sur tes emails Lovable. Ce n'est donc PAS le SPF racine manquant qui bloque les emails Lovable.

**La vraie cause des emails Lovable bloqués reste : DKIM manquant + DMARC strict.**

## Plan révisé

### Action 1 — DNS GoDaddy : ajouter SPF Infomaniak ET ajuster DMARC

Dans ton DNS GoDaddy pour `interw.ai`, ajouter / modifier 2 records TXT :

**a) SPF racine (pour Infomaniak — emails personnels)**
- Type : `TXT`
- Nom : `@` (ou laisser vide selon GoDaddy)
- Valeur : `v=spf1 include:spf.infomaniak.ch -all`

⚠️ **Important** : si un jour tu envoies aussi depuis le domaine racine via Lovable/Mailgun, il faudra fusionner :
`v=spf1 include:spf.infomaniak.ch include:mailgun.org -all`
Mais pour l'instant Lovable envoie depuis `notify.interw.ai`, donc juste Infomaniak suffit.

**b) DMARC racine — passer en `p=none` temporairement**
- Type : `TXT`
- Nom : `_dmarc`
- Modifier de : `v=DMARC1; p=quarantine; adkim=r; aspf=r;`
- Vers : `v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:postmaster@interw.ai;`

### Action 2 — Lovable Cloud : Rerun Setup pour publier DKIM

Va dans **Cloud → Emails → Manage Domains → notify.interw.ai → Rerun Setup**. Ça force la republication du record DKIM dans la zone Cloudflare déléguée.

### Action 3 — Ce que je ferai en mode default ensuite

1. Re-tester DKIM sur `notify.interw.ai` après ton Rerun Setup
2. Vérifier que le SPF racine est bien propagé après ton ajout GoDaddy
3. Vérifier que DMARC est bien passé à `p=none`
4. Te demander de re-déclencher un reset password et confirmer la réception sur Infomaniak (inbox + spam)

Une fois confirmé que tout marche, on remettra DMARC en `p=quarantine` (plus sécurisé) une fois que DKIM sera stable.

## Ordre d'exécution recommandé

1. **Toi** → ajoute SPF racine sur GoDaddy + change DMARC en `p=none`
2. **Toi** → Rerun Setup dans Cloud → Emails
3. **Moi** (mode default au prochain run) → vérifications DNS + test fonctionnel

