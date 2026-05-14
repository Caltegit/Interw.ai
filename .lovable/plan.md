## Objectif
Rendre le panneau de droite réellement fixe en haut, avec un scroll indépendant à gauche, sans faire disparaître la vidéo ni les notes.

## Plan
1. Reprendre la structure de hauteur de la page session pour supprimer le conflit entre le scroll global de la page et les scrolls internes.
2. Transformer la grille en zone à hauteur contrainte, avec :
   - colonne gauche = scroll interne,
   - colonne droite = panneau fixe,
   - notes = zone qui prend le reste de la hauteur.
3. Réappliquer le comportement figé au bloc vidéo sur le bon parent, au lieu de le laisser dans un conteneur qui sort du viewport.
4. Garder le bloc candidat compact à gauche, sans rajouter de texte.
5. Tester visuellement dans l’aperçu sur la page session actuelle en scrollant fortement pour vérifier que :
   - la vidéo reste en haut,
   - les notes restent visibles,
   - seule la colonne gauche défile.
6. Si le test n’est pas concluant, revenir immédiatement à la structure précédente stable au lieu d’empiler d’autres correctifs.

## Détail technique
```text
AppLayout
└── main : ne doit plus piloter le scroll qui casse le sticky

SessionDetail
└── wrapper hauteur contrainte
    ├── gauche : overflow-y-auto
    └── droite : sticky top-0 + flex-col
        ├── vidéo : bloc figé
        └── notes : flex-1 min-h-0
```

## Validation attendue
- En scrollant le contenu d’analyse, la colonne droite reste en place.
- La vidéo ne sort plus par le haut.
- Les notes recruteur restent dans la colonne droite, sous la vidéo.
- Aucun ajout de texte ni changement fonctionnel hors layout.

## Si tu veux limiter le risque
Si ce correctif unique ne passe pas la validation visuelle, la bonne suite sera un retour à la dernière version stable, pas un nouveau bricolage.