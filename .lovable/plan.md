## Bug : création de membre impossible — enum `app_role` invalide

### Problème
L'enum Postgres `app_role` contient les valeurs `{admin, recruiter, viewer, super_admin}`.  
Or le front (`CreateUserInOrgDialog`) et la fonction Edge (`superadmin-manage-user`) envoient le rôle `"member"`, qui n'existe pas dans l'enum. Postgres renvoie donc :

> `invalid input value for enum app_role: "member"`

### Fichiers à corriger

1. **`src/components/superadmin/CreateUserInOrgDialog.tsx`** (ligne 37)
   - Remplacer `role: "member"` par `role: "recruiter"`

2. **`supabase/functions/superadmin-manage-user/index.ts`** (ligne 88)
   - Remplacer `const targetRole = role || "member";` par `const targetRole = role || "recruiter";`

### Pourquoi "recruiter"
C'est le rôle standard d'un collaborateur RH dans l'organisation. Si besoin d'un rôle plus restrictif (lecture seule), il faudra passer explicitement `"viewer"`.

### Vérification
Déployer la fonction Edge modifiée, puis tenter de créer un utilisateur depuis le panneau Super Admin pour confirmer la disparition de l'erreur.