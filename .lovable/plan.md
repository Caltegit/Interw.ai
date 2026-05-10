## Bibliothèque d'intros — afficher les TTS dans la liste « Texte »

Fichier : `src/components/project/IntroLibraryDialog.tsx`

### Constat
Le dialog filtre strictement par `type = text`. Or les intros sauvegardées sont presque toutes en `tts` (texte lu par voix IA), qui contiennent aussi un `intro_text`. Résultat : la bibliothèque paraît vide alors qu'il y a du contenu réutilisable.

### Changement
- Quand `type === "text"` : élargir la requête à `type IN ('text', 'tts')` pour récupérer les deux.
- Pour les autres formats (`tts`, `audio`, `video`) : comportement inchangé (filtre strict).
- Sur chaque carte de résultat, afficher un **badge distinct** :
  - « Texte » (badge gris) pour les intros pures `type = text`
  - « Voix IA » (badge indigo) pour les `type = tts`
- À la sélection d'une intro `tts` depuis la liste « Texte » : on la passe telle quelle au parent — le composant appelant garde le `type` original de l'intro (donc `tts`), ce qui est cohérent avec son contenu.

### Hors scope
- Pas de modification des autres formats (audio, vidéo)
- Pas de migration : les données existantes restent telles quelles
- Pas de changement du sélecteur de format dans `StepIntro`
