

## Ajouter Modifier / Supprimer dans la fiche organisation

### Ce qui change

Sur la page « Détail organisation » (`/superadmin/orgs/:orgId`), chaque ligne d'utilisateur reçoit deux boutons à droite :

- **Crayon** → ouvre `EditUserDialog` (déjà existant) pour modifier nom, email, organisation et rôles.
- **Corbeille** → ouvre une confirmation puis supprime l'utilisateur via l'edge function `superadmin-manage-user` (action `delete`).

Le super admin ne peut pas se supprimer lui-même (bouton désactivé sur sa propre ligne, comme dans l'onglet global).

Après modification ou suppression, la liste des membres se rafraîchit automatiquement.

### Détails techniques

**Fichier modifié** — `src/pages/SuperAdminOrgDetail.tsx` :
- Importer `EditUserDialog`, `AlertDialog…`, `Button`, icônes `Pencil` / `Trash2`, `useAuth`, `supabase.functions.invoke`.
- Ajouter dans chaque ligne membre, à droite des badges, deux `Button variant="ghost" size="icon"`.
- État local `editing: Member | null` + `editOpen: boolean` pour piloter le dialog.
- Handler `handleDelete(member)` qui appelle `supabase.functions.invoke("superadmin-manage-user", { body: { action: "delete", user_id } })`, toast succès/erreur, puis `refresh()`.
- Le dialog `EditUserDialog` attend une forme `UserRow` (user_id, email, full_name, organization_id, roles[]) — on mappe `Member` vers ce format avant ouverture (les rôles existent déjà dans `members[].role`, on en fait `roles: m.role ? [m.role] : []`).
- `onUpdated` du dialog → `refresh()`.

Aucun changement backend, aucune migration : l'edge function `superadmin-manage-user` gère déjà `delete`, `update_profile`, `move_org`, `set_role`, `remove_role`.

### Hors champ

- Pas de modification de `EditUserDialog` lui-même.
- Pas de touche aux actions sur la table globale Utilisateurs (déjà fonctionnelle).
- Pas de gestion de la propriété de l'organisation (transfert d'owner) — à voir séparément si besoin.

