

## Plan : Bibliothèque de critères + pop-up unifiée

### Objectif
Reproduire pour les **critères d'évaluation** exactement le même pattern UX que pour les questions :
1. Une **bibliothèque de critères** par organisation (CRUD).
2. Une **pop-up partagée** pour créer/éditer un critère (utilisée à la fois dans la bibliothèque ET dans la création de projet).
3. Dans `StepCriteria`, remplacer les cards inline dépliées par des **lignes compactes** (1 critère = 1 ligne avec titre + poids + actions), avec deux boutons : "Bibliothèque" et "Ajouter".

### Backend

**Nouvelle table `criteria_templates`** (miroir de `question_templates`) :
- `id`, `organization_id`, `created_by`, `created_at`
- `label` (text) — titre du critère
- `description` (text) — guide pour l'IA
- `weight` (int, default 0) — pondération suggérée
- `scoring_scale` (enum `scoring_scale_type` : `0-5`, `0-10`, `ABC`)
- `applies_to` (enum `criteria_scope` : `all_questions`, `specific_questions`)
- `anchors` (jsonb, default `{}`)
- `category` (text, nullable) — pour filtrer comme les questions

RLS : mêmes 4 policies que `question_templates` (org members peuvent CRUD sur leur org).

### Frontend

**Nouveau composant `CriterionFormDialog.tsx`** (équivalent de `QuestionFormDialog`) :
- Champs : label, description, poids, échelle, application, catégorie
- Optionnel `showSaveToLibrary` pour la création projet
- Props : `open`, `onOpenChange`, `initial`, `isEditing`, `saving`, `onSubmit`

**Nouveau composant `CriteriaLibraryDialog.tsx`** (équivalent de `QuestionLibraryDialog`) :
- Liste les `criteria_templates` de l'org avec recherche + filtre catégorie
- Sélection multiple → renvoie tableau de critères au parent

**Nouveau composant `CriteriaLibraryManager.tsx`** (équivalent de `QuestionLibraryManager`) :
- Affiche la bibliothèque avec ajout/édition/suppression via `CriterionFormDialog`
- Sera affiché dans la page Settings (ou nouvelle page `/criteria-library` selon convention existante — on s'aligne sur où vit `QuestionLibrary` aujourd'hui : page dédiée `/library/questions` → on créera `/library/criteria`)

**Refonte `StepCriteria.tsx`** :
- Remplacer les grosses cards par des lignes compactes (titre + badge poids + badge échelle + actions edit/delete), même style que `SortableQuestion` mais sans drag (sauf si demandé)
- Header : indicateur pondération totale + 2 boutons "Bibliothèque" / "Ajouter"
- "Ajouter" → ouvre `CriterionFormDialog` (avec case "Ajouter à ma bibliothèque")
- "Bibliothèque" → ouvre `CriteriaLibraryDialog` pour piocher
- Clic sur une ligne ou icône crayon → réouvre `CriterionFormDialog` en édition

**Sauvegarde projet** :
- Dans le flux save de `ProjectNew`/`ProjectEdit`, après insert des `evaluation_criteria`, si `save_to_library` est coché → insert dans `criteria_templates`.

**Navigation** :
- Ajouter un lien "Bibliothèque de critères" dans `AppSidebar` à côté de "Bibliothèque de questions".
- Nouvelle route `/library/criteria` rendant `CriteriaLibrary.tsx` (équivalent de `QuestionLibrary.tsx`).

### Fichiers

**Nouveaux**
- Migration SQL : table `criteria_templates` + RLS
- `src/components/CriterionFormDialog.tsx`
- `src/components/CriteriaLibraryDialog.tsx`
- `src/components/CriteriaLibraryManager.tsx`
- `src/pages/CriteriaLibrary.tsx`

**Modifiés**
- `src/components/project/StepCriteria.tsx` — affichage compact + pop-ups
- `src/pages/ProjectNew.tsx` + `src/pages/ProjectEdit.tsx` — gestion `save_to_library` au save
- `src/App.tsx` — route `/library/criteria`
- `src/components/AppSidebar.tsx` — lien navigation

### Test
1. Créer un critère dans la bibliothèque via la nouvelle page → visible.
2. Dans création projet → "Ajouter" ouvre la pop-up → critère ajouté en ligne compacte.
3. "Bibliothèque" dans le projet → choisir 2 critères → ajoutés.
4. Cocher "Ajouter à ma bibliothèque" → sauvegarder projet → critère apparaît dans la bibliothèque.
5. Clic sur une ligne critère du projet → réouvre la pop-up en édition.
6. Pondération totale toujours affichée et code couleur correct.

