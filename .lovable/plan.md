# Plan — Supprimer l'option "auto" pour Intro IA et Transitions

## Contexte
Dans `src/components/project/ProjectForm.tsx` (section "Voix de l'IA", étape 1, fonctionnalités avancées), deux blocs proposent un `RadioGroup` avec deux choix :
- **Laisser l'IA s'adapter au contexte des réponses** (`mode = "auto"`)
- **Utiliser un texte fixe** (`mode = "custom"`) → ouvre `AiTextCustomizerDialog`

L'utilisateur veut supprimer le premier choix. Seul le texte fixe (modifiable) reste.

## Changements (frontend uniquement)

### `src/components/project/ProjectForm.tsx`

**Bloc Intro IA (lignes ~1041-1067)** : remplacer le `RadioGroup` + condition `aiIntroMode === "custom"` par directement le bouton "Modifier le texte" + un aperçu court du texte courant (ou `DEFAULT_AI_INTRO_TEXT`).

**Bloc Transitions (lignes ~1079-1105)** : même traitement avec `DEFAULT_AI_TRANSITION_TEXT`.

**Modes** : forcer `aiIntroMode` et `aiQuestionTransitionsMode` à `"custom"` en permanence.
- Conserver les états `aiIntroMode` / `aiQuestionTransitionsMode` côté state pour rester compatible avec la sauvegarde DB (colonnes `ai_intro_mode`, `ai_question_transitions_mode`) et les templates chargés.
- Lors du chargement d'un template existant en mode `"auto"`, le forcer silencieusement à `"custom"` à l'initialisation.
- Retirer `setAiIntroMode` / `setAiQuestionTransitionsMode` des handlers UI (plus de RadioGroup à afficher).

## Hors-scope
- Pas de migration DB : les colonnes `ai_intro_mode` et `ai_question_transitions_mode` restent en place (valeurs futures toujours `"custom"`). Les anciens projets en `"auto"` seront re-saisis en `"custom"` à la prochaine sauvegarde.
- Pas de modification du runtime candidat ni des edge functions.
- Pas de modification de `AiTextCustomizerDialog`.
