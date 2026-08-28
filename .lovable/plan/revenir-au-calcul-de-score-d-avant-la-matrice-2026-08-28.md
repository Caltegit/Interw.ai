# Revenir au calcul de score d'avant la matrice

## Le constat

Le score global est aujourd'hui uniquement la moyenne pondérée des colonnes de la matrice. Chaque case sans élément d'évaluation est forcée à 50/100 et compte dans la moyenne : tous les candidats sont tirés vers le centre.

Vérifié dans le code : `generate-report` calcule bien une note hybride (moyenne note IA globale + score critères), puis `generate-fit-matrix` la remplace par le score matrice (`method: "matrix_v2"`), en écrasant aussi la recommandation et les scores par critère.

## Ce qu'on rétablit

La formule hybride, toujours présente dans le code :

```text
score final = moyenne( note globale IA , score d'adéquation aux critères IA )
```

## Ce qu'on garde

La matrice reste entièrement en place : tableau question × critère, justifications, citations et repères vidéo « Q5 · 1:15 ». Elle explique la note, elle ne la produit plus.

## Le correctif

### 1. La matrice ne réécrit plus la note

`generate-fit-matrix` n'écrit plus que la matrice dans les statistiques du rapport. Il ne touche plus à la note globale, à la recommandation ni aux scores par critère.

### 2. Le rapport reprend la formule hybride

`generate-report` conserve son calcul hybride et ne le remplace plus par le résultat de la matrice. La méthode enregistrée redevient `hybrid_v1`.

### 3. Les cases « non évaluées » ne pèsent plus

Une case sans élément est marquée « non évalué » et exclue de la moyenne de sa colonne. Un critère sans aucune case évaluable reste sans moyenne.

### 4. Carte « Adéquation selon les critères »

Elle réaffiche les scores par critère produits par l'IA, avec leurs justifications et citations, au lieu des moyennes de colonnes.

## Effet sur les rapports existants

Aucune réécriture rétroactive. Seuls les rapports régénérés après le correctif utilisent la formule rétablie.

Sur ta question « jamais redescendre ? » : non, pas garanti. Le score remonte quand la note IA globale est plus haute que la moyenne matrice (cas fréquent aujourd'hui), mais un candidat dont l'IA juge l'entretien globalement faible alors que la matrice le neutralisait à 50 verra son score baisser. C'est le retour de l'amplitude, dans les deux sens.

## Vérification

- Régénérer Marine Fiaud : score attendu autour de 90, matrice intacte.
- Régénérer une session moyenne : l'écart avec la précédente doit être nettement plus marqué.
- Aucune colonne de matrice ne doit afficher 50 par défaut.

## Hors périmètre

- Décalage score e-mail / interface (e-mail parti avant la fin du recalcul) : à traiter juste après.
- Analyses orale, attitude et personnalité : inchangées.

## Détails techniques

- `supabase/functions/generate-fit-matrix/index.ts` : cases `evidence: "none"` → `score: null` + `not_evaluated: true` ; moyennes de colonne calculées sur les seules cases notées ; `reportPatch` réduit à `{ stats }` (plus de `overall_score`, `recommendation`, `criteria_scores`) ; plus de reconstruction de `stats.fit_breakdown` ni de `fit_score` / `score_breakdown`.
- `supabase/functions/generate-report/index.ts` : le bloc `if (matrixResult?.ok …)` (≈ lignes 1416-1439) ne récupère plus que `fit_matrix` dans `stats` ; `finalOverallScore`, `parsed.recommendation`, `criteriaScores`, `fitScore` et `fitBreakdown` restent ceux du calcul hybride ; `score_breakdown.method` reste `hybrid_v1`.
- `src/components/session/FitMatrixCard.tsx` : afficher « non évalué » pour les cases sans score et ignorer ces cases dans l'affichage des moyennes.
