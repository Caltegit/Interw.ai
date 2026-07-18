# Réparer les vidéos reconstruites depuis chunks (Q15 de Joel + toutes les futures)

## Problème confirmé

Sur `sessions/f456e99a…`, la question 15 (`q14.webm`) a été reconstruite par `recover-session-video` à partir de 54 chunks. Le fichier obtenu contient une piste audio Opus lisible mais une piste vidéo VP8/VP9 non décodable : le premier chunk pris comme header ne contient pas le vrai `EBML/Segment/TrackEntry` initial du `MediaRecorder`. Le navigateur affiche donc « Vidéo indisponible — lecture audio uniquement » et une durée `Infinity`.

Ce n'est pas propre à cette session : ça arrive à chaque fois qu'un candidat interrompt l'upload monolithique avant la fin et qu'on retombe sur les chunks bruts. Il faut corriger à la source, pas juste réparer une session.

## Ce qu'on fait

### 1. Ajouter une étape de remux ffmpeg dans `recover-session-video`

Après la concaténation des chunks (code actuel), au lieu d'uploader directement le blob concaténé :

- écrire le blob dans un fichier temporaire `/tmp/raw.webm`
- lancer `ffmpeg -fflags +genpts -i /tmp/raw.webm -c copy -f webm /tmp/fixed.webm`
  - `-c copy` = pas de ré-encodage, très rapide (~2-5s pour une réponse de 2min)
  - `-fflags +genpts` = régénère des timestamps propres → fixe la duration `Infinity`
  - ffmpeg reconstruit un header EBML cohérent à partir des paquets trouvés
- si `ffmpeg` échoue avec « no video stream found » ou similaire, deuxième passe : `ffmpeg -i /tmp/raw.webm -c:v libvpx -b:v 1M -c:a copy /tmp/fixed.webm` (ré-encodage vidéo)
- si les deux échouent, garder le comportement actuel (upload du blob concaténé) et logger un warning
- uploader `/tmp/fixed.webm` à la place du blob brut sur `q{n}.webm`

**Contrainte edge function** : Deno Deploy n'a pas ffmpeg natif. Deux options :
- **A.** Utiliser `ffmpeg.wasm` (npm `@ffmpeg/ffmpeg`) chargé dans l'edge function. Plus lourd à cold-start (~200-400ms) mais 100% Deno-compatible.
- **B.** Utiliser un binaire ffmpeg statique embarqué via `Deno.Command`. Plus rapide mais nécessite de packager le binaire dans la fonction.

Je pars sur **A** (ffmpeg.wasm) : déjà utilisé côté client dans `public/ffmpeg/ffmpeg-core.js`, moins d'inconnues.

### 2. Bouton « Réparer la vidéo » côté UI

Le bouton existe déjà dans le player (visible sur ton screenshot). Vérifier qu'il rappelle bien `recover-session-video` avec un flag `force_remux=true` pour retraiter le fichier existant, et pas seulement les cas où `q{n}.webm` est absent. Aujourd'hui il ne fait rien si le fichier existe déjà.

### 3. Nettoyer l'UI quand la vidéo est vraiment cassée

Sur le screenshot on voit se superposer :
- gros bouton Play central
- boutons ±10s en haut
- sélecteur de vitesse 1× 1.5× 2×
- bandeau « Vidéo indisponible — lecture audio uniquement »
- boutons « Réessayer / Réparer la vidéo »
- timecode aberrant `277777746:40`

Quand `video.videoWidth === 0` après `loadedmetadata` (= pas de piste vidéo décodable), masquer : le gros Play central, les ±10s, le sélecteur de vitesse, le download MP4 (impossible sans vidéo). Ne garder que la barre audio native et le bandeau + boutons de réparation. Cacher aussi la duration si elle est `Infinity`.

### 4. Réparer la session de Joel

Une fois le remux déployé, cliquer sur « Réparer la vidéo » sur Q15 de la session `f456e99a…` re-génère un `q14.webm` propre.

Pour Q13 (transcription corrompue `{"segments":[{"`), c'est un autre problème (bug transcription, pas vidéo). Je propose de traiter séparément si tu veux — dis-le-moi.

## Fichiers modifiés

- `supabase/functions/recover-session-video/index.ts` — ajout étape remux ffmpeg.wasm + support `force_remux`
- `src/components/session/SessionClipPlayer.tsx` — masquer contrôles vidéo quand pas de piste vidéo décodable, masquer duration `Infinity`
- Éventuellement `src/components/session/SessionVideoNavigator.tsx` selon où sont câblés les boutons « Réessayer / Réparer »

## Hors scope

- Le bug de transcription Q13 (JSON tronqué) — à faire séparément
- Empêcher en amont les uploads monolithiques ratés (nécessite retravailler le pipeline candidat, gros chantier)
