

## Refonte de la création Organisation + Admin

### Diagnostic en base

J'ai vérifié les 5 dernières orgs créées. Le constat est sans appel :

| Org | owner_id | invitation status | rôle admin présent ? |
|---|---|---|---|
| TEST TEST | NULL | pending | non (user pas créé) |
| BERTO INC | **NULL** | pending | oui mais bricolé |
| With Gardner | **NULL** | pending | oui mais bricolé |
| ALBO INC | **NULL** | pending | oui mais bricolé |
| UBIQ | OK | accepted | oui |

→ Sur 4 invitations, **aucune n'a été acceptée proprement** : `owner_id` reste NULL et `organization_invitations.status = 'pending'`.

### Cause racine

Le flux actuel en 3 morceaux (`CreateOrgDialog` → `send-invitation` → `InviteSignup`) est cassé :

1. **`CreateOrgDialog`** crée l'org + une ligne dans `organization_invitations` avec un token interne (ex. `abc123…`).
2. **`send-invitation`** appelle ensuite `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: "/invite/<token>" })`. **Mais Supabase ignore très souvent le `redirectTo`** (selon les Site URL configurées) et envoie un lien Auth standard `?type=invite&token=xxx`. Le user clique, est connecté… mais arrive sur `/dashboard` au lieu de `/invite/<token>` → la fonction `accept_invitation()` n'est jamais appelée → `owner_id` reste NULL, le statut reste `pending`, le projet démo n'est jamais seedé pour lui, etc.
3. Pire : si l'email Supabase Auth contient déjà l'URL générique, le user crée son compte et n'a **aucun rôle** ni **aucun rattachement org** au départ. Les rôles admin observés en base ont probablement été ajoutés à la main.
4. Conséquence visible : tu vois les 4 orgs sans owner et tu te demandes pourquoi rien n'est cohérent.

Bonus : la fonction `superadmin-manage-user` (dialog "Créer un utilisateur") fait elle aussi des invitations sans token applicatif, donc même problème quand tu y choisis une org + un rôle.

### Correctif proposé — un seul flux fiable et déterministe

**1. Faire la création complète **côté serveur** dans une nouvelle Edge Function `superadmin-create-org`**

Au lieu d'enchaîner 3 appels client → DB → fonction, on fait tout côté serveur en service-role :

```text
superadmin-create-org({ org_name, admin_email, admin_full_name })
  ├─ insert organizations(name, slug)
  ├─ check si l'email a déjà un compte auth :
  │    • OUI → on récupère son user_id
  │    • NON → on appelle inviteUserByEmail({ redirectTo: /invite/<token> })
  ├─ upsert profiles.organization_id = org.id pour ce user
  ├─ update organizations.owner_id = user.id  ← clé du fix
  ├─ insert user_roles(user_id, 'admin', org.id)
  ├─ insert organization_invitations(... status='accepted')   (trace)
  ├─ PERFORM seed_default_question_templates / criteria / interview_templates
  └─ PERFORM seed_demo_project(org.id, user.id)
```

→ **owner_id est défini dès la création** même avant que l'utilisateur ait cliqué dans l'email. Le projet démo est seedé avec le **bon `created_by`** (le futur admin). Le rôle admin est garanti.

L'email Supabase ne sert plus qu'à **définir le mot de passe** (pour les nouveaux comptes). S'il existe déjà, on lui envoie quand même un email de réinitialisation pour qu'il sache qu'on l'a ajouté à une nouvelle org.

**2. Simplifier `InviteSignup.tsx`**

Comme tout est déjà câblé en base, `/invite/<token>` devient un simple **landing de bienvenue** : "Vous avez été ajouté à `<org>`. Définissez votre mot de passe." Plus besoin d'appeler `accept_invitation` — ou alors elle devient idempotente (ne fait rien si owner_id et profile.organization_id sont déjà OK).

**3. Faire pareil pour `superadmin-manage-user` (action `create`)**

Quand on crée un utilisateur via le dialog "Créer un utilisateur" en attribuant une org + un rôle, on fait dans la foulée :
- `profiles.organization_id = org_id`
- `user_roles.insert(role, org_id)`
- (déjà fait aujourd'hui, mais on ajoute) si le rôle est `admin` et que l'org n'a **pas** de `owner_id` → on assigne ce user comme owner.

**4. Migration de réparation pour les 4 orgs cassées**

```sql
-- Pour chaque org sans owner_id mais avec un user dont profile.organization_id pointe dessus :
UPDATE organizations o
SET owner_id = (
  SELECT p.user_id FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id AND ur.organization_id = o.id AND ur.role = 'admin'
  WHERE p.organization_id = o.id
  ORDER BY p.created_at LIMIT 1
)
WHERE o.owner_id IS NULL
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.organization_id = o.id);

-- Marquer les invitations comme acceptées pour les emails déjà rattachés
UPDATE organization_invitations oi
SET status = 'accepted'
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.email = oi.email AND p.organization_id = oi.organization_id
  );

-- Réassigner le created_by du projet démo au owner_id (déjà fait dans la migration précédente)
-- + relancer le seed pour les orgs qui n'ont pas de projet démo
```

Pour TEST TEST (aucun user encore créé), on laisse l'invitation pending — elle est déjà valide. L'utilisateur pourra signer via `/invite/<token>` et le nouveau flux fera tout proprement à l'acceptation.

**5. Hardening de `accept_invitation` (filet de sécurité)**

On rend la fonction **complètement idempotente** : si `profiles.organization_id` est déjà bon ET `user_roles` contient déjà admin → on ne refait rien d'autre que marquer l'invitation acceptée. Comme ça même si elle est appelée plusieurs fois (cas où le user clique sur l'ancien lien pendant qu'on déploie) → pas d'erreur, pas de doublon.

### Fichiers touchés

- **Nouveau** : `supabase/functions/superadmin-create-org/index.ts` — création atomique côté serveur.
- `src/components/superadmin/CreateOrgDialog.tsx` — appelle la nouvelle edge function (un seul invoke, plus de logique côté client).
- `supabase/functions/superadmin-manage-user/index.ts` — dans l'action `create`, si `role = admin` et `org.owner_id` est NULL, on assigne ce user comme owner et on déclenche le seed démo.
- `src/pages/InviteSignup.tsx` — simplifié : si déjà rattaché, on redirige vers `/dashboard` après définition du mot de passe ; sinon on appelle `accept_invitation` (qui devient idempotente).
- **Nouvelle migration SQL** : 
  - `accept_invitation` rendue idempotente.
  - UPDATE de réparation des 4 orgs sans owner.
  - Trigger `trg_seed_on_owner_set` déjà en place s'occupera du seed quand on positionne `owner_id`.

### Hors champ

- Refonte UI complète du dialog (on garde les 3 mêmes champs : nom org, email admin, nom admin).
- Migration des autres tables vers une visibilité étendue (déjà fait pour `projects` dans la migration précédente).
- Gestion multi-admins par org (techniquement déjà supportée, juste pas exposée dans l'UI super-admin).

