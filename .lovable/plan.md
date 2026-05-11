## Objectif

Corriger le bug du **0/10** affiché sur chaque question et garantir que l'IA produit bien une note /10 par question (basée sur son impression de la réponse).

## Diagnostic

Aujourd'hui, quand l'IA omet le bloc `question_evaluations` (typiquement sur les longs entretiens), le serveur applique un fallback qui écrit `score: 0` + "Évaluation IA indisponible" pour toutes les questions. Résultat : badges rouges 0/10 partout, alors que le candidat est bon.

## Changements

### 1. Backend — `supabase/functions/generate-report/index.ts`

**a) Renforcer le prompt** pour rendre la notation par question fiable :
- Insister explicitement : "Tu DOIS retourner une entrée `question_evaluations` pour CHAQUE question posée, même si la réponse est vague."
- Préciser la grille de notation /10 :
  - 1-3 : réponse absente, hors-sujet ou très superficielle
  - 4-6 : réponse correcte mais générique, peu d'exemples
  - 7-8 : réponse claire avec exemples concrets
  - 9-10 : réponse experte, structurée, démonstrative
- Ajouter : "Note selon ton impression globale de la réponse (clarté + pertinence + profondeur)."

**b) Fallback honnête (lignes 611-620)** : au lieu d'écrire `score: 0`, écrire `score: null` quand l'IA n'a rien retourné. Le composant `QuestionAnswerRow` affiche déjà **"Non évalué"** (badge gris) quand `score === null`.

**c) Validation par entrée** : si l'IA renvoie une entrée sans `score` numérique valide, mettre `score: null` (au lieu de laisser tomber sur 0 par défaut côté front).

**d) Retry ciblé** : si après le premier appel `question_evaluations` est vide ou incomplet (< nombre de questions), relancer un second appel IA avec un prompt court qui demande UNIQUEMENT les évaluations par question manquantes. Ça évite que tout le rapport soit régénéré juste pour récupérer les notes.

### 2. Front — déjà compatible

`QuestionAnswerRow` (lignes 38-43, 69-71) gère déjà `score === null` → badge gris "Non évalué". Aucun changement nécessaire.

`SessionStatsCard` ignore déjà les entrées sans score pour "Meilleure / Question la plus faible" (vérifier que `bestScore !== undefined` filtre bien `null`).

## Détails techniques

- Pas de changement DB ni de migration.
- Pas de nouveau champ : on garde `question_evaluations[i].score` (0-10 ou null).
- **Rapports existants** : ils continueront d'afficher 0/10 jusqu'à régénération via le bouton "Régénérer le rapport" (déjà présent).

## Fichiers modifiés

- `supabase/functions/generate-report/index.ts` (prompt + fallback + retry ciblé)
