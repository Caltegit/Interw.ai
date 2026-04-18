

## Plan : Uniformiser l'UI d'ajout de question + ajout à la bibliothèque

### Objectif
Aligner l'expérience d'ajout de question dans `StepQuestions` (création de projet) sur celle de la bibliothèque (`QuestionLibraryManager`), et ajouter une case à cocher "Ajouter à la bibliothèque" sur chaque question du projet.

### Étape 1 — Inspecter le UI de la bibliothèque
Lire `QuestionLibraryManager.tsx` pour comprendre exactement le formulaire d'ajout (layout, champs, ordre, catégorie, options média, relance IA…) et le reproduire à l'identique dans `StepQuestions`.

### Étape 2 — Refondre `StepQuestions.tsx`
- Remplacer le formulaire compact actuel par le même layout que celui de la bibliothèque :
  - Toggle type (Écrite / Audio / Vidéo) au même endroit, mêmes libellés et icônes
  - Champ contenu / titre identique
  - Bloc d'enregistrement audio/vidéo identique (`QuestionMediaRecorder`)
  - Toggle "Relance IA" placé pareil
  - Ajouter le champ **Catégorie** (utilisé par la bibliothèque) — optionnel, libre
- Conserver le drag & drop, l'accordéon (collapse/expand), et la limite de 15 questions.

### Étape 3 — Case "Ajouter à la bibliothèque"
- Ajouter un champ booléen `save_to_library` sur chaque `Question` (state local uniquement).
- Afficher une `Checkbox` shadcn dans le bloc déplié de chaque question : *"Ajouter cette question à ma bibliothèque"*.
- Désactiver la checkbox + masquer le label si la question vient d'un import bibliothèque (déjà existante) — détection via `audioPreviewUrl`/`videoPreviewUrl` qui sont des URLs distantes ou via un flag `from_library`.

### Étape 4 — Persistance à la sauvegarde du projet
Repérer où est sauvegardé le projet (probablement `ProjectNew.tsx` / `ProjectEdit.tsx`) et :
- Après création des `questions` du projet, pour chaque question avec `save_to_library === true`, créer aussi un enregistrement dans `question_templates` (org_id de l'utilisateur, content, type, follow_up_enabled, max_follow_ups, category, audio_url, video_url une fois uploadés).
- Si une question a un blob audio/vidéo : réutiliser l'URL uploadée pour la question du projet, pas re-uploader.
- Éviter les doublons (clé naturelle = `organization_id` + `content` exact → skip si déjà présent).

### Fichiers modifiés
- `src/components/project/StepQuestions.tsx` — refonte UI + checkbox + nouveau champ `category` + flag `save_to_library`
- `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` — insertion dans `question_templates` après save du projet pour les questions cochées

### Test final
1. Créer un projet, ajouter 2 questions (1 écrite + 1 audio), cocher "Ajouter à la bibliothèque" sur l'une, sauvegarder.
2. Vérifier que la question apparaît bien dans la page Bibliothèque.
3. Recréer un autre projet, ouvrir la bibliothèque, l'importer → confirmer que tout fonctionne.
4. Éditer un projet existant, modifier une question, vérifier que rien ne casse.

