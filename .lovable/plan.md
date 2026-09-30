# Roue des profils : noms plus lisibles + pourcentage sous chaque nom

## Ce qui se passe aujourd'hui (mesuré sur la fiche de Diane)

Dans l'onglet Résumé, la carte de la roue fait 420 px de large et le dessin est affiché sur 370 px alors que sa zone de dessin interne en fait 520 : tout est donc réduit à 71 %. Les noms écrits à 13 px s'affichent en réalité à **9,3 px** — d'où « on ne voit pas grand-chose ». Le pourcentage, lui, n'apparaît qu'au survol ou dans les pastilles du haut.

## Ce que je vais changer

Dans la roue (`src/components/session/InterwProfilesWheel.tsx`), autour du cercle :

- **Noms en 18 px** (contre 13 aujourd'hui) → affichés à environ **13 px** à l'écran, soit +40 % ;
- **Le pourcentage juste en dessous du nom**, en gras, dans la couleur du profil (ex. « Leader » puis « 62 % ») ;
- Les profils sans preuve gardent leur nom en gris, avec un simple « — » en dessous à la place du pourcentage (le tiret qui suivait le nom est supprimé) ;
- La disposition de la page ne bouge pas : roue à gauche, Bilan global et Signaux à creuser à droite ;
- L'onglet **Profil** (roue en grand avec les preuves) profite du même réglage automatiquement.

## Contrôle des débordements

J'ai mesuré la largeur réelle de chaque nom à 18 px avec la police du site. Le plus long (« Exécutant fiable », 140 px) garde 46 px de marge à gauche ; « Analytique », le plus exposé à droite, garde 9 px. Aucun nom ne sera coupé, ni en haut ni en bas, avec ou sans la ligne de pourcentage.

## Impact

- **Build** : modification d'un seul composant d'affichage, aucun changement de données ni de calcul. Risque de casse : nul.
- **Recruteur** : roue identique, simplement lisible sans survol ni défiler. Les pastilles « Dominant / Secondaire » en haut de carte restent telles quelles.
- **Candidat** : aucun changement.
- **Génération des rapports** : inchangée, aucun nouveau calcul.
- **Mobile** : les noms restent dans le cadre (ils y sont déjà aujourd'hui).

## Tests après approbation

1. Résumer de la fiche de Diane : les 8 noms sont lisibles, le pourcentage apparaît sous chacun, les non évalués montrent « — ».
2. Onglet Profil : même contrôle sur la roue en grand, avec les preuves en dessous.
3. Vérification qu'aucun nom ne touche le bord sur desktop et sur mobile.

## Si c'est encore trop petit

Un second levier existe sans toucher au calcul : élargir légèrement la colonne de gauche de la roue (420 → 448 px), ce qui ferait passer les noms à environ 14 px. Je le fais sur demande, car cela modifie l'équilibre entre la roue et la colonne de droite.
