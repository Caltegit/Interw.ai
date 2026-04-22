

## Bibliothèque d'intros — 4 formats alignés sur le wizard

Refonte de `/library/intros` pour reprendre l'UX et les 4 formats de l'étape Intro du wizard.

### Modifications base de données

Migration sur la table `intro_templates` :
- Ajout `intro_text text` (nullable) — pour les modes `text` et `tts`
- Ajout `tts_voice_id text` (nullable) — voix optionnelle pour la prévisualisation TTS
- Modification de la contrainte sur `type` pour accepter `'text' | 'tts' | 'audio' | 'video'` (au lieu de `audio | video`)
- Les modèles existants (`audio`/`video`) restent valides.

### Refonte de la page IntroLibrary

**En-tête** : Titre + bouton « Nouvelle intro » (inchangé).

**Filtres** : Une rangée d'onglets/badges au-dessus de la grille pour filtrer par type : Tous · Texte · Texte IA · Audio · Vidéo. Compteur par type.

**Grille des modèles** : Cartes harmonisées avec un badge coloré par type, aperçu adapté :
- Texte → extrait du message (3 lignes max) + icône `FileText`
- Texte IA → extrait + bouton « Écouter » (lance TTS via `tts-elevenlabs`)
- Audio → lecteur `<audio>`
- Vidéo → lecteur `<video>`

**Dialog « Nouvelle intro »** : Reprend exactement la structure visuelle de `StepIntro` :
1. Champ Nom + Description
2. Sélecteur de format en 4 cartes cliquables (`Texte`, `Texte IA`, `Audio`, `Vidéo`) — même composant visuel que dans le wizard
3. Zone de saisie conditionnelle :
   - **Texte** : `<Textarea>` du message
   - **Texte IA** : `<Textarea>` + sélecteur de voix (réutilise `VoiceSelectorDialog`) + bouton « Prévisualiser »
   - **Audio** : `<IntroAudioRecorder>`
   - **Vidéo** : `<IntroVideoRecorder>`

### Mise à jour du sélecteur côté wizard

`IntroLibraryDialog` (utilisé dans `StepIntro`) :
- Étendre la prop `type` pour accepter les 4 modes.
- Filtrer la liste par mode demandé.
- Quand l'utilisateur sélectionne un modèle texte/TTS, transmettre `intro_text` (et `tts_voice_id`) au lieu d'une URL média.

### Refacto pour cohérence

Extraction d'un petit composant partagé `IntroFormatPicker.tsx` (les 4 cartes cliquables) utilisé à la fois dans `StepIntro` (wizard) et dans le dialog de la bibliothèque, pour garantir une UX strictement identique.

### Fichiers touchés

- **Créés** :
  - `src/components/library/IntroFormatPicker.tsx` — sélecteur 4 cartes partagé
  - Migration `extend_intro_templates_for_text_modes`
- **Modifiés** :
  - `src/pages/IntroLibrary.tsx` — refonte complète du dialog + filtres + grille
  - `src/components/project/StepIntro.tsx` — utiliser `IntroFormatPicker` partagé
  - `src/components/project/IntroLibraryDialog.tsx` — supporter les 4 modes
  - `src/integrations/supabase/types.ts` — régénéré automatiquement après migration

### Hors champ

- Pas de modification du flux candidat (`InterviewLanding.tsx`) — déjà géré par étape précédente.
- Pas de migration des modèles existants (audio/vidéo restent tels quels).
- Pas de changement de routes.

