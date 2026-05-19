# Ajouter une case "Ajouter à la bibliothèque" pour l'intro

Reproduire le pattern déjà en place pour les questions, appliqué à l'intro d'un projet.

## Comportement

- Dans l'étape Intro du formulaire projet, afficher une case à cocher **"Ajouter à la bibliothèque"** sous le bloc de configuration de l'intro.
- La case ne s'affiche que si l'intro est activée **et** qu'il y a du contenu (texte saisi, audio enregistré ou vidéo importée selon le mode).
- Lors de la sauvegarde du projet, si la case est cochée, créer une entrée dans `intro_templates` avec :
  - `organization_id` = org du projet
  - `created_by` = user courant
  - `name` = titre du projet
  - `type` = mode d'intro (`text`, `tts`, `audio`, `video`)
  - `intro_text`, `audio_url`, `video_url`, `tts_voice_id` selon le mode
- Toast de confirmation discret en cas de succès, erreur non bloquante sinon (le projet reste sauvegardé).

## Fichiers modifiés

1. **`src/components/project/StepIntro.tsx`** — ajouter props `saveToLibrary: boolean` et `setSaveToLibrary` ; rendre la checkbox sous le bloc de config quand intro activée + contenu présent.
2. **`src/components/project/ProjectForm.tsx`** — ajouter `saveIntroToLibrary` au state, le passer à `StepIntro`, l'inclure dans le payload onSubmit.
3. **`src/pages/ProjectNew.tsx`** — après création projet, si flag coché, INSERT dans `intro_templates` avec les URLs uploadées (audio/vidéo) ou le texte.
4. **`src/pages/ProjectEdit.tsx`** — même logique au save.

## Notes techniques

- Aucune migration : la table `intro_templates` existe déjà avec les bons champs et RLS.
- Pour audio/vidéo : on utilise les URLs déjà uploadées dans le storage du projet (pas de re-upload séparé).
- Après ajout réussi, on remet le flag à `false` pour éviter une double création au save suivant.
