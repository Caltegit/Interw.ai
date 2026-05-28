## Objectif

Permettre au recruteur, lors de l'enregistrement d'une vidéo (intro de session ou question au format vidéo), d'activer :

1. **Flou d'arrière-plan** (style visio)
2. **Incrustation du logo** en haut à gauche

Les deux options sont **appliquées au flux pendant l'enregistrement** : la vidéo finale stockée contient déjà le flou et le logo (rien à recomposer côté lecture/candidat).

Périmètre : uniquement le composant `src/components/media/MediaRecorderField.tsx` (utilisé par l'intro de session et par les questions vidéo côté recruteur). Aucune modification côté candidat.

## UX

Sous l'aperçu caméra, deux contrôles compacts :

- Toggle **« Flouter l'arrière-plan »**
- Toggle **« Afficher mon logo »** (désactivé si l'organisation n'a pas de `logo_url`, avec petit lien « Ajouter un logo » vers Paramètres)

Les deux toggles sont activables avant **ou** pendant l'enregistrement (effet appliqué en direct sur l'aperçu et le flux enregistré). Les préférences sont mémorisées dans `localStorage` (`media-recorder-prefs`).

Si l'import d'un fichier vidéo est utilisé à la place de l'enregistrement, les toggles n'ont aucun effet (le fichier importé est utilisé tel quel).

## Implémentation technique

### Pipeline de composition

Au lieu d'enregistrer directement `stream` :

```text
camera stream ──► <video> caché ──► segmentation (MediaPipe) ──┐
                                                                ├─► <canvas> ─► canvas.captureStream() ─► MediaRecorder
                                logo <img> ───────────────────┘
```

- Un `<canvas>` (1280×720) est dessiné dans une boucle `requestAnimationFrame`.
- À chaque frame : si flou activé, on utilise le masque de segmentation pour dessiner le sujet net + le fond flouté (via `ctx.filter = "blur(12px)"` sur la version fond). Si flou désactivé, on dessine la frame brute.
- Si logo activé, on dessine `logoImg` en haut-gauche (padding 24px, hauteur ~10% du canvas, ratio préservé).
- L'audio track originale est ajoutée au stream du canvas : `new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...stream.getAudioTracks()])`.
- `MediaRecorder` enregistre ce stream composite. Tout le reste (timer, stop, blob, preview) reste identique.

L'aperçu visible (`previewVideoRef`) bascule pour afficher le `<canvas>` quand au moins une option est active, sinon affiche le flux brut comme aujourd'hui.

### Segmentation

Utilisation de **`@mediapipe/tasks-vision`** (`ImageSegmenter` avec le modèle `selfie_segmenter.tflite`). Modèle chargé une seule fois, depuis le CDN MediaPipe officiel. Si le chargement échoue ou si `OffscreenCanvas`/WebGL n'est pas dispo :

- Le toggle « Flouter l'arrière-plan » devient indisponible avec tooltip « Non supporté par votre navigateur ».
- Le logo seul reste possible (ne nécessite pas de segmentation).

Le miroir (`transform: scaleX(-1)`) actuel est conservé : on applique le flip directement dans le canvas (`ctx.scale(-1, 1)`) pour l'aperçu ; mais **on enregistre non-miroité** (comportement standard des outils visio — le miroir n'est qu'un confort d'aperçu).

### Logo

Le composant reçoit une nouvelle prop optionnelle `logoUrl?: string | null`. Les deux points d'appel (intro de session et questions vidéo) la passent depuis `useOrganization().logo_url`. Le logo est chargé une seule fois en `HTMLImageElement` avec `crossOrigin = "anonymous"` (le bucket Supabase est public).

### Performance / sécurité

- Boucle de rendu limitée à 30 FPS.
- `captureStream(30)`, codec WebM/VP8 (déjà utilisé).
- Tous les `ImageSegmenter`, canvas et `requestAnimationFrame` sont arrêtés/libérés dans `stopAllTracks` et au `unmount`.
- Pas de changement DB ni d'edge function.

## Fichiers modifiés

- `src/components/media/MediaRecorderField.tsx` — pipeline canvas, deux toggles, prop `logoUrl`.
- `src/components/project/StepIntro.tsx` — passe `logoUrl={org.logo_url}` au `MediaRecorderField`.
- `src/components/QuestionFormDialog.tsx` — idem pour les questions de type vidéo.
- `src/pages/IntroLibrary.tsx` — idem.
- **Nouveau** : `src/lib/videoComposer.ts` — petite classe encapsulant init MediaPipe + boucle render + cleanup, pour garder `MediaRecorderField` lisible.
- `package.json` — ajout `@mediapipe/tasks-vision`.

## Hors périmètre

- Aucune modification côté enregistrement candidat (`InterviewStart.tsx`).
- Pas de stockage des préférences en base (juste `localStorage`).
- Pas d'éditeur de position/taille du logo (position fixe : haut-gauche, hauteur ~10% — comme dans le brief).
