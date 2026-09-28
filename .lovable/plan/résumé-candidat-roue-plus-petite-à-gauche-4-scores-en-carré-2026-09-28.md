# Résumé candidat : roue plus petite à gauche, 4 scores en carré

## Objectif
Sur l'onglet **Résumé**, la roue « Profil Interw » occupe une carte qui s'étire sur toute la largeur (730 px mesurés sur l'aperçu) alors que le diagramme lui-même est centré dedans, et les 4 encadrés Fit Poste / Orale / Attitude / Profil sont empilés les uns sous les autres dans une colonne étroite de 280 px. Résultat : 561 px de haut avant le « Bilan global ».

Objectif : roue plus petite et collée à gauche, les 4 encadrés placés **deux par deux** (un carré 2 × 2) à sa droite.

## Ce qui change
1. **Largeur de la roue réduite** : la carte de gauche passe de « tout l'espace restant » (730 px) à une largeur fixe d'environ 380 px. Le diagramme, qui remplissait 430 px, s'affiche autour de 330 px, et le cercle coloré de 250 à environ 190 px. Les 8 noms restent lisibles (leur taille de texte est augmentée pour compenser la réduction).
2. **Roue alignée à gauche** : plus d'espace vide à sa gauche, le diagramme démarre au bord de la carte.
3. **Les 4 encadrés en 2 × 2** : Fit Poste et Orale en haut, Attitude et Profil en bas, chacun cliquable comme aujourd'hui (il ouvre l'onglet correspondant). Leur cercle est légèrement plus petit et le texte resserré pour que deux colonnes tiennent confortablement, y compris sur un écran plus étroit. Les cartes gardent leur hauteur pleine et se répartissent l'espace, donc le bloc reste aligné sur la roue.

Rien d'autre sur la page ne bouge : Bilan global, Signaux, Communication, Soft skills, vidéos, et la grande roue de l'onglet Profil (420 px) restent inchangés.

## Détails techniques
- `src/components/session/SessionReportView.tsx` (onglet résumé) : la grille `lg:grid-cols-[minmax(0,1fr)_280px]` devient `lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]`, et `size={250}` devient `size={200}` sur la roue du résumé.
- `src/components/session/InterwProfilesWheel.tsx` : le conteneur du diagramme passe de centré (`mx-auto`) à aligné à gauche, et la taille des libellés autour de la roue passe de 13 à 15 (le dessin étant mis à l'échelle, ils rendraient trop petits sinon). L'onglet Profil, qui appelle ce même composant en plus grand, n'est pas modifié.
- `src/components/session/ScoresOverviewCard.tsx` : en mode résumé (`vertical`), la grille passe de 1 colonne à 2 colonnes fixes (2 × 2) ; le composant `ScoreGauge` reçoit une variante resserrée utilisée uniquement dans ce cas (cercle 80 → 64 px, marges réduites), les cartes remplissent la hauteur disponible. Le mode horizontal (4 en ligne), utilisé ailleurs, est conservé tel quel.

## Impact
- **Fiche recruteur** : le bloc du haut passe d'environ 561 px à environ 380 px de haut ; le « Bilan global » et les Signaux deviennent visibles sans défiler. Les 4 notes, leurs écarts par rapport à la moyenne du poste et leurs liens vers les onglets sont inchangés.
- **Parcours candidat** : aucun changement.
- **Données, calculs, rapports** : aucun changement (aucune migration, aucun appel au serveur).
- **Risque de casse** : faible, tout est en affichage. Les deux points à surveiller sont la lisibilité des 8 noms autour de la roue réduite et le fait que deux colonnes d'encadrés tiennent sans déborder sur une fenêtre étroite (la variante resserrée est prévue pour ça, et en dessous de l'écran large les 4 encadrés retombent en 2 × 2 puis en colonne).
- **Publication** : comme le reste du travail récent, ce réglage sera visible dans l'aperçu tant que le site n'est pas publié.

## Vérifications après modification
- Contrôle à l'écran de la fiche de Brice Muret : roue à gauche et plus petite, les 8 noms complets et lisibles, les 4 encadrés bien en 2 × 2, un clic sur « Attitude » ouvre l'onglet Attitude, aucune erreur dans la console.
- Contrôle à une largeur de fenêtre plus étroite : pas de débordement ni de texte coupé.
- Test de bout en bout côté candidat, puis côté recruteur, conformément à la règle en vigueur (le problème de configuration des tests automatiques déjà signalé reste bloquant de son côté).
