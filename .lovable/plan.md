# Lien de connexion magique (24h, usage unique)

Objectif : permettre à un utilisateur de se connecter en un clic via un lien magique, valable 24h et à usage unique.

## 1. Configuration backend

- Augmenter la durée de validité des OTP/magic links à **86 400 secondes (24h)** dans la configuration Auth (`supabase--configure_auth` n'expose pas ce champ — on documente la valeur et on l'applique via une migration de config, ou on s'aligne sur la valeur courante si déjà 24h).
- Les magic links Supabase sont nativement **à usage unique** : dès qu'ils sont consommés, ils ne sont plus valides. Pas de logique custom à ajouter.

## 2. Cas 1 — « Mot de passe oublié » → lien de connexion direct

Aujourd'hui, `src/pages/Login.tsx` envoie un `resetPasswordForEmail` qui demande à l'utilisateur de saisir un nouveau mot de passe.

Changements :
- Renommer le mode `forgot` en `magic` (le bouton reste « Mot de passe oublié ? » côté UI, libellé inchangé pour l'utilisateur).
- Remplacer l'appel par :
  ```ts
  supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      shouldCreateUser: false,
    },
  })
  ```
- Message toast adapté : « Si un compte existe, un lien de connexion vient d'être envoyé. Il est valable 24h et utilisable une seule fois. »
- Le template email à utiliser est le template **Magic Link** déjà présent dans `supabase/functions/_shared/email-templates/magic-link.tsx`. Aucune modification nécessaire.
- La page `/reset-password` reste en place pour les vraies réinitialisations admin (inchangée).

## 3. Cas 2 — Bouton « Copier un lien de connexion » dans la gestion super admin

Dans `src/components/superadmin/UsersTable.tsx`, à côté de l'icône **Modifier** (crayon), ajouter une icône **Link** avec tooltip « Copier un lien de connexion ».

Comportement au clic :
1. Appel d'une nouvelle edge function `superadmin-magic-link` qui :
   - vérifie que l'appelant est super admin (via RPC `is_super_admin`),
   - appelle `admin.generateLink({ type: 'magiclink', email, options: { redirectTo: <origin>/dashboard } })`,
   - retourne `{ action_link }`.
2. Copie du lien dans le presse-papier via `navigator.clipboard.writeText`.
3. Toast : « Lien copié. Valable 24h, utilisable une seule fois. »

Sécurité :
- L'edge function est gardée par la même logique que `superadmin-manage-user` (Bearer token + check `is_super_admin`).
- Aucune fuite côté client (clé service uniquement dans l'edge function).
- Pas de stockage du lien en base.

## 4. Fichiers touchés

- `src/pages/Login.tsx` — passage du flow forgot vers magic link
- `src/components/superadmin/UsersTable.tsx` — ajout du bouton Link + handler
- `supabase/functions/superadmin-magic-link/index.ts` — nouvelle edge function
- Déploiement edge function via outil de déploiement

## 5. Hors périmètre

- Pas de changement du template email magic-link (déjà branché)
- Pas de modification de `/reset-password` ni du flow d'invitation
- Pas de nouvelle table : on s'appuie sur le mécanisme natif Supabase (single-use + TTL)
