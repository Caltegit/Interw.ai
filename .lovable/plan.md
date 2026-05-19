# Corriger la création d'organisation + propriétaire

## Problème

Quand un super admin crée une orga avec son propriétaire d'un coup, l'attachement profil/membership/rôle échoue silencieusement à cause d'une race avec le trigger `handle_new_user`. Résultat : l'orga existe sans owner, et l'utilisateur invité n'a ni `organization_id`, ni membership, ni rôle admin.

Cas observés en base :
- **Thom** (orga sans owner) + `rpeninque@thomgroup.com` (orphelin)
- **TEST ORGA** (orga sans owner) + `c+345@bap.fr` (orphelin)

## Correctifs

### 1. `supabase/functions/superadmin-create-org/index.ts`

Remplacer la séquence non sécurisée par :

- **Attendre que le profil existe** après `inviteUserByEmail` : petite boucle de retry (max ~5 essais, 200 ms) qui poll `profiles.user_id`. Si toujours absent, faire un `insert` direct dans `profiles` en fallback.
- Passer `profiles.update` → **`upsert`** sur `user_id` avec `organization_id` + `full_name` + `email`.
- Vérifier les erreurs de chaque appel (`update profile`, `upsert member`, `insert role`) et renvoyer un 500 explicite plutôt que de continuer.
- Si l'`organizations.insert` réussit mais qu'une étape ultérieure échoue, **rollback manuel** : `organizations.delete` + log d'erreur, pour éviter de laisser une orga zombie.

### 2. `supabase/functions/superadmin-manage-user/index.ts` (action `create`)

Même traitement :
- Même boucle d'attente du profil après `inviteUserByEmail`.
- `profiles.upsert` au lieu de `update`.
- Vérifier les erreurs des inserts membership + rôle.
- Si `role === 'admin'` et l'orga n'a pas d'owner, ne pas se contenter de l'écriture optimiste : vérifier le résultat.

### 3. Migration de réparation (data fix)

Pour chaque cas orphelin connu :

```text
Thom        → owner_id = rpeninque@thomgroup.com (af7aed7a-…)
TEST ORGA   → owner_id = c+345@bap.fr
```

Actions SQL (via insert tool, pas migration de schéma) :
- `UPDATE organizations SET owner_id = <user_id> WHERE id = <org_id>` pour les 2 orgas
- `UPDATE profiles SET organization_id = <org_id> WHERE user_id = <user_id>`
- `INSERT INTO organization_members (user_id, organization_id)` (ON CONFLICT DO NOTHING)
- `INSERT INTO user_roles (user_id, role, organization_id) VALUES (…, 'admin', …)` (idempotent)

Les 6 autres profils orphelins (`hello@alboteam.com`, `romainpeninque@yahoo.fr`, `c+1@bap.fr`, `c+3@bap.fr`, `cclemalte@gmail.com`, `e2e-test@interw.ai`) **ne sont pas concernés** par ce fix automatique — ils n'ont aucune orga associée temporellement. À traiter au cas par cas (sujet déjà ouvert : option (b) de la conversation précédente).

## Hors périmètre

- Pas de changement de schéma DB.
- Pas de touche au flux d'invitation classique (`organization_invitations` / `send-invitation`) — celui-ci fonctionne déjà bien car il rattache au moment de l'acceptation.
- Pas d'ajout de `sessions.created_by` (sujet séparé, option (a)).

## Vérification après implémentation

1. Re-créer une orga test via super admin → vérifier en DB que `owner_id`, `profiles.organization_id`, `organization_members`, `user_roles` sont tous renseignés.
2. Vérifier que les 2 cas réparés (Thom, TEST ORGA) ont bien leur owner et que `rpeninque@thomgroup.com` peut se connecter et voir l'orga Thom dans son sélecteur.
