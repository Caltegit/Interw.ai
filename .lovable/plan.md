## Modifications dans `src/pages/ProjectDetail.tsx`

**1. Vue cartes par défaut**
- Ligne 109-112 : changer le défaut de `"table"` à `"cards"` (initial state et fallback localStorage). Les utilisateurs ayant déjà choisi "table" précédemment garderont leur préférence.

**2. Réorganiser la barre de filtres (lignes 629-755)**
- Déplacer le toggle vue tableau/cartes en première position (à gauche).
- Déplacer le champ "Rechercher" tout à droite avec `ml-auto`.
- Ordre final : `[toggle vue] [Toutes/Mes sessions] [Filtres] [Tri] [compteur N/N] [Rechercher]`

Aucune autre logique (filtrage, tri, pagination) n'est touchée.