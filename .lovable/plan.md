

## Problème

La création d'utilisateur depuis la console Super Admin **n'envoie aucun email**. Elle crée un compte directement confirmé avec un mot de passe aléatoire — l'utilisateur ne peut donc pas se connecter sauf si le super admin lui transmet manuellement un mot de passe.

## Solution proposée

Remplacer la logique `createUser` par `inviteUserByEmail` quand aucun mot de passe n'est fourni → ça envoie un vrai email d'invitation (qui passera par notre `auth-email-hook` → template `invite.tsx` → Lovable Emails).

### Changements

**1. `supabase/functions/superadmin-manage-user/index.ts` — action `create`**

Nouveau comportement :
- Si **aucun mot de passe** fourni → `admin.auth.admin.inviteUserByEmail(email, { data: { full_name }, redirectTo: <origin>/reset-password })` → email d'invitation envoyé, l'utilisateur clique, définit son mot de passe.
- Si **mot de passe fourni** → comportement actuel (`createUser` + `email_confirm: true`), pas d'email (cas "création manuelle silencieuse").
- Dans les deux cas : assignation de l'organisation et du rôle après création.
- Récupérer l'`origin` depuis le header `Origin`/`Referer` pour construire le `redirectTo`.

**2. `src/components/superadmin/CreateUserDialog.tsx`**

- Mettre à jour la description du dialog : "Si aucun mot de passe n'est fourni, un email d'invitation sera envoyé."
- Mettre à jour le toast de succès : "Invitation envoyée à X" ou "Compte créé pour X" selon le cas (le edge function renvoie un flag `invited: true/false`).
- Helper text sous le champ mot de passe : "Laisser vide pour envoyer une invitation par email".

### Pré-requis vérifiés

- `auth-email-hook` est déployé et actif (vu dans les logs : `Auth email enqueued { emailType: "recovery", ... }`).
- Template `invite.tsx` existe déjà dans `supabase/functions/_shared/email-templates/`.
- Le hook intercepte automatiquement le type `invite` envoyé par `inviteUserByEmail`.

### Test après déploiement

1. Aller dans Super Admin → Utilisateurs → "Créer un utilisateur".
2. Saisir un email **sans** mot de passe + (optionnel) org + rôle.
3. Vérifier que l'email d'invitation arrive bien.
4. Cliquer le lien → définir le mot de passe → se connecter.
5. Vérifier dans `email_send_log` qu'une ligne `template_name = 'auth_emails'` avec `emailType: invite` apparaît.

