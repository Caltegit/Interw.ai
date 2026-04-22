

## Wizard Nouveau projet — Étape Intro : ajustements UX

### 1. Toggle « Diffuser une intro » désactivé par défaut

Dans `src/pages/ProjectNew.tsx`, passer `introEnabled: true` à `false` dans `initialState`. Les projets existants en édition ne sont pas affectés (la valeur vient de la base).

### 2. Bouton « Bibliothèque » aligné à droite du label « Format de l'intro »

Dans `src/components/project/StepIntro.tsx` :

- Retirer le bouton `IntroLibraryDialog` de chacun des 4 sous-blocs (text, tts, audio, video).
- Ajouter un seul bouton `IntroLibraryDialog` à droite du label « Format de l'intro », sur la même ligne (`flex items-center justify-between`).
- Le `type` passé au dialog suit la valeur courante de `introMode` (text / tts / audio / video).
- Le `onSelect` dispatch selon le mode courant :
  - `text` / `tts` → `setIntroText(item.intro_text || "")`
  - `audio` → `setIntroAudioBlob(null)` + `setIntroAudioPreviewUrl(item.audio_url)`
  - `video` → `setIntroVideoFile(null)` + `setIntroVideoPreviewUrl(item.video_url)`

Résultat visuel :

```
Format de l'intro                          [📚 Bibliothèque]
[ Texte ] [ Voix IA ] [ Audio ] [ Vidéo ]
```

### Fichiers touchés

- `src/pages/ProjectNew.tsx` — `introEnabled: false` dans `initialState`.
- `src/components/project/StepIntro.tsx` — déplacement du bouton bibliothèque, suppression des 4 instances internes.

### Hors champ

- Aucune modification BDD.
- Aucun changement sur l'édition d'un projet existant ni sur la bibliothèque elle-même.

