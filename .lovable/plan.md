## Objectif

Quand des profils sont sélectionnés dans la vue tableau, ne plus faire apparaître la barre pleine largeur `BulkActionsBar` au-dessus et en dessous du tableau. Faire apparaître seulement le bouton dropdown **Actions** (avec son menu : Email, Partager, Comparer, Supprimer), positionné juste à gauche du toggle "vue tableau / vue cartes" — en haut **et** en bas.

## Changements (src/pages/ProjectDetail.tsx)

1. **Nouveau composant compact** `BulkActionsButton` (ou refacto de `BulkActionsBar`) :
   - Rend uniquement le `DropdownMenu` avec le trigger `<Button size="sm">Actions <ChevronDown/></Button>`.
   - Conserve les mêmes items (Email, Partager les rapports, Comparer, Supprimer) avec les mêmes états `disabled`.
   - Affiche discrètement à droite du bouton un petit texte `"{count} sélectionné(s)"` + un `×` cliquable pour `onClear` (au lieu d'un bouton "Tout désélectionner" séparé).

2. **Insertion en haut** (~ligne 683, dans la barre de filtres) :
   - Avant le `<div className="flex rounded-md border">` du toggle vue, ajouter `{selectedIds.size > 0 && <BulkActionsButton ... />}`.

3. **Insertion en bas** :
   - Supprimer les deux blocs `BulkActionsBar` actuels (lignes 766–776 au-dessus du tableau, et 1030–1040 sous le tableau).
   - Ajouter une rangée compacte sous le tableau, alignée comme la barre de filtres du haut, contenant à gauche `<BulkActionsButton ... />` (uniquement si sélection > 0) — pas de toggle vue en bas, le bouton apparaît seul à gauche.

4. **Comportement inchangé** : sélection multi-lignes via checkbox du tableau, callbacks `onEmail / onDelete / onCompare / onShareReports / onClear` identiques.

## Détails visuels

- Bouton `size="sm"` `variant="default"` — même style qu'aujourd'hui dans le dropdown, mais sans le conteneur `bg-muted/40 border` plein largeur.
- Apparition douce : ajouter `animate-fade-in` (déjà disponible via Tailwind/tailwindcss-animate) sur le wrapper.
- Le compteur reste visible mais discret (`text-xs text-muted-foreground`).

## Hors scope

- Pas de changement de la logique de sélection, des dialogs, ni de la vue cartes.
- Pas de changement sur `Dashboard.tsx` (la demande concerne la page projet).
