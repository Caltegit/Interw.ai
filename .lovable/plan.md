## Plan : corriger « Edge Function returned a non-2xx status code » lors de la création de c@bap.fr dans UBIQ

### Diagnostic

État actuel en base pour `c@bap.fr` :

- `auth.users` : utilisateur existe (`78651389…`).
- `organization_members` : déjà membre de **ALBO** **et** de **UBIQ**.
- `user_roles` : **aucune ligne** (rôle manquant).
- `profiles.organization_id` : pointe vers ALBO (org « active »).

Quand on relance « Créer un utilisateur dans UBIQ » :

1. `inviteUserByEmail` échoue avec `email_exists` (correct).
2. La fonction retrouve l'`user_id` existant.
3. Elle teste `organization_members(user_id, organization_id=UBIQ)` → **trouve la ligne** (rattachée lors de la précédente tentative).
4. Elle renvoie **409 « Cet utilisateur fait déjà partie de l'organisation. »**

Côté UI, `supabase.functions.invoke` enveloppe tout statut non-2xx dans un `FunctionsHttpError` dont le `.message` est générique : « Edge Function returned a non-2xx status code ». Le vrai message JSON (`error: "..."`) est dans `error.context` et n'est jamais lu → toast inutile.

Deux corrections complémentaires à apporter.

### Correctif 1 — Edge function `superadmin-manage-user` (action `create`)

Comportement idempotent quand l'utilisateur existe et est déjà membre de l'organisation cible :

- Au lieu de renvoyer 409, **s'assurer que la ligne `user_roles` existe** pour ce couple (`user_id`, `organization_id`, `role` par défaut `member`) et **renvoyer 200** avec un flag `already_member: true` (et `attached: true`).
- Conserver le comportement actuel pour le cas où la membership n'existe pas encore (insertion + role + `attached: true`).
- Cela répare aussi le cas réel de `c@bap.fr` : la ligne `user_roles` manquante sera créée automatiquement.

### Correctif 2 — UI `CreateUserInOrgDialog.tsx`

Lire le vrai message d'erreur retourné par la fonction quand `supabase.functions.invoke` renvoie un `FunctionsHttpError` :

- Si `error` est défini, tenter `await error.context?.json()` (ou `.text()` en fallback) pour récupérer `{ error: "..." }` et utiliser ce message dans le toast au lieu de « Edge Function returned a non-2xx status code ».
- Adapter le toast de succès pour ajouter une variante `already_member` (ex. titre « Déjà membre », description « L'utilisateur faisait déjà partie de l'organisation, son accès a été vérifié. »).

### Hors scope

- Pas de migration DB.
- Pas de modification des autres actions (`set_role`, `delete`, etc.).
- Pas de changement du sélecteur multi-organisations.
