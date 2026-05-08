## Permettre le rattachement multi-organisations d'un utilisateur existant

**Fichier modifié** : `supabase/functions/superadmin-manage-user/index.ts` (action `create`) + `src/components/superadmin/CreateUserInOrgDialog.tsx`

### Logique de l'edge function

1. Tenter `inviteUserByEmail` / `createUser` comme aujourd'hui.
2. **Si erreur `email_exists`** :
   - Récupérer l'`user_id` via `admin.auth.admin.listUsers` filtré par email.
   - Vérifier `organization_members` pour `(user_id, organization_id)` :
     - **Cas C — déjà membre** : retour 409 *« Cet utilisateur fait déjà partie de l'organisation. »*
     - **Cas B — pas encore membre** :
       - Insérer dans `organization_members (user_id, organization_id)` (idempotent).
       - Insérer dans `user_roles (user_id, role: 'member', organization_id)` (idempotent).
       - **Ne pas** modifier `profiles.organization_id` — l'utilisateur basculera via le sélecteur multi-org.
       - Retour `{ success: true, attached: true }`.
3. **Cas A — création réelle** (comportement actuel) : profil + user_roles + ajout dans `organization_members` pour cohérence.

### UI

Dans `CreateUserInOrgDialog.tsx`, adapter le toast :
- `attached === true` → *« Accès à l'organisation ajouté à un utilisateur existant. »*
- sinon : comportement actuel (créé / invité).

### Hors scope
- Pas de migration DB.
- Pas de modification du sélecteur multi-org (déjà fonctionnel).
- Pas de changement aux autres actions (`set_role`, `move_org`, etc.).
