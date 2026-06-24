## Diagnostic

Le bouton « Mot de passe oublié » de `Login.tsx` appelle `supabase.auth.signInWithOtp` avec `emailRedirectTo: /auth/magic-link`. L'email envoyé contient l'URL **pré-construite par Supabase** (`payload.data.url`) qui pointe directement sur `https://<projet>.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=...`.

Cette URL est **à usage unique et consommée dès le premier GET**. Or, de très nombreux clients email font un GET de pré-vérification du lien avant même que l'utilisateur ne clique :

- Microsoft Defender / Outlook Safe Links
- Proofpoint, Mimecast, Barracuda (filtres entreprise)
- Gmail (scanner anti-phishing sur certains comptes Workspace)
- Apple Mail Privacy Protection (préchargement d'images et parfois de liens)
- Antivirus desktop (Bitdefender, Kaspersky, ESET…)

Conséquence : quand l'utilisateur clique, le token est déjà marqué comme utilisé → redirection vers `/auth/magic-link#error=access_denied&error_code=otp_expired`. Symptôme exact rapporté : « le lien expire instantanément ».

Le code actuel mélange aussi deux flux distincts (magic link de connexion ET reset mot de passe) sur la même page, ce qui rend le diagnostic et l'UX confus.

## Plan

### 1. Passer au flux « confirmation par clic explicite » (token_hash + verifyOtp)

Plutôt que d'envoyer une URL Supabase auto-consommée, on envoie un lien vers **notre propre page** qui n'exécute la vérification que sur action utilisateur (clic sur un bouton). Les scanners ne consomment alors plus le token.

- Modifier `supabase/functions/auth-email-hook/index.ts` : pour `magiclink` et `recovery`, ne plus utiliser `payload.data.url` ; reconstruire l'URL :
  ```
  https://interw.ai/auth/confirm?token_hash=<payload.data.token_hash>&type=<emailType>&next=<redirect>
  ```
- Le hook reçoit déjà `token_hash` et `email_action_type` dans le payload Supabase.

### 2. Créer la page `/auth/confirm` (anti-prefetch)

Nouvelle page `src/pages/AuthConfirm.tsx` :
- Lit `token_hash`, `type`, `next` depuis l'URL.
- **N'appelle PAS `verifyOtp` au chargement.** Affiche un bouton « Confirmer ma connexion » / « Réinitialiser mon mot de passe ».
- Au clic seulement : `supabase.auth.verifyOtp({ type, token_hash })` puis redirection vers `next` (ou `/dashboard` pour magiclink, `/reset-password` pour recovery).
- Headers `Cache-Control: no-store` via `<meta>` pour éviter la mise en cache par les proxys d'entreprise.
- Gestion d'erreur claire : lien expiré / déjà utilisé → bouton « Recevoir un nouveau lien ».

Route ajoutée dans `src/App.tsx`, **publique** (hors `ProtectedRoute`).

### 3. Séparer proprement les deux flux

- « Mot de passe oublié » dans `Login.tsx` : remplacer `signInWithOtp` par `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/confirm?type=recovery&next=/reset-password })`. Cela utilise le template `recovery` (sujet « Réinitialisez votre mot de passe ») et non `magiclink`.
- Page `/auth/magic-link` (`MagicLink.tsx`) : reste dédiée au renvoi de lien de connexion ; ne plus la cibler depuis le flux reset.
- `ResetPassword.tsx` : déjà OK, écoute `PASSWORD_RECOVERY` ; ne nécessite qu'un ajustement mineur si la session est déjà posée par `verifyOtp`.

### 4. Durcir la configuration Supabase Auth

Vérifier / régler via `configure_auth` ou Cloud → Users → Auth Settings :
- OTP expiry à 3600 s (1 h) — cohérent avec ce qu'on annonce dans l'email.
- `password_hibp_enabled: true` (bonus sécurité sur le nouveau mot de passe).
- URL Configuration : ajouter `https://interw.ai/auth/confirm` et `https://interw.lovable.app/auth/confirm` à la Redirect Allow List.

### 5. Ajuster les templates email

- `recovery.tsx` et `magic-link.tsx` : aucun changement de structure, juste s'assurer que le CTA pointe bien sur `confirmationUrl` (déjà le cas) — c'est l'URL injectée par le hook qui change.
- Ajouter une mention discrète sous le bouton : « Vous devrez cliquer sur "Confirmer" sur la page qui s'ouvre. » pour préparer l'utilisateur au double-clic.

### 6. Validation

- Déployer `auth-email-hook`.
- Test manuel : demander un reset depuis `Login.tsx`, ouvrir l'email, vérifier que cliquer mène à `/auth/confirm`, que rien n'est consommé avant clic, puis confirmer → arrive sur `/reset-password` avec session active.
- Test « prefetch » : faire un `curl` sur le lien reçu → vérifier que le token est **toujours valide** ensuite via un clic dans le navigateur.
- Test du cas expiré : attendre 1 h ou utiliser deux fois le même lien → message d'erreur explicite + bouton renvoi.

## Détails techniques

| Élément | Avant | Après |
|---|---|---|
| Mot de passe oublié | `signInWithOtp` + redirect `/auth/magic-link` | `resetPasswordForEmail` + redirect `/auth/confirm?type=recovery&next=/reset-password` |
| URL dans l'email | `<supabase>/auth/v1/verify?...` (GET = consommation) | `https://interw.ai/auth/confirm?token_hash=...` (clic requis pour consommer) |
| Vérification du token | Implicite par GET du scanner | Explicite via `verifyOtp` sur clic utilisateur |
| Pages publiques | `/auth/magic-link`, `/reset-password` | + `/auth/confirm` |

## Fichiers touchés

- `supabase/functions/auth-email-hook/index.ts` — reconstruire `confirmationUrl` pour `magiclink` et `recovery`.
- `supabase/functions/_shared/email-templates/recovery.tsx` et `magic-link.tsx` — petite mention sous CTA.
- `src/pages/AuthConfirm.tsx` — **nouveau**.
- `src/App.tsx` — déclarer la route `/auth/confirm` publique.
- `src/pages/Login.tsx` — remplacer `signInWithOtp` par `resetPasswordForEmail` dans le mode `forgot`.
- `src/pages/MagicLink.tsx` — message légèrement adapté (page de renvoi seulement, plus de page d'erreur post-clic).
- `src/pages/ResetPassword.tsx` — vérifier le déclenchement de `PASSWORD_RECOVERY` après `verifyOtp`.
- (Config) Redirect Allow List Supabase + OTP expiry.

## Hors scope

- Migration vers PKCE flow complet côté client (nécessiterait `flowType: 'pkce'` dans le client Supabase et tests sur tous les flows existants — à proposer dans un second temps si souhaité).
- Suppression du flux `superadmin-magic-link` / `redeem-magic-link` qui sert un autre cas d'usage (impersonation par super admin) et n'est pas concerné.
