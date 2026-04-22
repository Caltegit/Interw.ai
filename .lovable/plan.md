

## Lot 3.4 — Composant `<ProjectForm />` partagé

Fusionner la logique dupliquée entre `ProjectNew.tsx` et `ProjectEdit.tsx` dans un seul composant réutilisable.

### Pré-requis

Avant la refacto, ajouter **1 test E2E sur l'édition de projet** (la création est déjà couverte par `project-creation.spec.ts`). Filet de sécurité minimum pour détecter une régression.

- `tests/e2e/project-edit.spec.ts` — RH ouvre le projet seed, modifie le titre, sauvegarde, vérifie la persistance après reload.

### Refacto

1. **Créer `src/components/project/ProjectForm.tsx`** — composant unique qui prend en props :
   - `mode: "create" | "edit"`
   - `initialData?: ProjectData` (undefined en création)
   - `onSubmit: (data) => Promise<void>`
   - Gère les 4 étapes du wizard (poste, questions, critères, validation), l'état local, les dialogs (bibliothèque questions, critères, intro, voix, template).

2. **Simplifier `ProjectNew.tsx`** — devient un wrapper :
   - Charge les defaults (org, voix par défaut, etc.)
   - Rend `<ProjectForm mode="create" onSubmit={handleCreate} />`
   - Gère la redirection après création.

3. **Simplifier `ProjectEdit.tsx`** — devient un wrapper :
   - Charge le projet existant (questions + critères + intro)
   - Rend `<ProjectForm mode="edit" initialData={project} onSubmit={handleUpdate} />`
   - Gère la redirection après update.

### Règles

- Aucun changement de comportement visible (UI identique, mêmes étapes, mêmes validations).
- Garder les composants enfants existants (`StepQuestions`, `StepCriteria`, `IntroLibraryDialog`, etc.) tels quels.
- Vérifier que le test E2E création **et** le nouveau test E2E édition passent après refacto.

### Hors champ

- Pas de redesign du wizard.
- Pas de changement de schéma BDD.
- Pas de touche à `InterviewStart` (Lot 2, plus tard).

### Fichiers touchés

- **Créés** : `src/components/project/ProjectForm.tsx`, `tests/e2e/project-edit.spec.ts`
- **Modifiés** : `src/pages/ProjectNew.tsx`, `src/pages/ProjectEdit.tsx`, `.lovable/architecture-hardening-status.md`, `tests/e2e/README.md`

### Ordre d'exécution

1. Écrire `project-edit.spec.ts` et le faire passer contre la version actuelle.
2. Créer `ProjectForm.tsx` à partir de `ProjectNew.tsx` (le plus complet des deux).
3. Migrer `ProjectNew` en wrapper, vérifier le test création.
4. Migrer `ProjectEdit` en wrapper, vérifier le test édition.

