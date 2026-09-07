# Pondération des critères par question (étape 3)

## Objectif

Dans la création d'un poste, chaque question porte sa propre pondération des critères. Une question n'est plus notée « à plat » sur tous les critères : on dit explicitement ce qu'elle mesure, et à quel point. Plus de critères évalués par hasard, plus de cases vides dans la matrice.

## Ce que tu verras

1. **Étape 2 (critères)** : inchangée. C'est toujours là qu'on définit les critères du poste, leur description et leur poids global.
2. **Étape 3 (questions)** : dans la fenêtre d'une question, juste sous le réglage du temps de réponse, un bloc dépliant **« Pondération des critères »**.
   - Replié par défaut, avec un résumé : les 2-3 critères les plus pondérés, ou « pondération par défaut » si rien n'a été touché.
   - Déplié : la liste de tous les critères du poste — uniquement le titre et un curseur, pas de description.
   - Les curseurs partent des poids définis à l'étape 2.
   - Le total reste toujours à 100 : bouger un curseur rééquilibre automatiquement les autres, exactement comme à l'étape des critères.
   - Mettre un critère à 0 = cette question ne l'évalue pas.
   - Un bouton « Réinitialiser » remet les poids de l'étape 2.
3. **Sur la liste des questions** : une petite mention des critères principaux de chaque question, pour voir d'un coup d'œil la couverture.
4. **Si aucun critère n'existe encore** (question ajoutée avant l'étape 2) : le bloc affiche simplement qu'il faut d'abord définir les critères.

## Effet sur la notation

- La matrice « Fit poste » utilise ces poids : la note d'un critère est la **moyenne pondérée** de ses cases, question par question, au lieu d'une moyenne simple. Une question dont le poids est 0 pour un critère n'est plus notée sur ce critère et n'entre plus dans sa moyenne.
- L'IA reçoit aussi l'information : pour chaque question, on lui indique quels critères elle doit évaluer et lesquels ignorer.
- **Postes déjà en cours** : rien ne change tant qu'on ne touche à rien. Les questions existantes gardent la pondération de l'étape 2 par défaut. Après ajustement, un clic sur « Régénérer la matrice » sur un entretien applique les nouveaux poids.

## Détails techniques

**Base de données** (migration)
- Nouvelle colonne `questions.criteria_weights jsonb` (nullable) : `{ "<criterion_id>": 0-100 }`. `null` = pondération héritée de `evaluation_criteria.weight`.
- Même colonne sur `interview_template_questions` pour que les modèles conservent le réglage.

**Front**
- `src/components/QuestionFormDialog.tsx` : nouveau champ `criteriaWeights` dans le formulaire ; bloc `Collapsible` sous le bloc timer, rendu par un nouveau composant `QuestionCriteriaWeights.tsx` (liste `label` + `Slider`, badge de valeur, bouton réinitialiser). Rééquilibrage via `rebalance` / `equalize` / `normalizeToTotal` de `src/lib/rebalanceWeights.ts` (déjà utilisé par `StepCriteria`), sans verrous.
- `src/components/project/StepQuestions.tsx` : passe la liste des critères de l'étape 2 au dialogue, transporte `criteria_weights` dans son état local et l'affiche en résumé sur la carte question.
- `src/pages/ProjectDetail.tsx` : ajouter `criteria_weights` au `select` des questions et au remapping lors de la duplication (les clés sont des ids de critères, à remapper comme `scoring_criteria_ids`).
- `loadInterviewTemplate.ts` + enregistrement en modèle : transporter le champ.

**Backend**
- `supabase/functions/generate-fit-matrix/index.ts` :
  - résoudre pour chaque question un poids effectif par critère (`criteria_weights` sinon `evaluation_criteria.weight`) ;
  - injecter ces poids dans le prompt par question (« critères à évaluer », poids 0 = à ignorer, cellule `null`) ;
  - `criterion_averages` devient une moyenne pondérée : `Σ(score × poids) / Σ(poids)` sur les cases notées avec poids > 0 ;
  - conserver les poids dans `fit_matrix.rows[].weights` pour l'affichage.
- Affichage matrice (`SessionReportView` / composant matrice) : griser les cases à poids 0 et afficher le poids au survol.

**Validation** : `bun run build`, puis régénération de la matrice sur une session de test pour vérifier les nouvelles moyennes.
