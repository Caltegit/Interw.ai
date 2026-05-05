## Ajouter l'option « Pas de transition »

### `src/components/project/ProjectForm.tsx`

Remplacer le `Switch` actuel des transitions par un `RadioGroup` à 3 options qui pilote à la fois `aiQuestionTransitionsEnabled` et `aiQuestionTransitionsMode` :

- **Laisser l'IA s'adapter au contexte des réponses** → `enabled = true`, `mode = "auto"` (par défaut)
- **Utiliser un texte fixe** → `enabled = true`, `mode = "custom"` + bouton « Modifier le texte »
- **Pas de transition** → `enabled = false` (l'IA enchaîne directement les questions, comportement déjà géré dans `InterviewStart.tsx` quand `transitionsEnabled = false`)

Garder le `AiTextCustomizerDialog` existant inchangé.

### Hors scope

- Pas de migration DB : les colonnes `ai_question_transitions_enabled` et `ai_question_transitions_mode` existent déjà et couvrent les 3 cas.
- Pas de changement dans `InterviewStart.tsx` ni dans l'edge function (le mode « désactivé » est déjà géré).
- Pas de changement dans `ProjectNew.tsx` / `ProjectEdit.tsx` (ils relisent/écrivent déjà ces deux champs).
