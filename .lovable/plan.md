Passer la note IA en mode **hybride** dans `supabase/functions/generate-report/index.ts`.

## Formule

```
overall_score_final = round( (overall_score_IA + fit_score_pondéré) / 2 )
```

- `overall_score_IA` = note 0-100 actuellement posée par Gemini
- `fit_score_pondéré` = `fitScore` déjà calculé ligne 510-517 (somme(score critère × poids) / somme(poids))

## Implémentation

1. Calculer une variable `finalOverallScore` après le calcul de `fitScore` :
   - Si `fitScore` est `null` (aucun critère), garder la note IA seule.
   - Sinon, moyenne des deux, bornée 0-100.
2. Utiliser `finalOverallScore` :
   - dans l'`insert` de `reports.overall_score` (ligne 687)
   - dans `templateData.overallScore` pour l'email (ligne 770)
3. Stocker dans `stats` un détail traçable pour debug/affichage futur :
   - `stats.score_breakdown = { ai_score, weighted_criteria_score, final_score, method: "hybrid_v1" }`

## Hors scope (pour plus tard si besoin)

- Recalculer `overall_grade` à partir de `finalOverallScore` (on garde celui de l'IA pour l'instant).
- UI montrant le détail du calcul au RH.
- Migration des rapports déjà générés (on n'y touche pas, seuls les nouveaux rapports utilisent l'hybride).