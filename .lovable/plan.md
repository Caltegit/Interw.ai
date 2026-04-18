
## Plan

L'utilisateur me partage l'interface sécurité Infomaniak qui concerne le domaine racine `interw.ai`, pas le sous-domaine `notify.interw.ai` utilisé par Lovable. Ces infos ne changent pas le diagnostic Lovable.

### État actuel
- SPF racine : ✅ ajouté (Infomaniak le voit)
- DMARC racine : passé en `p=none` (Infomaniak râle mais c'est OK temporairement)
- DKIM Infomaniak racine : ❌ absent — concerne uniquement les envois depuis tes boîtes Infomaniak `@interw.ai`, pas Lovable
- DKIM Lovable sur `notify.interw.ai` : statut inconnu, à re-vérifier après ta recréation du domaine

### Actions au prochain run (default mode)
1. Appel `email_domain--check_email_domain_status` pour voir l'état du nouveau `notify.interw.ai`
2. Test DNS direct sur les selectors DKIM (`smtp`, `mta`, `lovable`, etc.) sur `notify.interw.ai`
3. Si DKIM publié → trigger un reset password de test et suivre via `email_send_log`
4. Si DKIM toujours absent → vérifier que les NS records GoDaddy pointent bien vers Lovable, sinon recréation à nouveau

### Options DKIM Infomaniak (séparé, optionnel)
Si l'utilisateur veut aussi sécuriser ses propres envois Infomaniak depuis `@interw.ai` :
- Activer DKIM dans le panneau Infomaniak → ça génère un record TXT `mail._domainkey.interw.ai` à ajouter chez GoDaddy
- N'a aucun impact sur les emails Lovable (zone DNS différente)
- À faire seulement si l'utilisateur envoie des emails depuis ses adresses Infomaniak `@interw.ai`

### Réponse à donner
Confirmer que ce panneau Infomaniak ne concerne pas Lovable, redemander :
- Confirmation que les NS records `notify` sont bien chez GoDaddy
- Statut actuel dans Cloud → Emails → Manage Domains
