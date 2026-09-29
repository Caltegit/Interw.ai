# Résumé candidat — appliquer la maquette D affinée

## Résultat attendu

Sur l'onglet « Résumé » de la fiche candidat, afficher d'abord le Bilan global et les Signaux à creuser côte à côte sur ordinateur, puis la roue Profil Interw en dessous. Supprimer les quatre encarts Fit Poste / Orale / Attitude / Profil qui répètent les notes de la barre d'onglets. Sur écran étroit, Bilan, Signaux et roue se suivent verticalement.

## Réalisation

1. Réorganiser uniquement l'onglet Résumé : Bilan global et Signaux dans une grille à deux colonnes sur grand écran, puis Profil Interw en dessous, sur toute la largeur disponible.
2. Garder la roue et ses huit noms lisibles, ses couleurs, ses badges et son bouton d'information ; limiter la largeur du dessin à environ 560 px et le centrer dans son espace sans grand blanc autour. Ne pas modifier la grande roue de l'onglet Profil.
3. Retirer les quatre encarts redondants du résumé ; garder les notes et leurs liens dans la barre d'onglets. Conserver le reste du résumé, la fiche, le lecteur vidéo et les autres onglets.
4. Si aucun signal n'est disponible, afficher le bilan seul sans colonne vide.

## Impact

- **Application :** modification d'affichage limitée à la fiche candidat ; risque de compilation faible. Aucun changement de données, de calcul, de scoring ou de parcours candidat.
- **Lisibilité :** vérifier la longueur variable du bilan et des signaux, les huit libellés de la roue et la disposition sur petit écran.
- **Publication :** les changements seront d'abord visibles dans l'aperçu ; après les vérifications, publier la mise à jour pour la rendre visible sur interw.com.

## Vérifications après approbation

- Contrôler visuellement une fiche avec rapport sur ordinateur et sur fenêtre étroite : Bilan et Signaux en premier, roue en dessous, aucune note en double, aucune coupure ni chevauchement.
- Effectuer les tests de bout en bout candidat puis recruteur. Si l'outil de tests reste indisponible, le signaler et effectuer les contrôles manuels possibles avant publication.
- Vérifier l'absence d'erreur de compilation et publier la mise à jour demandée.

## Détails techniques

- `SessionReportView.tsx` : réordonner les éléments de l'onglet `summary`, retirer `ScoresOverviewCard` de cet onglet, et conserver `SignalsCard` ainsi que ses liens vers les vidéos.
- `InterwProfilesWheel.tsx` : n'ajuster l'espacement ou le dimensionnement que pour l'affichage du résumé, sans changer celui de l'onglet Profil.
