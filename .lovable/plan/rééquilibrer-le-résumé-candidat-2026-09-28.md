# Rééquilibrer le résumé candidat

## Objectif
La roue « Profil Interw » doit redevenir le point focal du résumé. Les quatre notes restent en carré 2 × 2 à sa droite, mais deviennent de petits repères secondaires, sans grand encadrement vide.

## Modification
- Donner environ 55 à 60 % de la largeur disponible à la roue, contre 40 à 45 % aux quatre notes ; porter le diamètre théorique de la roue du résumé de 200 à environ 320 px. Réduire ses marges internes propres au résumé pour que le dessin et ses huit noms occupent réellement cette place, même dans l'aperçu plus étroit.
- Réduire les quatre notes : cercles d'environ 44 à 48 px au lieu de 64 px, marges et espacements resserrés, textes toujours lisibles. Garder leur carré 2 × 2, les scores, les écarts à la moyenne et le clic vers chaque onglet.
- Retirer le grand cadre qui étire artificiellement le groupe des quatre notes à la hauteur de la roue ; aligner ce petit groupe à côté du dessin sans créer deux grands blocs vides. Sur les fenêtres trop étroites pour les deux colonnes, placer le groupe compact sous la roue plutôt que couper des noms ou des chiffres.
- Ne modifier ni la grande roue de l'onglet « Profil », ni les autres parties de la fiche.

## Impact
- **Fiche recruteur :** la roue redevient nettement plus présente ; les quatre notes occupent beaucoup moins d'espace et d'attention. Le résumé peut être un peu plus haut qu'avec la roue de 200 px, mais reste plus condensé que la disposition initiale à quatre notes empilées.
- **Parcours candidat, données et calculs :** aucun changement.
- **Risque de casse :** faible, limité à la présentation. Contrôler particulièrement les huit noms, le score et l'écart à la moyenne à la largeur actuelle de l'aperçu (1065 px) et sur mobile.
- **Publication :** visible dans l'aperçu uniquement, sans mise en ligne automatique.

## Détails techniques
- Ajuster uniquement la disposition du résumé dans `SessionReportView.tsx`, avec une largeur majoritaire pour `InterwProfilesWheel` et une largeur minoritaire pour `ScoresOverviewCard`.
- Prévoir dans `InterwProfilesWheel.tsx` un espacement externe adapté au résumé, sans toucher aux dimensions du diagramme de l'onglet « Profil ».
- Dans `ScoresOverviewCard.tsx`, réserver la version condensée au groupe du résumé : supprimer son étirement vertical et alléger les quatre jauges, sans modifier son autre présentation.

## Vérifications après modification
- Contrôle visuel sur la fiche actuellement ouverte, à 1280 px puis à 1065 px et sur mobile : roue dominante, huit noms complets, carré de quatre notes beaucoup plus discret, aucun chevauchement ni grand vide.
- Cliquer sur une note et vérifier l'ouverture du bon onglet ; contrôler l'onglet « Profil » pour confirmer que sa grande roue n'a pas changé.
- Exécuter le test de bout en bout candidat puis recruteur ; si la configuration actuelle le bloque encore, signaler clairement cette limite et contrôler le parcours dans l'aperçu.
