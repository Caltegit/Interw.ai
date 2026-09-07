# Pondération des critères par question — ajustements

## Ce qui change à l'écran

1. **Plus d'air** entre le bloc « Temps limite de réponse » et le bloc de pondération : le bloc de pondération est détaché avec une marge nette au-dessus.
2. **Titre** : « Pondération des critères » devient « Pondération des critères par question ».
3. **Suppression du résumé gris** affiché à côté du titre (les deux critères les plus pondérés). Le bandeau ne garde que l'icône, le titre et la flèche.
4. **Cadenas de verrouillage** : chaque critère reçoit une petite icône cadenas à droite de son pourcentage.
   - Cadenas fermé = la valeur de ce critère ne bouge plus quand on déplace une autre barre.
   - Le rééquilibrage automatique se répartit uniquement sur les critères non verrouillés.
   - Si tous les autres critères sont verrouillés, la barre déplacée ne peut plus dépasser la marge restante (elle bute au maximum disponible).
   - Le bouton « Réinitialiser » remet la pondération du poste et libère tous les cadenas.

## Détails techniques

Fichier concerné : `src/components/project/QuestionCriteriaWeights.tsx`.

- Ajouter un état `locked: Set<number>` (index des critères verrouillés).
- `rebalance(base, locked, index, next)` de `src/lib/rebalanceWeights.ts` accepte déjà un ensemble de verrous : lui passer `locked` au lieu de `new Set()`.
- Bloquer le déplacement d'un curseur verrouillé (curseur désactivé) et borner la valeur maximale au reste disponible.
- Retirer le `useMemo` `summary` et son affichage dans le `CollapsibleTrigger`.
- Espacement : `mt-4` / `pt-4` sur le conteneur du bloc dans `QuestionFormDialog.tsx` (section étape 3) pour séparer visuellement du bloc timer.

Aucun changement de base de données ni de logique de notation : le format enregistré (`criteria_weights`, tableau d'entiers) reste identique.
