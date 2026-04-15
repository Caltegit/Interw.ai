

# Distinguer les 3 types de questions dans la colonne Interviewer

## Concept

La colonne gauche (Interviewer) s'adapte dynamiquement selon le type de la question en cours :

```text
TEXTE                    AUDIO                    VIDEO
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│  Photo IA    │         │  Photo IA    │         │  Vidéo de la │
│  (avatar)    │         │  (avatar)    │         │  question    │
│              │         │              │         │  (remplace   │
│              │         │              │         │   l'avatar)  │
├──────────────┤         ├──────────────┤         │              │
│ Texte de la  │         │ Lecteur      │         │              │
│ question     │         │ audio        │         └──────────────┘
│ (lu par TTS) │         │ (autoplay)   │
└──────────────┘         └──────────────┘
```

## Modifications

### `src/pages/InterviewStart.tsx`

1. **Déterminer le type** de la question courante (déjà fait lignes 722-725)

2. **Conditionner l'affichage de l'avatar** : l'avatar (photo IA, lignes 698-716) ne s'affiche que pour les questions `written` et `audio`. Pour les questions `video`, il est remplacé par la vidéo de la question (plein cadre, même dimensions).

3. **Réorganiser le `QuestionMediaPlayer`** :
   - **Texte** : pas de player média, le texte de la question s'affiche directement sous l'avatar (il est lu par le TTS existant)
   - **Audio** : le player audio compact s'affiche sous l'avatar
   - **Vidéo** : le player vidéo prend la place de l'avatar (aspect-square, même style avec ring, même badge nom IA)

4. **Supprimer le badge "Question en cours"** du `QuestionMediaPlayer` featured pour alléger — le type est évident visuellement.

### `src/components/interview/QuestionMediaPlayer.tsx`

Aucune modification nécessaire — le composant gère déjà les 3 types. On conditionne simplement son placement et la visibilité de l'avatar dans `InterviewStart.tsx`.

## Résumé des changements

Un seul fichier modifié : `InterviewStart.tsx`. La logique consiste à wrapper l'avatar et le player dans un conditionnel sur `questionType` pour que la vidéo remplace l'avatar quand c'est une question vidéo, et que l'avatar reste visible pour texte/audio.

