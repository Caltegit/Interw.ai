## Retirer le dropdown Rôle dans la création d'utilisateur

**Fichier** : `src/components/superadmin/CreateUserInOrgDialog.tsx`

1. Supprimer le bloc `<Label>Rôle *</Label>` + `<Select>` (Admin / Recruteur / Observateur).
2. Supprimer l'état `role` / `setRole` ; passer `role: "member"` en dur dans l'appel à l'edge function `superadmin-manage-user`.
3. Retirer `role` des conditions de validation (`handleCreate` et `disabled` du bouton Créer).
4. Retirer l'import `Select*` devenu inutilisé.

Aucun changement backend : l'edge function continue de recevoir un `role`, toujours `"member"`.
