## Objectif
Rendre le **Fit score global** cohérent avec la matrice détaillée en le recalculant à partir des notes de la matrice.

## Formule
- Moyenne par critère = moyenne des scores non-null de sa colonne dans la matrice.
- Fit score = moyenne pondérée de ces moyennes par le poids (%) du critère. Les critères sans aucune note sont exclus du dénominateur.

## Changements

### `supabase/functions/generate-fit-matrix/index.ts`
Après la construction de `fit_matrix` (avant l'`update` vers `reports.stats`) :
1. Calculer `criterion_averages` (moyenne par colonne, ignore `null`).
2. Calculer `matrixFitScore` (moyenne pondérée des moyennes par le poids critère).
3. Ajouter `criterion_averages` dans l'objet `fit_matrix` stocké (utile plus tard côté front).
4. Écraser `stats.fit_score` et `stats.score_breakdown.weighted_criteria_score` avec `matrixFitScore` (marqueur `fit_score_source: "fit_matrix"`).

Aucune autre partie du pipeline n'est modifiée : `generate-report` continue à calculer et écrire son propre `fit_score` initial ; `generate-fit-matrix` l'écrase systématiquement après.

### Rétro-compatibilité
Conformément à ta décision : **pas de migration rétroactive**. Les rapports existants gardent leur `fit_score` actuel jusqu'à ce qu'un utilisateur clique sur "Voir les détails", ce qui relance `generate-fit-matrix` et écrase alors le score.

## Hors scope
- Retrait de la règle "score neutre 40-50" du prompt matrice.
- Marquage N/A des cases non couvertes.
- Migration rétroactive.

Passe en mode build pour que j'applique le changement.