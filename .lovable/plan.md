## Objectif

Corriger les garde-fous précédents pour refléter les vraies règles :
- Un email existant peut être ajouté comme super admin ou comme propriétaire d'une nouvelle organisation (compte multi-org).
- La modification d'email est totalement retirée : pour changer d'email, on supprime le membre puis on le réinvite.

---

## 1. Suppression complète de la modification d'email

**Backend — `supabase/functions/superadmin-manage-user/index.ts`**
- Retirer entièrement le bloc `if (email)` de l'action `update_profile`.
- L'action ne peut plus modifier que `full_name`. Si le body contient un champ `email`, il est ignoré (ou renvoie 400 selon préférence — je pars sur ignorer silencieusement pour la rétro-compatibilité).

**UI — `src/components/superadmin/EditUserDialog.tsx`**
- Supprimer le champ email du formulaire.
- Ajouter une note discrète : « Pour changer l'email d'un membre, supprimez-le puis réinvitez-le avec la nouvelle adresse. »

---

## 2. Création d'organisation — autoriser le multi-org

**Backend — `supabase/functions/superadmin-create-org/index.ts`**
- Retirer le blocage lignes 112–121 (`existingMemberships.length > 0` → erreur 409).
- Comportement : si l'email existe déjà, on réutilise le compte auth existant, on ne renvoie PAS de nouveau lien magique (le compte est déjà actif), on l'ajoute simplement comme membre + admin + owner de la nouvelle organisation.
- Le flag `magic_link_sent` reste `false` dans ce cas ; `owner_existing: true`.

**UI — `src/components/superadmin/CreateOrgDialog.tsx`**
- Retirer la mention « L'email doit correspondre à un nouveau compte. »
- Remplacer par : « Si l'email existe déjà, le compte sera rattaché à cette nouvelle organisation en plus des siennes. »

---

## 3. Attribution du rôle super admin sur compte existant

Le chemin actuel `action: "set_role"` fonctionne déjà pour promouvoir un compte existant en super admin — aucun changement nécessaire côté backend.

Vérification UI : confirmer que `EditUserDialog` permet bien d'ajouter le rôle `super_admin` à n'importe quel compte listé (déjà le cas via le sélecteur de rôles).

---

## Ce qui reste conservé des garde-fous précédents

- Interdiction pour un super admin de se supprimer lui-même.
- Vérification qu'un email n'est pas réutilisé silencieusement pour une identité auth différente (mais comme on ne modifie plus jamais un email, ce risque disparaît de fait).

---

## Fichiers touchés

- `supabase/functions/superadmin-manage-user/index.ts` — retrait bloc email dans `update_profile`.
- `supabase/functions/superadmin-create-org/index.ts` — retrait blocage multi-org (lignes 112–121).
- `src/components/superadmin/EditUserDialog.tsx` — retrait champ email + note.
- `src/components/superadmin/CreateOrgDialog.tsx` — mise à jour du texte d'aide.

Aucune migration DB nécessaire.
