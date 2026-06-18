## Changements dans `src/components/QuestionFormDialog.tsx`

1. Réordonner `FORMAT_OPTIONS` : `video`, `audio`, `written` (Vidéo à gauche, Lu par IA à droite).
2. Changer `mediaType` par défaut dans `EMPTY_QUESTION_FORM` de `"written"` à `"video"` pour qu'une nouvelle question s'ouvre sur Vidéo.

Aucun autre changement (édition d'une question existante garde son format actuel via `initial`).