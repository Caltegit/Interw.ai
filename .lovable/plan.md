## Objectif
Améliorer la mise en page de la matrice Fit :
- Colonnes de critères de largeur égale et responsives (`table-fixed` + largeur en %).
- Titres de colonnes lisibles sur plusieurs lignes (wrap au lieu de troncature).
- Colonne « Moyenne » déplacée à gauche (juste après « Question ») avec un fond distinctif pour la faire ressortir.

## Changements — `src/components/session/FitMatrixCard.tsx`

1. **Table layout**
   - Remplacer `w-full border-separate border-spacing-1` par `w-full table-fixed border-separate border-spacing-1`.
   - Supprimer `overflow-x-auto` (plus nécessaire, largeurs adaptatives).
   - Colonne « Question » : largeur fixe raisonnable (`w-[28%]` ou `min-w-[200px]`).
   - Colonne « Moyenne » : largeur fixe (`w-[10%]`).
   - Colonnes critères : partager équitablement le reste via `<colgroup>` avec `style={{ width: \`${62 / criteria.length}%\` }}`.

2. **En-têtes critères multi-lignes**
   - Retirer `truncate`, `min-w-[100px]` et `whitespace-nowrap`.
   - Autoriser le retour à la ligne : `break-words leading-tight`.
   - Garder le poids `%` en dessous.

3. **Déplacer « Moyenne » à gauche**
   - Dans `<thead>` : ordre = Question → Moyenne → critères.
   - Dans chaque `<tr>` du `<tbody>` : cellule moyenne juste après la question.
   - Ligne « Moyenne » finale : mettre la case moyenne globale (ou vide) juste après le libellé, puis les moyennes par critère.

4. **Style de mise en valeur de la colonne Moyenne**
   - Header : `bg-primary/10 text-primary rounded-md`.
   - Cellules moyennes : conserver `scoreTone(...)` mais ajouter un contour renforcé (`ring-1 ring-primary/20`) et un léger fond de colonne via une classe sur les `<td>` (`bg-primary/5`).

## Non-changements
Aucun changement de logique (calculs de moyennes inchangés), pas de modification back-end, pas de migration.
