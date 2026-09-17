# Pondération des questions dans le scoring

## Objectif

Deux corrections liées, pour un scoring fiable :

1. **Branchement des critères pondérés par question** : le réglage existe dans l'interface (bloc « Pondération des critères par question ») mais n'est pas utilisé dans le calcul du score. Il ne sert que dans la matrice détaillée. Il sera désormais pris en compte dans le score final.
2. **Importance de chaque question** : une question d'échauffement (« Ça va ? ») ne peut pas peser autant qu'une question technique. Chaque question reçoit un niveau d'importance.

## Calcul retenu

Deux étages de poids, multiplicatifs :

- **Importance de la question** : trois niveaux au choix dans la fenêtre de la question —
  - **Faible** (×0,5)
  - **Standard** (×1) — valeur par défaut, rien à régler
  - **Déterminante** (×2)
- **Poids effectif d'une case** (question × critère) = importance de la question × poids du critère pour cette question (réglage du bloc existant, sinon poids global du critère de l'étape 2).
- **Note d'un critère** = moyenne pondérée de ses cases avec ces poids effectifs. Les cases « non évaluées » restent exclues des moyennes.
- **Score final (fit)** = moyenne pondérée des critères par leurs poids globaux — mécanisme identique à aujourd'hui, seuls les poids effectifs changent.

Exemple : une question « Déterminante » (×2) réglée avec Rigueur à 80 % pèse 2 × 0,8 = 1,6 fois une case standard à 100 %.

## Ce qui change à l'écran

1. **Fenêtre d'une question (étape 3)** : au-dessus du bloc « Pondération des critères par question », un réglage « Importance de la question » avec trois boutons (Faible / Standard / Déterminante). Standard présélectionné.
2. **Liste des questions** : mention discrète du niveau d'importance sur la carte question, uniquement si différent de Standard.
3. **Matrice fiche candidat** : les poids affichés au survol tiennent compte de l'importance de la question.

## Effet sur les données existantes

- Rien ne change pour les postes et entretiens existants : sans réglage, toutes les questions sont « Standard » et les critères héritent des poids globaux — le calcul retombe exactement sur le résultat actuel.
- Aucune régénération automatique. Comme aujourd'hui, un clic sur « Régénérer la matrice » applique les nouveaux poids à un entretien.

## Détails techniques

**Base de données** (migration)
- Nouvelle colonne `questions.importance smallint` (valeurs 1, 2, 3 — défaut 2 = Standard). Même colonne sur `interview_template_questions` pour conserver le réglage dans les modèles.
- GRANT inclus dans la migration ; aucune nouvelle politique (colonnes sur tables existantes).

**Front**
- `src/components/QuestionFormDialog.tsx` : champ `importance` dans le formulaire, trois boutons au-dessus du bloc de pondération.
- `src/components/project/StepQuestions.tsx` : transport du champ et mention sur la carte question.
- `src/pages/ProjectDetail.tsx` : ajout d'`importance` au `select` et au remapping lors de la duplication.
- Modèles d'entretien (`loadInterviewTemplate.ts` + enregistrement) : transport du champ.

**Backend**
- `supabase/functions/generate-fit-matrix/index.ts` : poids effectif = importance × poids du critère pour la question ; moyennes pondérées mises à jour ; poids conservés dans `fit_matrix.rows[].weights`.
- `supabase/functions/generate-report/index.ts` : la note par critères (`fit_breakdown`) utilise les mêmes poids effectifs, afin que le score final (`hybrid_v1` : moyenne de la note globale et de la note par critères) tienne compte des deux réglages. Les questions à importance Faible contribuent moins, Déterminante davantage.
- Ni la transcription, ni le prompt de citation, ni les horodatages ne sont modifiés.

## Impact

- **Risque** : modéré et cerné. Deux fonctions d'analyse et trois écrans de création de poste changent ; le parcours candidat (enregistrement, envoi des vidéos) n'est pas touché.
- **Recruteur** : nouveau réglage optionnel ; tant qu'il n'y touche pas, les scores restent calculés comme aujourd'hui.
- **Candidat** : aucun changement visible ni dans le déroulé de l'entretien.
- **Base** : une migration, réversible (colonnes avec valeur par défaut).
- **Sécurité** : aucune modification (bucket privé, liens signés, politiques inchangés).

## Tests E2E après approbation

1. **Candidat** : parcours d'entretien de démonstration complet, enregistrement de réponses, aucune erreur.
2. **Recruteur** : création d'un poste avec une question Déterminante et une question Faible, vérification que le réglage est conservé après enregistrement ; régénération de la matrice sur une session de test et contrôle que la note du critère change dans le sens attendu ; vérification qu'une session existante non régénérée garde des scores identiques.
