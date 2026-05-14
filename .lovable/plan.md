# Plan de correction

## Objectif
Faire en sorte que la colonne de droite reste visible en haut pendant le scroll, sans disparaître, avec :
- le bloc vidéo en haut à droite ;
- les notes recruteur juste en dessous ;
- la colonne gauche qui scrolle indépendamment.

## Schéma visuel cible
```text
┌──────────────────────────────────────────────────────────────────────┐
│ En-tête                                                             │
├───────────────────────────────┬──────────────────────────────────────┤
│ Colonne gauche                │ Colonne droite                      │
│                               │ ┌──────────────────────────────────┐ │
│ ┌───────────────────────────┐ │ │ Vidéo                           │ │
│ │ Bloc NOM compact          │ │ └──────────────────────────────────┘ │
│ └───────────────────────────┘ │ ┌──────────────────────────────────┐ │
│                               │ │ Notes recruteur                  │ │
│ Onglets + contenu             │ │                                  │ │
│                               │ │                                  │ │
│                               │ └──────────────────────────────────┘ │
│                               │                                      │
│ Scroll propre à gauche        │ Scroll propre à droite              │
└───────────────────────────────┴──────────────────────────────────────┘
```

## Ce que je vais corriger
1. Revoir le conteneur principal de la page session pour lui donner une vraie hauteur contrainte sous l’en-tête.
2. Supprimer le conflit actuel entre le scroll principal de la page et les scrolls internes des colonnes.
3. Mettre le bloc vidéo dans un vrai conteneur sticky attaché au bon parent.
4. Garder les notes dans la colonne de droite, sous la vidéo, avec leur propre zone visible.
5. Vérifier que la colonne droite reste à l’écran quand on scrolle le contenu de gauche.

## Détail technique
- Ajuster `SessionDetail.tsx` pour que la grille prenne une hauteur stable du type `h-[calc(100vh-...)]` ou équivalent compatible avec la structure existante.
- Éviter un `overflow` sur un parent qui casse le `sticky`.
- Garder un seul niveau de scroll par colonne.
- Si nécessaire, limiter le scroll global du `<main>` pour cette page afin que le comportement soit prévisible.
- Conserver le bloc NOM compact à gauche, sans ajouter de texte inutile.

## Validation
Je testerai ensuite dans l’aperçu :
- scroll de la colonne gauche ;
- scroll de la colonne droite ;
- maintien du bloc vidéo en haut ;
- notes toujours visibles sous la vidéo ;
- absence de disparition de la colonne droite.