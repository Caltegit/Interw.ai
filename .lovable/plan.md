## Objectif

Comme pour le bloc vidéo à droite, garder visible en haut de la colonne de gauche le bloc joint (carte candidat « DecisionBanner » + barre d'onglets Reco IA / Big Five / À l'oral / Attitude / Réponses) pendant que le contenu de l'onglet défile.

## Changements

Dans `src/pages/SessionDetail.tsx` (autour des lignes 410–620) :

1. Restructurer la colonne de gauche en deux parties :
   - **En-tête figé** : `DecisionBanner` + `TabsList` regroupés dans un conteneur `lg:sticky lg:top-6 lg:z-10` avec un fond (`bg-background`) pour éviter la transparence pendant le scroll.
   - **Contenu défilant** : les `TabsContent` restent en flux normal et défilent sous l'en-tête figé.

2. Comme `<Tabs>` doit englober `TabsList` et `TabsContent`, déplacer le composant `<Tabs>` au niveau supérieur de la colonne de gauche, puis :
   - Mettre `TabsList` (et le `DecisionBanner`) dans un wrapper sticky.
   - Laisser les `TabsContent` en dessous, sans contrainte de hauteur.

3. Ajouter un léger padding/ombre sous le bloc sticky pour bien le détacher visuellement du contenu qui défile.

4. Ne rien changer à la colonne de droite (vidéo) ni au layout global.

## Validation

- Recharger `/sessions/:id`, scroller dans la zone de gauche : la fiche candidat et la barre d'onglets doivent rester collées en haut, la vidéo à droite reste figée (comportement actuel conservé).
- Vérifier l'apparence en viewport ~1559 px (config actuelle) et en dessous du breakpoint `lg` (le sticky se désactive, comportement normal).
