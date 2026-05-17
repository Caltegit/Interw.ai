# Lien magique pour la création de comptes

## Objectif

Lorsqu'un super admin crée une organisation ou un utilisateur, l'invité reçoit un simple **lien magique Supabase natif** (valable 24h, utilisable une seule fois) qui le connecte directement à l'app. Le mot de passe se définit plus tard dans **Paramètres** (déjà en place).

Si le lien a expiré ou a déjà été utilisé, l'utilisateur arrive sur une page lui permettant de saisir son email pour en recevoir un nouveau.

## Changements

### 1. Edge function `superadmin-create-org`

- Au lieu d'utiliser `inviteUserByEmail` + table `organization_invitations` + page `/invite/{token}` :
  - Créer le user directement : `admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name } })`
  - Pré-créer le profil, l'attacher à `organizations.owner_id`, créer `organization_members` et le rôle `admin` (déclenche le seed comme aujourd'hui)
  - Générer et envoyer un lien magique : `admin.auth.admin.inviteUserByEmail(email, { redirectTo: "{origin}/auth/magic-link" })` — Supabase enverra le template "invite" (lien valable 24h, usage unique)
- Supprimer la création de ligne dans `organization_invitations` pour ce flux
- Si l'email existe déjà → rattachement direct comme aujourd'hui (pas d'email)

### 2. Edge function `superadmin-manage-user` (action `create`)

- Supprimer l'option password (le champ disparaît du dialog)
- Toujours `createUser({ email_confirm: true })` puis `inviteUserByEmail` avec `redirectTo: "{origin}/auth/magic-link"`
- Garder la logique de rattachement à l'organisation + rôle inchangée

### 3. Dialog `CreateUserInOrgDialog.tsx`

- Retirer le champ "Mot de passe"
- Texte d'aide : "Un lien magique de connexion sera envoyé. Le mot de passe se définit ensuite dans Paramètres."

### 4. Nouvelle page `/auth/magic-link`

- Route publique
- Au chargement :
  - Si `window.location.hash` contient `error` / `error_code=otp_expired` / `access_token` invalide → afficher message "Lien expiré ou déjà utilisé" + formulaire email
  - Si une session valide est détectée (lien réussi) → redirection vers `/dashboard`
- Formulaire : un seul champ email → `supabase.auth.signInWithOtp({ email, shouldCreateUser: false, options: { emailRedirectTo: "{origin}/auth/magic-link" } })`
- Toast de confirmation, identique au flux "mot de passe oublié" actuel

### 5. Routes (`src/App.tsx`)

- Ajouter `<Route path="/auth/magic-link" element={<MagicLink />} />`
- Garder `/invite/:token` (rétrocompat pour anciens emails déjà envoyés)

### 6. Page `Login.tsx`

- Le mode "Mot de passe oublié" actuel envoie déjà un `signInWithOtp` — on aligne son `emailRedirectTo` sur `/auth/magic-link` pour une expérience unique

## Hors scope

- Pas de changement sur la table `organization_invitations` ni sur l'ancienne page `/invite/:token`
- Pas de changement sur les templates email (le template Supabase "invite" sert de lien magique)
- Pas de changement sur la définition du mot de passe (déjà dans Paramètres)
