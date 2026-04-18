

## Brancher les emails @interw.ai

### Constat
Tu as `hello@interw.ai` chez GoDaddy. Pour que l'app envoie des emails depuis ton domaine (invitations, confirmations, reset password, etc.), il faut configurer **interw.ai** comme domaine d'envoi dans Lovable Cloud Emails.

### Important — distinction
- **Boîte de réception `hello@interw.ai`** (GoDaddy) = pour recevoir/lire des emails → reste chez GoDaddy, on n'y touche pas
- **Domaine d'envoi `interw.ai`** (Lovable) = pour que l'app envoie des emails programmatiques → c'est ce qu'on configure

Lovable utilise un sous-domaine dédié (par défaut `notify.interw.ai`) délégué à ses nameservers via des records NS chez GoDaddy. Ça **n'affecte pas** ta boîte `hello@interw.ai` ni les MX records existants.

### Plan en 3 étapes

**1. Configurer le domaine d'envoi**
Ouvrir le dialog de setup email → renseigner `interw.ai` → Lovable génère 2 records NS à ajouter chez GoDaddy (sur `notify.interw.ai`). Vérification DNS auto (jusqu'à 72h, souvent <1h).

**2. Personnaliser les templates auth (optionnel mais recommandé)**
Scaffolder les templates d'emails d'authentification (signup, reset password, invitation, magic link) avec le branding **Interw.ai** : couleur primaire indigo `#6366F1`, font Inter, logo si dispo. Ça remplace les emails Lovable génériques par des emails à ta marque.

**3. Brancher les emails transactionnels (app)**
Mettre en place l'infra d'envoi d'emails transactionnels pour pouvoir envoyer depuis le code (ex: notification au recruteur quand un candidat termine son entretien, confirmation d'inscription candidat, etc.). Pour l'instant : juste l'infra prête, pas de template spécifique tant que tu n'as pas un cas d'usage précis.

### Ce qu'il faut faire côté GoDaddy
Une fois le dialog complété, Lovable affichera 2 records NS du type :
- `notify.interw.ai NS ns3.lovable.cloud`
- `notify.interw.ai NS ns4.lovable.cloud`

À ajouter dans **GoDaddy → DNS de interw.ai → Add Record (NS)**. Tes MX/A/TXT existants restent intacts.

### Question
L'adresse d'expéditeur que verront les destinataires sera affichée comme `noreply@interw.ai` (ou autre nom au choix) — quel **nom d'expéditeur** veux-tu utiliser ?
1. `noreply@interw.ai` (générique, standard)
2. `hello@interw.ai` (ta boîte existante — les réponses arriveront chez toi sur GoDaddy)
3. `contact@interw.ai` ou autre

Une fois cette préférence connue, on lance la config.

