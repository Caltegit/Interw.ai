## Objectif

Ajouter une case à cocher en haut à gauche de chaque vignette candidat dans la vue **Cartes** (comme déjà disponible dans la vue Tableau), et faire apparaître la barre d'actions groupées (`BulkActionsButton`) quand au moins une carte est sélectionnée.

## Comportement

- Case à cocher en overlay, position absolue en haut à gauche de la `Card`, au-dessus du header (nom + score).
- Clic sur la case : sélectionne/désélectionne sans naviguer ni démarrer la vidéo (`stopPropagation`).
- Sélection partagée avec la vue Tableau : on réutilise `selectedIds` / `toggleSelect` / `clearSelection` déjà présents dans `ProjectDetail.tsx` — ainsi une sélection faite en cartes reste visible si l'utilisateur bascule vers tableau.
- Barre `BulkActionsButton` (Email, Supprimer, Comparer, Partager rapports) : aujourd'hui affichée uniquement si `view === "table"`. Étendre la condition pour qu'elle s'affiche aussi en `view === "cards"` dès que `selectedIds.size > 0`.
- Pas de checkbox "tout sélectionner" en vue cartes (cohérent avec une grille). La sélection multiple se fait carte par carte. Le bouton "tout désélectionner" reste accessible via la barre d'actions.

## Détails techniques

### `src/components/project/SessionCard.tsx`
- Ajouter deux props optionnelles : `selected?: boolean` et `onToggleSelect?: (sessionId: string) => void`.
- Dans le rendu : ajouter `relative` à la `Card` racine (ou conserver `overflow-hidden` mais positionner la checkbox au-dessus). Insérer un `<Checkbox>` shadcn positionné `absolute top-2 left-2 z-10` avec un fond `bg-background/80 backdrop-blur-sm` pour rester lisible sur fond clair/sombre.
- Quand `selected === true`, ajouter un anneau visuel sur la `Card` (`ring-2 ring-primary`) pour refléter l'état comme dans la vue tableau.
- `onClick` du conteneur de la checkbox : `e.stopPropagation()` pour ne pas déclencher le `Link` du nom.

### `src/pages/ProjectDetail.tsx`
- Passer `selected={selectedIds.has(s.id)}` et `onToggleSelect={toggleSelect}` à chaque `<SessionCard />` rendue dans la grille (lignes ~767-774).
- Modifier la condition d'affichage de `BulkActionsButton` (ligne 691) :
  - Avant : `view === "table" && selectedIds.size > 0`
  - Après : `selectedIds.size > 0` (peu importe la vue).
- Aucun changement nécessaire sur les dialogues `BulkEmailDialog`, `ShareReportsDialog`, `ProjectCompare` : ils consomment déjà `selectedIds`.

### Aucun changement
- Pas de modification du backend, des hooks, ni du store.
- Pas de modification de la vue Tableau (déjà fonctionnelle).
- Pas de nouveau composant : on réutilise `Checkbox` (shadcn) déjà importé dans le projet.

## Vérification
- En vue Cartes : cocher 2 candidats → la barre d'actions apparaît avec compteur "2", boutons Email / Comparer / Partager / Supprimer fonctionnent.
- Basculer vers Tableau : les mêmes 2 lignes restent cochées.
- Clic sur la checkbox ne lance pas la vidéo et ne navigue pas vers la fiche candidat.
