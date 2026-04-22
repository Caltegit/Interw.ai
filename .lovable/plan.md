

## Étape Intro améliorée — 4 formats

Refonte de l'étape **Intro** du wizard `Nouveau projet` / `Modifier projet`.

### Nouveau comportement

**Bloc 1 — Activer l'intro (toggle)**

- Switch **« Diffuser une intro avant les questions »** (Oui / Non).
- Texte explicatif sous le switch :
  > L'intro est le premier contact entre votre entreprise et le candidat. Elle permet de présenter le poste, l'équipe et de mettre le candidat à l'aise avant les questions.
- Si **Non** → aucune intro n'est diffusée, on saute directement aux questions côté candidat.

**Bloc 2 — Choix du format (visible si Oui)**

4 cartes cliquables côte à côte (responsive : grille 2×2 sur petit écran) :

| Format | Description courte | Ce qui s'affiche en dessous une fois sélectionné |
|---|---|---|
| **Texte à lire** | Le candidat lit un message à l'écran | `<Textarea>` du message d'intro |
| **Texte lu par l'IA** | L'IA lit votre texte avec la voix et l'avatar choisis | `<Textarea>` + rappel de la voix/avatar configurés à l'étape 1 + bouton « Prévisualiser » (TTS via `tts-elevenlabs`) |
| **Audio** | Vous enregistrez ou téléchargez un message vocal | `<IntroAudioRecorder>` existant + bouton bibliothèque |
| **Vidéo** | Vous enregistrez ou téléchargez une vidéo de présentation | `<IntroVideoRecorder>` existant + bouton bibliothèque |

### Changements base de données

Migration ajoutant à la table `projects` :
- `intro_enabled boolean default true` — toggle activé / désactivé
- `intro_mode text` — `'text' | 'tts' | 'audio' | 'video'` (nullable, contrainte CHECK)
- `intro_text text` — contenu pour modes `text` et `tts` (nullable)

Les colonnes existantes `intro_audio_url` et `presentation_video_url` sont conservées telles quelles.

### Changements front

**`ProjectFormState`** (dans `ProjectForm.tsx`) :
- Remplacer `introType: "audio" | "video"` par :
  - `introEnabled: boolean`
  - `introMode: "text" | "tts" | "audio" | "video"`
  - `introText: string`
- Conserver `introAudioBlob/PreviewUrl`, `introVideoFile/PreviewUrl`.

**Composant `StepIntro` extrait** (`src/components/project/StepIntro.tsx`) :
- Encapsule le switch, les 4 cartes de choix, et le rendu conditionnel selon `introMode`.
- Carte « Texte lu par l'IA » : Textarea + bouton « Prévisualiser la lecture » qui appelle l'edge function existante `tts-elevenlabs` avec `ttsVoiceId` du formulaire.

**Persistance (`ProjectNew.tsx` + `ProjectEdit.tsx`)** :
- Mapping vers les nouvelles colonnes selon `introEnabled` + `introMode`.
- Si `introEnabled === false` : tout à `null`, `intro_enabled = false`.
- Modes `text`/`tts` : sauvegarder `intro_text` + `intro_mode`, vider audio/vidéo.
- Modes `audio`/`video` : flux actuel inchangé.

**Lecture côté candidat (`InterviewLanding.tsx`)** :
- Lire `project.intro_enabled` + `project.intro_mode`.
- `text` → afficher le texte dans une carte avec bouton « J'ai lu, continuer ».
- `tts` → afficher avatar + lire `intro_text` via `tts-elevenlabs` (réutiliser le pattern déjà en place pour les questions TTS).
- `audio` / `video` → comportement actuel.
- Si `intro_enabled === false` ou `intro_mode === null` → skip directement.

**Récapitulatif (étape 4)** :
- Affiche « Intro : Désactivée » ou « Intro : Texte / Texte IA / Audio / Vidéo ✓ ».

**Modèles d'intro (`InterviewTemplatePickerDialog`)** : hors scope ici, la table `intro_templates` reste audio/vidéo uniquement.

### Fichiers touchés

- **Créés** : `src/components/project/StepIntro.tsx`, migration `add_intro_mode_to_projects`
- **Modifiés** :
  - `src/components/project/ProjectForm.tsx` — nouveau state + extraction de l'étape 1 vers `StepIntro`
  - `src/pages/ProjectNew.tsx` — mapping persistance
  - `src/pages/ProjectEdit.tsx` — chargement + mapping persistance
  - `src/pages/InterviewLanding.tsx` — gestion des 4 modes côté candidat
  - `supabase/functions/get-email-template-defaults` ou edge fn TTS : aucun changement, on réutilise `tts-elevenlabs`

### Hors champ

- Pas de changement dans la bibliothèque d'intros (reste audio/vidéo).
- Pas de migration des projets existants : valeurs par défaut sûres (`intro_enabled = true`, `intro_mode` déduit à la volée si `intro_audio_url`/`presentation_video_url` est présent).
- Pas de refonte visuelle des autres étapes du wizard.

