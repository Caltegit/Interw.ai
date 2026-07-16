# Afficher le titre interne des questions dans la matrice

Actuellement `FitMatrixCard` affiche `question_content` (le texte complet posé au candidat). On veut afficher `questions.title` (titre interne court utilisé côté RH).

## Changements

### 1. `supabase/functions/generate-fit-matrix/index.ts`
- Sélectionner `title` en plus de `content` sur `questions`.
- Stocker `question_title` dans chaque row de `fit_matrix` (à côté de `question_content`, qu'on garde pour compat + tooltip éventuel).
- Bump `fit_matrix.version` : 1 → 2.

### 2. `src/components/session/FitMatrixCard.tsx`
- Type `FitMatrixRow` : ajouter `question_title?: string`.
- Cellule « Question » de la table : afficher `question_title` en priorité, fallback sur `question_content` tronqué pour les anciennes matrices (v1).
- Popover d'une cellule : garder `Q{n} · {critère}` inchangé.

### 3. Rétrocompat
- Les matrices v1 existantes n'ont pas `question_title` → fallback automatique sur `question_content` (comportement actuel). Aucun backfill forcé.
- Un clic sur « Régénérer » (bouton existant si on force via `force: true`) suffit pour passer en v2 ; sinon les nouvelles générations sont v2 d'office.

## Hors périmètre
- Pas de migration DB.
- Pas de changement de logique de scoring (calcul cellules inchangé).
- Pas de changement sur `fit_breakdown` / `fit_score`.
