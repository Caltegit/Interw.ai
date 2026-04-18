

## Bibliothèque d'intros (audio + vidéo)

### Concept
Créer une bibliothèque réutilisable d'**intros de présentation** (audio ou vidéo) au niveau de l'organisation, sur le même modèle que la bibliothèque de questions existante. À la création/édition d'un projet (étape 2), au lieu de réenregistrer une intro à chaque fois, l'utilisateur peut piocher une intro pré-enregistrée.

### Navigation — restructurer le menu
Renommer **"Questions"** en **"Bibliothèque"** dans la sidebar, avec 2 sous-items :
- **Questions** → page actuelle `QuestionLibrary` (URL : `/library/questions`)
- **Intros** → nouvelle page `IntroLibrary` (URL : `/library/intros`)

Redirection `/question-library` → `/library/questions` pour ne pas casser les liens existants.

### Nouvelle table `intro_templates`
Symétrique à `question_templates` :
```
id, organization_id, created_by, created_at
name           text     — label (ex: "Intro Marie - chaleureuse")
type           text     — 'audio' | 'video'
audio_url      text     — si type=audio
video_url      text     — si type=video
description    text     — optionnel, contexte d'usage
```
RLS : org members peuvent CRUD sur les intros de leur organisation (calqué sur `question_templates`).

Les fichiers vont dans le bucket `media` existant, sous `intro-library/{uuid}.webm`.

### Nouvelle page `IntroLibrary`
- Grille de cards : nom, type (badge audio/vidéo), preview lecteur intégré, bouton supprimer
- Bouton **"+ Nouvelle intro"** → dialog avec :
  - Champ **Nom**
  - Toggle **Audio / Vidéo**
  - Réutilise `IntroAudioRecorder` ou `IntroVideoRecorder` existants
  - Save → upload bucket + insert `intro_templates`

### Intégration étape 2 de création projet
Dans `ProjectNew.tsx` et `ProjectEdit.tsx`, à côté du recorder d'intro, ajouter un bouton **"Choisir depuis la bibliothèque"** qui ouvre un dialog `IntroLibraryDialog` :
- Liste filtrée par type (audio ou vidéo selon le toggle actif)
- Au clic sur une intro : l'URL de la bibliothèque est utilisée directement comme `intro_audio_url` / `presentation_video_url` du projet (pas de réupload — réutilisation comme déjà fait pour les questions)

### Fichiers touchés
1. Migration SQL — table `intro_templates` + RLS
2. `src/components/AppSidebar.tsx` — sous-menu Bibliothèque
3. `src/App.tsx` — nouvelles routes `/library/questions` et `/library/intros` + redirect
4. `src/pages/IntroLibrary.tsx` — **nouveau**
5. `src/components/project/IntroLibraryDialog.tsx` — **nouveau** (sélecteur réutilisable)
6. `src/pages/ProjectNew.tsx` + `src/pages/ProjectEdit.tsx` — bouton "Depuis la bibliothèque"

### Question optionnelle
Quand l'utilisateur enregistre une intro depuis l'étape 2 d'un projet, faut-il proposer une **case à cocher "Sauvegarder dans la bibliothèque"** pour qu'elle soit réutilisable ailleurs ? (Aujourd'hui les questions enregistrées dans un projet ne remontent pas dans la bibliothèque — comportement cohérent à garder, sauf si tu veux le changer.)

