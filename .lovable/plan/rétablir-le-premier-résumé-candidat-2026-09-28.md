# Rétablir le premier résumé candidat

## Résultat attendu
- Revenir au premier affichage de la fiche candidat : la roue « Profil Interw » avec ses huit noms et son bouton d’information à gauche ; les quatre notes « Fit Poste », « Orale », « Attitude » et « Profil » l’une sous l’autre à droite.
- Reprendre leurs dimensions lisibles et leur cadran d’origine, sans les petits cartouches en carré. Garder les scores, les écarts à la moyenne et le clic vers chaque onglet.
- Ne rien modifier d’autre sur la fiche, ni dans la grande roue de l’onglet « Profil ».

## Impact
- **Fiche recruteur :** le premier agencement revient, plus haut que les versions condensées récentes. Les quatre notes retrouvent leur taille initiale.
- **Parcours candidat, données et calculs :** aucun changement.
- **Risque :** faible, limité à la présentation. Contrôler les huit noms de la roue et les notes aux largeurs d’écran courantes.
- **Mise en ligne :** le changement sera visible dans l’aperçu ; aucune publication automatique.

## Détails techniques
- Dans le résumé de `SessionReportView.tsx`, rétablir la grille initiale avec une colonne de 280 px pour les notes et la roue de 250 px.
- Dans `ScoresOverviewCard.tsx`, restaurer uniquement pour le résumé la carte et les quatre jauges originales en une colonne sur ordinateur, sans la variante compacte actuelle ; préserver la présentation utilisée ailleurs.
- Dans `InterwProfilesWheel.tsx`, restaurer le centrage et la taille initiale des libellés, sans affecter l’onglet « Profil ».

## Vérifications
- Comparer visuellement la fiche actuellement ouverte au premier affichage, sur ordinateur et sur écran plus étroit ; vérifier les quatre notes empilées, la lisibilité et le clic vers les onglets.
- Exécuter les tests de bout en bout candidat puis recruteur ; si leur configuration les bloque encore, le signaler explicitement et vérifier le parcours dans l’aperçu.
