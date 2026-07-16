## Objectif

Garantir que le FIT SCORE global et les scores affichés dans la carte "Adéquation selon les critères définis" soient **strictement les moyennes pondérées de la matrice**. La matrice devient la source unique de vérité, calculée dans cet ordre :

1. Génération de la matrice détaillée (une note par cellule question × critère, avec règle `none = 50`).
2. Calcul du FIT SCORE global = moyenne pondérée par le poids des critères.
3. Mise à jour de la carte "Adéquation selon les critères définis" avec les moyennes-critères issues de la matrice.

## Diagnostic

- `generate-report` écrit `stats.fit_breakdown` (scores estimés directement par l'IA, avec citations).
- `generate-fit-matrix` s'exécute ensuite, calcule `criterion_averages` et met bien à jour `overall_score` + `criteria_scores`, mais **ne réécrit pas `stats.fit_breakdown`**.
- La carte `FitBreakdownCard` lit d'abord `stats.fit_breakdown` → elle affiche les anciens scores IA, non alignés avec la matrice.

## Changements

### `supabase/functions/generate-fit-matrix/index.ts`

Après le calcul de `criterion_averages` et `matrixFitScore`, reconstruire `stats.fit_breakdown` à partir de la matrice :

- Pour chaque critère (dans l'ordre défini du projet) :
  - `criterion` = label du critère
  - `criterion_id` = id
  - `score` = `criterion_averages[c.id]` (ou 50 si `null` — cas où aucune ligne, à confirmer ; sinon on omet l'entrée)
  - `level` = dérivé du score (excellent ≥80, solid ≥60, partial ≥40, gap sinon)
  - `statement` : conserver le commentaire précédent (`prevFitBreakdown[i].statement`) si présent, sinon vide
  - `quote` / `message_id` / `start_seconds` : conserver la meilleure preuve existante (soit celle de l'ancien `fit_breakdown`, soit celle de la cellule de la matrice qui a le score max pour ce critère — à choisir : simple = garder l'existante).

Écrire ce tableau dans `nextStats.fit_breakdown` en plus de tout ce qui est déjà fait.

### Ordre d'exécution

Vérifier que `process-report-queue` appelle bien `generate-report` puis `generate-fit-matrix` (déjà le cas). Aucun changement nécessaire.

### Rien à changer côté front

`FitBreakdownCard` continuera à lire `stats.fit_breakdown` — mais il sera désormais dérivé de la matrice, donc cohérent par construction.

## Vérification

1. Relancer une régénération forcée sur la session `0979b322-e624-46d4-a6fa-1edfc77459fa`.
2. En base : pour chaque critère, `stats.fit_breakdown[i].score == stats.fit_matrix.criterion_averages[criterion_id]`.
3. `overall_score == moyenne pondérée(criterion_averages, poids)`.
4. À l'écran : les pourcentages de la carte "Adéquation selon les critères définis" correspondent case par case aux moyennes de colonnes de la matrice, et le FIT SCORE affiché en haut = la moyenne pondérée.
