## Capturer la photo du candidat depuis le flux caméra en direct + cadrage visage

### Constat

Aujourd'hui, la miniature est extraite **a posteriori** depuis le `.webm` enregistré (`extractVideoThumbnail`, l. 88-145 de `src/pages/InterviewStart.tsx`). Cette méthode renvoie souvent un frame noir (Safari/iOS, codecs VP8/VP9, seek qui échoue) → grand nombre de cercles noirs dans la liste.

De plus, même quand un frame est récupéré, le recadrage est un simple carré centré : le visage est souvent décentré ou trop petit selon la position de la webcam.

### Solution

1. **Capturer une photo en direct** depuis la `MediaStream` de la caméra (`streamRef.current`), au moment où la caméra est réchauffée et le candidat cadré.
2. **Détecter le visage** pour zoomer dessus et produire des vignettes uniformes.

### Implémentation

**1. Nouveau helper `captureStreamSnapshot(stream)` dans `src/pages/InterviewStart.tsx`**

- Crée un `<video>` détaché, `srcObject = stream`, `muted`, `playsInline`.
- Attend `loadeddata` puis 2 frames (`requestVideoFrameCallback`, fallback `setTimeout 250 ms`) pour éviter un frame noir.
- Détection visage via l'API native **`FaceDetector`** (Chrome/Edge desktop & Android) si disponible :
  - Si visage détecté → recadrage carré centré sur le visage, agrandi de **×1,8** autour de la bounding box pour inclure tête + épaules, clampé aux bords du frame.
  - Sinon → fallback heuristique : carré centré horizontalement, **décalé vers le haut** (centre Y = 38% de la hauteur, taille = `min(w, h) × 0.75`) — bien plus représentatif d'un buste face caméra que le centre géométrique.
- Dessine sur un canvas **320×320** (légèrement plus grand qu'avant pour le retina).
- Renvoie un `Blob` JPEG (qualité 0.85).
- Libère le `<video>` ensuite (`srcObject = null`).

**2. Déclenchement**

- Une seule capture par session, gardée par `thumbnailCapturedRef = useRef(false)`.
- Déclenchée à la **fin de la première réponse candidat** (bloc `persistCandidatePromise`, l. 2037-2104), avant l'upload vidéo : caméra active depuis plusieurs secondes, candidat cadré et regardant l'écran.
- Upload vers `media/interviews/{sessionId}/thumbnail.jpg` (`upsert: true`), persistance dans `sessions.thumbnail_url` via le patch déjà en place (l. 2086-2092).

**3. Repli (fallback)**

- Si `captureStreamSnapshot` échoue (stream perdu, permission révoquée), on conserve l'extraction depuis la vidéo (`extractVideoThumbnail`) en secours.
- Ordre : live snapshot d'abord, puis extraction vidéo si la live a échoué.
- L'extraction vidéo bénéficie aussi du cadrage haut (38% Y) pour rester cohérente.

**4. Hors périmètre**

- Pas de migration BDD (colonne `thumbnail_url` déjà présente).
- Pas de modification de `SessionVideoThumb` ni de la liste candidats.
- Pas de regénération des miniatures existantes (anciennes sessions noires restent telles quelles).
- Pas d'edge function : la détection visage tourne côté client uniquement.

### Note technique sur `FaceDetector`

API native dispo sur Chrome/Edge (desktop + Android). Sur Safari/Firefox, le fallback heuristique (carré centré décalé en haut) prend le relais — c'est suffisant car les candidats se positionnent quasi systématiquement face caméra.