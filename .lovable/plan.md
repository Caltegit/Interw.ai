## Cause racine

`src/pages/ProjectNew.tsx` (ligne 18) contient une constante codée en dur qui force tous les nouveaux projets dans l'organisation SUPER ADMIN :

```ts
const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";
```

Utilisée 4 fois dans le fichier (création projet, lecture/insert template intro). Résultat : 34 projets dans SUPER ADMIN dont 31 ne devraient pas y être.

## 1. Correctif code

**`src/pages/ProjectNew.tsx`**
- Supprimer la constante `DEFAULT_ORG_ID`.
- Lire l'organisation de l'utilisateur via `useOrgRole()` (déjà dans le projet) — champ `organizationId`.
- Si `organizationId` est `null` au moment du submit, afficher un toast d'erreur et bloquer la création.
- Remplacer les 4 occurrences de `DEFAULT_ORG_ID` par `organizationId`.

**Audit**
- `rg "a0000000-0000-0000-0000-000000000001" src/` pour vérifier qu'aucun autre fichier ne reproduit le pattern. Corriger si trouvé.

## 2. Migration de données

Migration SQL en deux étapes :

**a) Réassigner les projets dont le créateur a une vraie organisation**

```sql
UPDATE projects p
SET organization_id = pr.organization_id
FROM profiles pr
WHERE p.created_by = pr.user_id
  AND p.organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND pr.organization_id IS NOT NULL
  AND pr.organization_id <> 'a0000000-0000-0000-0000-000000000001';
```

Effet attendu :
- 3 projets de cyriaque@withgardner.com → org "With Gardner"
- 1 projet de mehdi@ubiq.fr → org "UBIQ"
- 1 projet de benjamin@alboteam.com → org "ALBO"

**b) Supprimer les projets créés par des comptes sans organisation**

Concernés : `c@bap.fr`, `c+1@bap.fr`, `c+3@bap.fr`, `c+5@bap.fr`, `cclemalte@gmail.com` (≈ 5 projets, sans `organization_id` sur leur profil).

Suppression en cascade des données liées (sessions, session_messages, transcripts, reports, report_shares, questions, evaluation_criteria) puis suppression des projets eux-mêmes, dans une seule migration transactionnelle.

**Conservé en l'état :** les 23 projets de `clement.alteresco@gmail.com` restent dans l'org SUPER ADMIN.

## Vérification post-migration

Recompter par organisation pour confirmer que SUPER ADMIN ne contient plus que les projets de clement.alteresco (≈ 23) et que UBIQ / With Gardner / ALBO ont récupéré les leurs.
