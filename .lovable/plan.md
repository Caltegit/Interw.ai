## Améliorer l'enregistrement audio/vidéo : une interface unique, fiable partout

### Constat

Aujourd'hui il existe **trois composants d'enregistrement différents**, chacun avec sa propre logique, ses propres bugs et son propre style :

| Composant | Utilisé pour | Problèmes |
|---|---|---|
| `IntroVideoRecorder` + `VideoRecorderPanel` | Vidéo d'intro (StepIntro, IntroLibrary) | Compte à rebours 3-2-1 inutile, bouton « Arrêter » qui peut rester bloqué, miroir non rendu en preview après stop |
| `IntroAudioRecorder` | Audio d'intro (StepIntro, IntroLibrary) | Pas d'import de fichier, pas de re-prise rapide, durée non affichée |
| `QuestionMediaRecorder` + `VideoRecorderPanel` | Média des questions (StepQuestions) | Même bug d'arrêt vidéo, interface très différente du reste |
| `QuestionMediaEditor` | Questions (QuestionFormDialog) | Le **plus propre** : démarrer/arrêter direct, import, re-prise, suppression, jauge de niveau, limite de durée |

Résultat : sur mobile, l'utilisateur ne sait pas toujours comment arrêter, le bouton est parfois caché ou inactif, et l'expérience change d'un écran à l'autre.

### Ce qu'on va faire

**1. Un seul composant : `MediaRecorderField`**

On promeut `QuestionMediaEditor` au rang de composant officiel et on le renomme `MediaRecorderField` (déplacé dans `src/components/media/`). Il deviendra **le seul** composant d'enregistrement de l'application, utilisé pour :

- Audio d'intro projet
- Vidéo d'intro projet
- Média de question (audio ou vidéo)
- Bibliothèque d'intros
- Bibliothèque de questions

**2. Améliorations apportées à ce composant unique**

Pour qu'il couvre tous les cas, on ajoute :

- **Pas de compte à rebours** : un clic sur « Démarrer » lance immédiatement, un clic sur « Arrêter » termine.
- **Bouton « Arrêter » très visible** sur mobile : pleine largeur en dessous de la jauge sur petit écran (≤640 px), à droite sur grand écran. Toujours en `position: sticky` dans le bloc rouge pour ne jamais sortir du viewport.
- **Arrêt fiable** : `setRecording(false)` immédiat, `stop()` enveloppé dans try/catch, fallback qui coupe les tracks manuellement si MediaRecorder ne répond pas.
- **Aperçu miroir vidéo** pendant l'enregistrement (`scaleX(-1)`).
- **Jauge de niveau micro** affichée pour audio **et** vidéo (pas seulement audio).
- **Chronomètre + barre de progression** par rapport à la durée max.
- **Import de fichier** disponible aussi bien à vide qu'après un enregistrement (déjà en place dans `QuestionMediaEditor`).
- **Re-prise** : bouton « Refaire » qui relance l'enregistrement directement.
- **Lecture inline** du résultat (audio ou vidéo) avec contrôles natifs.
- **Suppression** avec confirmation visuelle.
- **Optionnel : libellé d'en-tête** (`label`, `description`) pour remplacer les actuels « Message vocal d'introduction » et « Vidéo de présentation ».

**3. Migration des écrans existants**

On remplace les usages :

- `IntroAudioRecorder` → `<MediaRecorderField type="audio" label="Message vocal d'introduction" ... />`
- `IntroVideoRecorder` → `<MediaRecorderField type="video" label="Vidéo de présentation" ... />`
- `QuestionMediaRecorder` → `<MediaRecorderField type={mode} ... />`

Les anciens fichiers (`IntroAudioRecorder.tsx`, `IntroVideoRecorder.tsx`, `QuestionMediaRecorder.tsx`, `VideoRecorderPanel.tsx`) sont **supprimés**.

L'upload Supabase qui était dans `IntroAudioRecorder` (mode `projectId`) est déplacé dans `StepIntro` / `IntroLibrary`, là où il a sa place — le composant d'enregistrement reste **purement UI** et expose juste `onMediaReady(blob, previewUrl)` et `onClear()`.

**4. Tests manuels après mise en place**

- Enregistrer une vidéo d'intro depuis StepIntro sur mobile → bouton Arrêter toujours visible, arrêt instantané.
- Enregistrer un audio d'intro → jauge animée, durée affichée, lecture après stop.
- Ajouter un média à une question dans le wizard → même interface qu'ailleurs.
- Importer un fichier vidéo de 50 Mo → preview correcte, sauvegarde OK.
- Refaire un enregistrement → la caméra/micro se rouvrent proprement sans rester ouvert en arrière-plan.

### Détails techniques

- Nouveau dossier `src/components/media/MediaRecorderField.tsx` (issu de `QuestionMediaEditor` enrichi).
- Props : `{ type: "audio" | "video"; existingUrl: string | null; onMediaReady: (blob, url) => void; onClear?: () => void; maxDurationSec?: number; label?: string; description?: string; }`.
- Aucune modification de schéma BDD ni d'edge function.
- Mises à jour des imports dans : `StepIntro.tsx`, `StepQuestions.tsx`, `IntroLibrary.tsx`, `QuestionFormDialog.tsx`.
- Suppression des 4 fichiers redondants listés plus haut.

### Hors champ

- Pas de modification du parcours candidat (qui a sa propre logique d'enregistrement liée à l'IA).
- Pas de changement du stockage Supabase ni des URLs publiques.
- Pas d'ajout de nouvelles fonctionnalités (pas de trim, pas de filtres, pas de retake partiel).
