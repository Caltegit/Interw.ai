## Objectif

Permettre de définir un **avatar par question** (Texte et Audio uniquement) dans le wizard de création/édition de session. Si défini, il remplace l'avatar du projet pendant cette question pour le candidat. Sinon, l'avatar du projet est utilisé.

## Comportement attendu

**Dans la liste des questions (StepQuestions)** — uniquement pour les questions Texte et Audio :
- À gauche des boutons « Modifier » et « Supprimer », ajouter un nouvel **icône rond cliquable** affichant la photo de l'avatar de la question (ou l'avatar par défaut du projet si aucun n'est défini).
- Au survol : tooltip « Modifier l'avatar pour cette question ».
- Clic → ouvre une popup réutilisant l'interface de sélection d'avatar (`AvatarPicker` + `AvatarUploadDialog`).
- Si un avatar custom est défini, un petit point indigo en bas à droite de la vignette signale qu'il diffère de celui du projet.
- Bouton « Réinitialiser » dans la popup pour repasser à l'avatar du projet.

**Pour les questions Vidéo** : l'icône n'est **pas affiché** (la vidéo se substitue à l'avatar).

**Côté candidat (InterviewStart)** : pour chaque question Texte/Audio, si `avatar_image_url` est défini sur la question, l'utiliser ; sinon fallback sur celui du projet.

## Modifications techniques

### 1. Base de données (migration)

Ajout de la colonne `avatar_image_url TEXT NULL` sur :
- `questions`
- `interview_template_questions` (pour cohérence avec la bibliothèque de modèles de session)
- `question_templates` (bibliothèque de questions individuelles)

Pas de modification de RLS nécessaire (les politiques existantes couvrent déjà tous les champs).

### 2. Type `Question` (StepQuestions.tsx)

```ts
avatar_image_url: string | null;
```
+ ajout dans `createEmptyQuestion()`.

### 3. Composant réutilisable : `QuestionAvatarDialog`

Nouveau fichier `src/components/project/QuestionAvatarDialog.tsx` qui encapsule un Dialog contenant :
- L'aperçu actuel + bouton « Utiliser l'avatar du projet » (reset)
- Le composant `AvatarPicker` existant
- Bouton « Valider »

L'upload de fichier réutilise le bucket Storage déjà en place pour les avatars de projet (même chemin/policies que `ProjectForm`).

### 4. Intégration dans `SortableQuestion` (StepQuestions.tsx)

- Nouvelle prop `projectAvatarUrl: string | null` passée depuis le parent.
- Nouveau bouton rond (32×32) avant les boutons Pencil/Trash, conditionné sur `q.mediaType !== "video"`.
- Affiche `q.avatar_image_url ?? projectAvatarUrl ?? <fallback initiale>`.
- État local pour ouvrir/fermer le `QuestionAvatarDialog`.

### 5. Propagation `projectAvatarUrl`

`StepQuestions` reçoit une nouvelle prop optionnelle `projectAvatarUrl`. Mise à jour des appelants :
- `ProjectForm.tsx` (création/édition de session) → passe la valeur courante du champ avatar du projet.
- `InterviewTemplateEdit.tsx` → passe `null` (pas d'avatar projet pour un modèle).

### 6. Persistance

- `ProjectForm` (insert/update questions) : ajouter `avatar_image_url: q.avatar_image_url ?? null` au payload.
- `InterviewTemplateEdit` : idem sur `interview_template_questions`.
- `QuestionLibraryManager` (bibliothèque de questions) : ajouter le champ au payload `question_templates` + dans `openEdit`.
- `loadInterviewTemplate.ts` et `QuestionLibraryDialog` : propager `avatar_image_url` lors de l'import depuis la bibliothèque.

### 7. Affichage côté candidat (`InterviewStart.tsx`)

Au moment d'afficher l'avatar pour la question courante :
```ts
const currentAvatar = currentQuestion.avatar_image_url || project.avatar_image_url;
```
Uniquement pour les questions de type `written` et `audio` (la vidéo affiche déjà le lecteur vidéo).

## Hors périmètre

- Pas de génération d'avatar IA spécifique par question (réutilise les presets existants).
- Pas de modification de la table `projects`.
- Pas de bucket Storage supplémentaire (réutilise celui des avatars projet).