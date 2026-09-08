# Matrice de la fiche candidat : allègement visuel

## Ce qui change

### 1. Plus de pourcentages dans l'en-tête
Sous chaque nom de critère, la ligne « 35% » disparaît : elle varie selon la question et surcharge la lecture. Seul le libellé du critère reste (le détail du poids s'affiche toujours au survol).

### 2. « Non évalué » devient un signe discret
Les cases sans preuve suffisante affichent un simple tiret « — » en gris clair, dans une case au contour pointillé, au lieu du texte « Non évalué ».

### 3. Légende sous le tableau
Sous la matrice, à côté de la phrase existante :
« — aucune preuve suffisante trouvée pour évaluer cette question sur ce critère. »

## Ce qui ne change pas
- Le calcul des moyennes (les cases sans preuve restent exclues).
- Les pondérations par question, toujours utilisées pour le calcul.
- Le bouton « Régénérer » : il relance l'analyse et remplace la matrice une fois le nouveau résultat obtenu. Sans régénération, la matrice existante est conservée telle quelle.

## Vérification
Capture d'écran d'un rapport candidat existant pour te montrer le rendu final avant de conclure.

## Détail technique
`src/components/session/FitMatrixCard.tsx` uniquement :
- retirer le `<div>` du poids (`{c.weight}%`) dans l'en-tête de colonne, garder le `title` au survol ;
- remplacer le libellé « Non évalué » par « — » avec `aria-label` conservé ;
- ajouter la ligne de légende sous le tableau.
Aucune modification côté fonctions ou base de données.
