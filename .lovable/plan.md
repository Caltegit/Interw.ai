## Origine du bug

L'invitation d'Eva reste `pending` alors que son compte existe, avec `profiles.organization_id = NULL`. Trois maillons cumulés :

1. **Lien d'invitation non protégé contre les scanners.** Dans `auth-email-hook`, seuls `magiclink` et `recovery` sont réécrits vers `/auth/confirm`. Le type `invite` utilise directement l'URL Supabase `/verify?…&redirect_to=/invite/{token}`, à usage unique — Outlook Safe Links / Defender / Proofpoint (souvent actifs sur un domaine pro type `@alboteam.com`) pré-visitent le lien et le consomment. Quand Eva a cliqué, elle a eu "lien expiré".

2. **Le trigger `handle_new_user` ignore le contexte d'invitation.** Il crée toujours un profil avec `organization_id = NULL` sans consulter les `organization_invitations` correspondant à l'email.

3. **Le rattachement à l'org n'a lieu que via `/invite/{token}` → `accept_invitation`.** Après l'échec du lien, Eva a créé son compte autrement (reset password ou signup direct) et n'est jamais passée par cette page. Résultat : compte orphelin côté Eva, invitation toujours "pending" côté Benjamin.

## Étape 1 — Suppression complète d'Eva

Data-change unique pour repartir de zéro :
- `organization_invitations` : suppression de la ligne `8085ad13-b61a-4299-b401-072f103bb5e7` (eva@alboteam.com, org Albo).
- `auth.users` : suppression de l'utilisateur `836a791b-6ebf-4e3c-8c87-e2ce43fa32a1` (cascade → `profiles`, `organization_members`, `user_roles` éventuels).

Après ça, Benjamin peut relancer une invitation propre depuis l'UI.

## Étape 2 — Correctifs structurels

### 2.1 Protéger le lien d'invitation contre les scanners
`supabase/functions/auth-email-hook/index.ts` : étendre la réécriture existante au type `invite`.
- Générer `https://{ROOT_DOMAIN}/auth/confirm?token_hash=…&type=invite&next=/invite/{token}`.
- `next` reconstruit à partir de `redirect_to` (qui contient déjà `/invite/{token}`).
- Redéployer `auth-email-hook`.

Effet : le token n'est consommé qu'après un clic humain sur `/auth/confirm` (comportement déjà en place pour magic link et reset password).

### 2.2 Rattachement automatique au signup
Modifier `handle_new_user` : si l'email du nouvel utilisateur correspond à une `organization_invitations` en `pending` non expirée, exécuter les mêmes actions que `accept_invitation` :
- créer le membership,
- renseigner `profiles.organization_id`,
- marquer l'invitation `accepted`.

Idempotent, sans effet sur les signups hors invitation.

### 2.3 Filet de sécurité côté client
Dans `src/contexts/AuthContext.tsx`, après hydratation du profil : si `profile.organization_id` est nul, chercher une `organization_invitations` `pending` non expirée pour l'email de l'utilisateur et appeler `accept_invitation`. Rattrape les comptes créés en dehors du flux invitation.

## Fichiers touchés
- Data-change (suppression Eva).
- Migration (mise à jour `handle_new_user`).
- `supabase/functions/auth-email-hook/index.ts`.
- `src/contexts/AuthContext.tsx`.

## Vérification
- Eva n'existe plus (ni auth, ni profil, ni invitation).
- Benjamin relance l'invitation.
- Eva clique le lien depuis sa boîte pro : passage par `/auth/confirm` puis `/invite/{token}`, rattachement automatique, apparition de l'organisation Albo dans son dashboard, invitation "acceptée" côté Benjamin.
