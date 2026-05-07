## Objectif

Permettre des réponses candidat jusqu'à 10 min (et confortablement au-delà) sans jamais dépasser la limite de 18 Mo du Lovable AI Gateway, et sans dépendre de GCP.

## Principe

Aujourd'hui, on envoie la vidéo WebM complète à l'IA pour transcription. Une vidéo de 10 min pèse ~60 Mo → erreur `too_large`.

On va enregistrer **deux flux en parallèle côté candidat** :
- **Vidéo** (inchangée) pour la relecture RH dans le rapport
- **Audio seul** en Opus mono 24 kbps → ~180 Ko/min → **10 min ≈ 2 Mo**

La transcription utilisera l'audio (déjà prioritaire dans `transcribe-session` depuis le rattrapage ALBO). La vidéo sert uniquement à l'affichage.

## Étapes

### 1. Double enregistrement côté candidat (`src/pages/InterviewStart.tsx`)

- À l'ouverture du flux caméra/micro, créer **deux `MediaRecorder`** sur le même `MediaStream` :
  - `videoRecorder` : configuration actuelle (vidéo + audio combinés)
  - `audioRecorder` : nouveau, sur un `MediaStream` filtré sur les pistes audio uniquement, en `audio/webm;codecs=opus` à 24 kbps mono
- Démarrer/arrêter/`requestData()` les deux recorders en parallèle aux mêmes moments (par question)
- Stocker les chunks audio en parallèle des chunks vidéo

### 2. Upload des deux fichiers par segment

- Chaque segment de réponse uploade :
  - `video_segment_url` (existant)
  - `audio_segment_url` (nouveau, déjà supporté par le schéma DB depuis le rattrapage ALBO)
- Même bucket `interview-segments`, suffixe `.audio.webm`

### 3. Indicateur visuel léger pendant l'enregistrement

- Aucun changement d'UX visible pour le candidat
- Juste un log console de debug pour vérifier la taille des deux flux

### 4. Vérifications

- Tester un enregistrement de 10 min en preview
- Vérifier que `audio_segment_url` est rempli en DB
- Vérifier que `transcribe-session` consomme bien l'audio (déjà le cas)
- Vérifier qu'aucun segment ne passe en `too_large`

## Hors scope

- Chunking serveur (`ffmpeg` côté edge) — pas nécessaire à 10 min
- Compression audio plus agressive (16 kbps) — 24 kbps suffit largement
- Modification de `transcribe-session` ou `generate-report` — déjà compatibles
- Modification du lecteur vidéo RH — la vidéo est inchangée

## Détails techniques

**Filtrage audio du MediaStream :**
```ts
const audioStream = new MediaStream(streamRef.current.getAudioTracks());
const audioRecorder = new MediaRecorder(audioStream, {
  mimeType: "audio/webm;codecs=opus",
  audioBitsPerSecond: 24_000,
});
```

**Tailles attendues :**
| Durée | Vidéo (actuel) | Audio (nouveau) |
|-------|---------------|-----------------|
| 3 min | ~18 Mo (limite) | ~540 Ko |
| 10 min | ~60 Mo (KO) | ~1.8 Mo (OK) |
| 30 min | ~180 Mo (KO) | ~5.4 Mo (OK) |

**Compatibilité navigateurs :** `audio/webm;codecs=opus` est supporté par Chrome/Edge/Firefox. Sur Safari, fallback sur `audio/mp4` (à détecter via `MediaRecorder.isTypeSupported`).

**Aucune migration DB** : les colonnes `audio_segment_url` existent déjà (ajoutées lors du rattrapage ALBO).
