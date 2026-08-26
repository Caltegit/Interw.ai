# Harmoniser le format des 3 captures

Aujourd'hui les trois images ont des hauteurs différentes (1500, 2000, 1560 px pour 2880 de large), ce qui donne des blocs de tailles inégales sur la page d'accueil.

## Ce qui change

- Un seul format pour les trois images : **2880 x 1500** (le format de la capture des critères, déjà validée).
- Les captures « rapport Camille Fontaine » et « liste des candidats » sont reprises à ce format, sans étirement : on refait la capture avec le bon rapport largeur/hauteur et un léger dézoom pour que le contenu clé reste visible.
  - Rapport : bandeau candidat, score global, onglets et cartes de scores, début du bilan.
  - Liste candidats : en-tête du poste, filtres et les premières lignes du tableau.
- Contenu, anonymisation et cadrage général identiques à ce qui a été validé (organisation Novéa, noms fictifs, e-mails @exemple.fr).

## Vérification

Nouvel aperçu des trois images incrustées dans leurs fonds peinture, côte à côte, pour vérifier qu'elles ont bien la même taille avant remplacement dans `src/assets/`.

## Détails techniques

- Captures Playwright sur l'app locale, session authentifiée, viewport 1800 x 938 en `deviceScaleFactor` 1,6 → 2880 x 1500 exact pour les trois.
- Remplacement ensuite de `product-projects.png`, `product-report.png` et `product-dashboard.png` ; aucun changement de code nécessaire dans `Landing.tsx`.
