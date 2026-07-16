## Problème
Le Fit Poste affiché dans le rapport est calculé à partir d'une évaluation holistique par critère (`fit_breakdown`) générée par l'IA. La matrice "Détail question par question" (`fit_matrix`) fournit des scores granulaires question × critère. Les deux peuvent diverger fortement, ce qui crée de l'incohérence pour le recruteur.

## Recommandation
**Aligner le Fit Poste sur la matrice.** La matrice est plus transparente et vérifiable : chaque note est rattachée à une question, une justification et un extrait vidéo. L'évaluation holistique n'apporte pas de valeur suffisante pour justifier un second calcul parallèle.

## Changements prévus

### 1. Recalcul du Fit Poste global (`fit_score`)
Dans `supabase/functions/generate-report/index.ts` :
- Après génération ou récupération de `fit_matrix`, calculer `fit_score` comme la moyenne pondérée des scores par critère de la matrice.
- Formule : `Σ(score_critère × poids_critère) / Σ(poids_critère)`, où `score_critère` est la moyenne des cases informatives de la colonne.
- Conserver un fallback sur l'ancien calcul si `fit_matrix` est absente (rétrocompatibilité).

### 2. Recalcul du `fit_breakdown`
- Pour chaque critère, le score affiché dans `fit_breakdown` doit correspondre à la moyenne des scores informatifs de la matrice pour ce critère.
- Le `statement` et les citations peuvent être conservés de l'évaluation IA holistique, ou remplacés par une synthèse des justifications de la matrice.

### 3. Affichage du calcul dans l'UI
- Ajouter une infobulle / légende sur le badge Fit Poste et dans la carte `FitBreakdownCard` indiquant : "Moyenne pondérée des critères issue du détail question par question".
- Afficher éventuellement le poids de chaque critère à côté de son score dans `FitBreakdownCard`.

### 4. Rétrocompatibilité
- Les anciens rapports sans `fit_matrix` continuent d'utiliser le calcul holistique existant.
- Pas de backfill obligatoire ; les rapports générés après le changement seront cohérents.

## Fichiers concernés
- `supabase/functions/generate-report/index.ts` : recalcul de `fit_score` et `fit_breakdown`.
- `src/components/session/FitBreakdownCard.tsx` : ajout poids + explication.
- `src/components/session/FitScoreBadge.tsx` ou `ScoresOverviewCard.tsx` : tooltip sur le score.

## Non inclus
- Modification du prompt IA pour supprimer `fit_breakdown` (on le garde comme source de texte/justifications, pas comme source du score).
- Refonte complète de la matrice ou de son générateur.

## Validation
- Générer un rapport de test et vérifier que le Fit Poste global correspond bien à la moyenne pondérée des colonnes de la matrice.
- Vérifier que les anciens rapports sans matrice s'affichent toujours correctement.