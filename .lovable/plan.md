# Bloc vidéo : fond blanc et suppression des lignes de séparation

## Objectif

Faire en sorte que le bloc vidéo de la landing reprenne le fond blanc du reste du site et supprimer les lignes visibles qui découpent les sections.

## État actuel

Dans `src/pages/Landing.tsx` :

- la section vidéo (lignes 322-328) a un fond contrasté `bg-foreground/[0.03]` et des bordures haut/bas `border-y` ;
- la section preuve/logos juste en dessous (ligne 331) a également des bordures haut/bas `border-y`.

Ces deux traits créent un effet de "cadre/cassure" entre le hero, la vidéo et le bandeau logos.

## Correctif

1. **Section vidéo** :
   - remplacer `bg-foreground/[0.03]` par `bg-background` ;
   - supprimer `border-border border-y`.

2. **Section preuve/logos** :
   - supprimer `border-border border-y` pour ne plus avoir de ligne de séparation avec la vidéo au-dessus.

3. Conserver le padding, la largeur max de 1280 px et le centrage actuels.

## Fichier concerné

- `src/pages/Landing.tsx`

## Vérification

- Capture desktop : le bloc vidéo a le même fond blanc que le hero et le reste de la page, aucune ligne horizontale visible autour de la vidéo ou du bandeau logos.
- Capture mobile : idem, pas de ligne distincte et pas de chevauchement avec les blocs adjacents.
