## Objectif
Remplacer le terme « Bibliothèque » par « Ressources » partout dans l'interface, en respectant la grammaire française (accords, articles).

## Règles de remplacement
- "Bibliothèque" → "Ressources" (pluriel)
- "la bibliothèque" → "les ressources"
- "ma bibliothèque" → "mes ressources"
- "bibliothèques" → "ressources"
- "depuis la bibliothèque" → "depuis les ressources"
- "dans la bibliothèque" → "dans les ressources"
- "Bibliothèque de questions/critères/intros" → "Ressources — questions/critères/intros" (ou simplement "Questions"/"Critères"/"Intros" selon le contexte de page)

## Fichiers à modifier (UI visible)
- `src/pages/CriteriaLibrary.tsx` — titre h1
- `src/pages/IntroLibrary.tsx` — titre h1 + toast
- `src/pages/QuestionLibrary.tsx` — titre h1
- `src/pages/Landing.tsx` — feature « Bibliothèque de questions partagée »
- `src/pages/Produit.tsx` — pill, descriptions, meta SEO
- `src/components/QuestionFormDialog.tsx` — labels étape sauvegarde
- `src/components/QuestionLibraryManager.tsx` — titre + empty state
- `src/components/CriterionFormDialog.tsx` — label
- `src/components/CriteriaLibraryManager.tsx` — titre + empty state
- `src/components/copilot/CopilotChatWindow.tsx` — boutons + toasts
- `src/components/AppSidebar.tsx` — commentaire
- `src/components/superadmin/CreateOrgDialog.tsx` — label seed
- `src/components/project/IntroLibraryDialog.tsx` — bouton, titre, empty state
- `src/components/project/InterviewTemplatePickerDialog.tsx` — empty state
- `src/components/project/CriteriaLibraryDialog.tsx` — titre
- `src/components/project/QuestionLibraryDialog.tsx` — titre
- `src/components/project/SaveAsTemplateDialog.tsx` — toast
- `src/components/project/StepIntro.tsx` — label
- `src/components/project/StepQuestions.tsx` — boutons + commentaires
- `src/components/project/StepCriteria.tsx` — boutons
- `src/pages/ProjectEdit.tsx` — commentaires de code

## Hors scope
- Noms de fichiers (`QuestionLibrary.tsx`, `IntroLibrary.tsx`, etc.) — non visibles utilisateur
- Noms de variables / types / tables BDD
- Routes URL (`/library/...`) déjà inchangées
