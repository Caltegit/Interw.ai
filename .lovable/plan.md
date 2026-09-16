# Rendre le score fidèle aux pondérations : critères par question + poids des questions

## D'abord, la réponse à ta question

Vérifié dans le code :

- La pondération des critères par question n'est branchée que dans la matrice (`generate-fit-matrix`, ligne 111 : `effectiveWeight`). Ce n'est pas que du front — la matrice s'en sert vraiment — mais le **score final** ne la voit jamais.
- Le score final est calculé dans `generate-report` : note par critère pondérée par le poids **global** du critère (ligne 928), puis moyennée avec la note d'impression globale du modèle (ligne 1289).
- Donc « Question 1 = Rigueur 80 %, Fit 20 % » n'a aujourd'hui aucun effet sur le score affiché. C'est un manque de ma part.

Et il manque effectivement une deuxième chose que tu demandes : le **poids de la question elle-même**. Aujourd'hui toutes les questions pèsent pareil, donc « Ça va ? » compte autant qu'une question technique.

## Ce qu'on ajoute : le poids d'une question

Dans la fenêtre de création/édition d'une question (étape 3), au-dessus du bloc existant « Pondération des critères par question », un réglage simple :

- **Importance de cette question** : curseur de 0 à 100 (par défaut 50 = normal).
- 0 = question exclue du score (question de mise en confiance, « Ça va ? »).
- Une pastille « Importance forte / faible » s'affiche dans la liste des questions quand ce n'est pas la valeur par défaut.

Ce réglage suit la question partout : création de poste, édition, duplication, modèles d'entretien, bibliothèque de questions.

## Le nouveau calcul du score

Exactement ce que tu décris, avec le poids de question en plus :

1. Chaque question est notée séparément, avec **ses** poids de critères (ex. 17 / 35 / 48 pour la question 1, 50 / 50 / 0 pour la question 2). Un critère à 0 % ne compte pas dans cette question.
2. Score de la question = moyenne de ses critères, pondérée par ces poids.
3. Score final = moyenne des scores de toutes les questions, **pondérée par l'importance de chaque question**. Une question à 0 est exclue.
4. Une question sans aucun élément exploitable est exclue de la moyenne au lieu d'être notée 50.

Le score devient entièrement traçable : chaque point vient d'une case de la matrice, avec sa citation et son horodatage.

## Transcript complet

Aujourd'hui, pour noter une case, le modèle ne reçoit que la réponse à la question concernée. On lui donne en plus **la transcription complète de l'entretien** en contexte, tout en gardant la règle : la note d'une case s'appuie d'abord sur la réponse à cette question, mais le modèle peut tenir compte du reste quand le candidat y revient plus tard.

## Ordre d'exécution

Aujourd'hui : transcription → rapport → matrice. La matrice arrive donc après le score. On la passe **avant** le rapport, pour que le score soit calculé à partir d'elle. Le rapport garde tout son contenu rédigé (verdict, points forts, signaux) ; seul le chiffre change de source. La recommandation est recalculée à partir du nouveau score, mêmes seuils qu'aujourd'hui.

## Rapports existants

Rien n'est retouché. Aucun score déjà généré ne bouge. Le nouveau calcul ne s'applique qu'aux entretiens analysés ensuite.

## Détails techniques

- Migration : `questions.weight` (entier, défaut 50) et `interview_template_questions.weight`. Aucune donnée existante modifiée — les questions actuelles prennent le défaut, donc poids égaux, comme aujourd'hui.
- Interface : `QuestionFormDialog.tsx` (curseur d'importance), `StepQuestions.tsx` (pastille + champ dans le modèle de question), `ProjectForm.tsx` / `ProjectNew.tsx` / `ProjectEdit.tsx` / `InterviewTemplateEdit.tsx` (persistance).
- `generate-fit-matrix/index.ts` : transcription complète dans le prompt ; calcul de `question_scores` (score pondéré par question) et `overall_from_matrix` (moyenne pondérée par le poids des questions) dans `fit_matrix`.
- `generate-report/index.ts` : le score final lit `fit_matrix.overall_from_matrix` s'il existe, sinon repli sur le calcul actuel (jamais de rapport sans score). `score_breakdown.method` → `question_weighted_v1`, avec le détail par question.
- `process-report-queue/index.ts` : inversion de l'ordre matrice / rapport.
- Rien ne change sur le stockage, la sécurité, la transcription ni le parcours candidat.

## Impact

- Construction de l'application : risque faible. Une migration additive (nouvelle colonne avec valeur par défaut, aucune suppression), trois fonctions serveur, quelques écrans de création de poste.
- Recruteur : nouveau réglage visible à l'étape 3. Les nouveaux scores peuvent différer des anciens sur un profil comparable, puisqu'ils suivent enfin les pondérations saisies. Matrice et renvois vidéo horodatés inchangés.
- Candidat : aucun changement.
- Risque résiduel : l'analyse peut prendre quelques secondes de plus (transcription complète envoyée). Repli prévu si la matrice échoue.

## Tests E2E après approbation

1. Candidat : parcours d'entretien de démonstration, enregistrement des réponses, aucune erreur.
2. Recruteur : création d'un poste avec une question à importance 0 et une question à importance forte, régénération d'un rapport, vérification à la main que le score correspond bien à la moyenne pondérée des scores par question, et que les renvois horodatés de la matrice fonctionnent toujours.
