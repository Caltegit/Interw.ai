# Visibilité du projet (étape 5)

## Comportement
- Le créateur du projet **et** le propriétaire de l'organisation voient **toujours** le projet (impossibles à décocher).
- À la création / édition, on peut cocher d'autres membres de l'organisation pour leur donner accès.
- Les membres non cochés ne voient pas le projet dans leur liste « Projets ».
- Les super admins continuent de tout voir.

## Étape 5 — UI
Nouvelle carte « Visibilité du projet » sous « Destinataires des rapports » :
- Texte court : « Choisissez qui peut voir ce projet. »
- Sélecteur multi-membres (même Popover + Checkbox que les destinataires).
- Créateur et propriétaire affichés cochés, désactivés, mention « (toujours) ».
- Les autres membres sont cochables.

## Données
Nouvelle colonne sur `projects` :
- `visible_to_user_ids uuid[] NOT NULL DEFAULT '{}'` — membres additionnels autorisés (créateur et propriétaire non stockés, déduits dynamiquement).

## Règle d'accès (RLS)
La policy SELECT actuelle `Org members can view org projects v2` est remplacée par :

```
created_by = auth.uid()
OR auth.uid() = ANY (visible_to_user_ids)
OR EXISTS (SELECT 1 FROM organizations o
           WHERE o.id = organization_id AND o.owner_id = auth.uid())
OR is_super_admin(auth.uid())
```

Policies UPDATE / DELETE inchangées (créateur, propriétaire, super admin gardent leurs droits actuels).

## Code à modifier
- **Migration** : ajout colonne + remplacement policy SELECT projects.
- `src/components/project/ProjectForm.tsx` : nouvel état `visibleToUserIds`, nouvelle carte à l'étape 5, inclus dans `onSubmit`.
- `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` : passer / lire `visible_to_user_ids` dans insert/update et l'état initial.
- `ProjectFormState` : ajouter `visibleToUserIds: string[]`.

Aucun changement sur les requêtes de liste : la RLS filtre automatiquement.
