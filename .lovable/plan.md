# Faire calculer le score par la pondération des critères par question

## Réponse à ta question, d'abord

Tu as raison, et voici ce qui est vérifié dans le code :

- Quand on a mis en place la pondération des critères par question, elle a été branchée **uniquement** dans la matrice (`generate-fit-matrix`, ligne 111 : `effectiveWeight`). C'est bien plus que du front — la matrice s'en sert réellement pour ses moyennes par critère — mais le **score final du candidat** n'y touche jamais.
- Le score final est calculé dans `generate-report` : la note par critère y est pondérée par le poids **global** du critère sur le poste (ligne 928 : `criteria.map(c => c.weight)`), puis moyennée avec la note d'impression globale du modèle (ligne 1289, méthode `hybrid_v1`).
- Donc aujourd'hui : « Question 1 = Rigueur 80 %, Fit 20 % » n'a aucun effet sur le score affiché.

C'est un manque de ma part : la pondération par question a été livrée sans être reliée au calcul du score.

## Ce que je change

Nouveau calcul, exactement celui que tu décris :

1. Chaque question est notée séparément : pour la question 1, on applique ses poids (ex. 17 / 35 / 48), pour la question 2 les siens (ex. 50 / 50 / 0), etc.
2. Score de la question = moyenne des notes de ses critères, pondérée par ces poids. Un critère à 0 % ne compte pas dans cette question.
3. Score final du candidat = moyenne des scores de toutes les questions (pondérée par le poids total de chaque question, pour qu'une question sans critère actif ne fausse rien).
4. Une question sans aucun élément exploitable est exclue de la moyenne au lieu d'être notée 50.

Le score n'est plus la moyenne « impression globale du modèle + critères globaux ». Il devient traçable : chaque point vient d'une case de la matrice, avec sa citation et son horodatage.

## Transcript complet

Aujourd'hui, pour noter une case, le modèle ne reçoit que la réponse à la question concernée. Je change ça en :

- lui donner **la transcription complète de l'entretien** en contexte dans le même appel,
- garder la règle : la note d'une case s'appuie d'abord sur la réponse à cette question, mais le modèle peut s'appuyer sur le reste de l'entretien quand le candidat y revient plus tard.

Aucune troncature des réponses : elles sont déjà envoyées entières.

## Ordre d'exécution

Aujourd'hui l'ordre est transcription → rapport → matrice. La matrice arrive donc après le score. Je la passe **avant** le rapport, pour que le score du rapport soit calculé à partir d'elle. Le rapport garde tout son contenu rédigé (verdict, points forts, signaux) ; seul le nombre change de source.

La recommandation (fortement recommandé / recommandé / à discuter / non recommandé) est recalculée à partir du nouveau score, avec les mêmes seuils qu'aujourd'hui.

## Rapports existants

Rien n'est retouché. Aucun score déjà généré ne bouge. Le nouveau calcul ne s'applique qu'aux entretiens analysés après la mise en ligne.

## Détails techniques

- `supabase/functions/generate-fit-matrix/index.ts` : ajout de `question_scores` (score pondéré par question) et `overall_from_matrix` dans `fit_matrix` ; ajout du bloc transcription complète dans le prompt ; cases non évaluées toujours exclues.
- `supabase/functions/generate-report/index.ts` : le score final lit `fit_matrix.overall_from_matrix` quand il existe ; sinon on garde le calcul actuel en repli (aucun entretien ne se retrouve sans score). `score_breakdown.method` passe à `question_weighted_v1` avec le détail par question.
- `supabase/functions/process-report-queue/index.ts` : inversion de l'ordre matrice / rapport.
- Aucune migration, aucun changement de stockage, de sécurité ou de transcription.

## Impact

- Construction de l'application : risque faible. Trois fonctions serveur modifiées, aucun fichier d'interface, aucune migration.
- Recruteur : les nouveaux scores peuvent différer des anciens sur un même profil, puisqu'ils suivent enfin les pondérations saisies. La matrice et les renvois vidéo horodatés restent identiques.
- Candidat : aucun changement, le parcours d'entretien n'est pas touché.
- Risque résiduel : l'analyse d'un entretien peut prendre quelques secondes de plus (transcription complète envoyée dans l'appel matrice). Repli prévu si la matrice échoue : ancien calcul, donc jamais de rapport sans score.

## Tests E2E après approbation

1. Candidat : parcours d'entretien de démonstration, enregistrement des réponses, aucune erreur.
2. Recruteur : régénération d'un rapport sur un poste avec pondérations par question, vérification à la main que le score affiché correspond bien à la moyenne des scores par question, et que les renvois horodatés de la matrice fonctionnent toujours.
