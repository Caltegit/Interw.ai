## Réordonner le cartouche vidéo sur mobile

### Contexte
Dans `SessionDetail.tsx` et `SharedReport.tsx`, la mise en page utilise une grille 2 colonnes sur desktop :
- Colonne gauche : bannière candidat + onglets + contenu
- Colonne droite : lecteur vidéo + notes

Sur mobile (1 colonne), l’ordre DOM fait apparaître la vidéo **en bas**, après tout le contenu des onglets. L’utilisateur souhaite que la vidéo soit en **2ème position**, juste après la bannière du candidat.

### Changements

#### 1. SessionDetail.tsx
- Extraire le `<DecisionBanner>` de la colonne gauche du grid pour le placer comme **élément frère au-dessus du grid**.
- Le `<TabsList>` reste dans la colonne gauche du grid.
- Sur mobile, la grille à 1 colonne avec `order` donnera :
  1. Bannière candidat (hors grid, en premier)
  2. Cartouche vidéo (`order-1 lg:order-2`)
  3. Onglets + contenu (`order-2 lg:order-1`)
- Sur desktop (`lg:`), l’ordre redevient normal : colonne gauche (onglets) | colonne droite (vidéo).
- Ajuster les classes `lg:sticky` et `lg:top-6` du wrapper Tabs pour qu’elles s’appliquent au `<TabsList>` isolé (ou au nouveau wrapper de la colonne gauche).

#### 2. SharedReport.tsx
- Appliquer exactement le même réordonnancement : sortir le `<DecisionBanner>` du grid, le placer au-dessus, et inverser l’`order` mobile de la vidéo (`order-1`) et du contenu (`order-2`).

### Vérification
- Tester en responsive (mobile ≤ 1024 px) : la vidéo doit apparaître juste sous la bannière candidat, avant les onglets.
- Tester en desktop (≥ 1024 px) : aucune régression visuelle, la vidéo reste dans la colonne de droite.
