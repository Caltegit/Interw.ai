## Diagnostic

La session de Stéphanie Goldité (id `8cbd5ba7-2a4a-4d21-afcd-ff58d188972a`) a ses 8 fichiers vidéo stockés avec l'extension `.webm` et servis par Supabase Storage avec `Content-Type: video/webm`.

Mais quand on télécharge `q0.webm` et qu'on l'inspecte avec `ffprobe`, le conteneur réel est **MP4** (H.264 + AAC) :

```
format_name = mov,mp4,m4a,3gp,3g2,mj2
codec_name  = h264 / aac
```

Autrement dit, le fichier est un MP4 déguisé en WebM. Sur Chromium ça passe parfois en force, mais le `<video>` refuse souvent de décoder, et sur Safari/Firefox la lecture échoue silencieusement. C'est ce qui se passe sur ce rapport.

La cause amont : la candidate a passé l'entretien sur un navigateur (très probablement Safari iOS/macOS) où `MediaRecorder` ne sait pas produire de WebM et retombe sur du MP4, mais notre code d'upload garde quand même l'extension `.webm` et le `contentType: "video/webm"`.

## Plan

### 1. Réparer la session de Stéphanie (correctif immédiat)

Créer une edge function `repair-session-media` qui :

- Pour chaque `session_messages.video_segment_url` et `audio_segment_url` de la session ciblée :
  - télécharge les 16 premiers octets et détecte la signature (`ftyp` à l'offset 4 → MP4 ; `1A 45 DF A3` → WebM)
  - si la signature ne correspond pas à l'extension :
    - réuploade le fichier sous le même chemin avec `contentType` correct (`video/mp4` ou `audio/mp4`)
    - duplique aussi le fichier sous la bonne extension (`q0.mp4`) pour les navigateurs qui se fient à l'URL
    - met à jour `video_segment_url` / `audio_segment_url` en base vers la version `.mp4`
- Met aussi à jour `sessions.video_recording_url`

Lancer cette fonction une fois sur `session_id = 8cbd5ba7-2a4a-4d21-afcd-ff58d188972a` pour débloquer la lecture du rapport.

### 2. Corriger l'enregistrement (correctif durable)

Dans le code d'upload des segments d'entretien (côté `InterviewStart` / hook MediaRecorder), au lieu de forcer `.webm` :

- lire `mediaRecorder.mimeType` réel après instanciation
- dériver l'extension (`webm` / `mp4`) et le `contentType` à partir de cette valeur
- construire le chemin de stockage avec la bonne extension
- enregistrer cette URL exacte dans `session_messages`

Comme ça les futures sessions Safari arrivent directement en `.mp4` propre et lisibles partout.

### 3. Garde-fou côté lecteur

Dans `SessionVideoNavigator` (et `HighlightReelPlayer`), ne pas hardcoder l'attribut `type` du `<video>` ; laisser le navigateur sniffer, ce qui rend le lecteur robuste si un fichier mal taggué passe encore en prod.

### Détails techniques

- La détection MP4 vs WebM se fait sur la signature binaire, pas sur l'extension ni le `Content-Type` du storage (qui est justement faux).
- Le réupload via l'API Storage avec `upsert: true` et `contentType` correct écrase le metadata HTTP servi par le CDN.
- L'edge function est idempotente : si la signature correspond déjà à l'extension, elle ne touche à rien.
- On garde l'ancien fichier `.webm` en place pour ne pas casser d'éventuels partages déjà émis ; on ajoute juste le doublon `.mp4` et on bascule les URLs en base.
