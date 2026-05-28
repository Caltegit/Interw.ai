### Problème

Le flou d'arrière-plan découpe mal les cheveux : le contour est dur, dentelé, et des mèches disparaissent. Cela vient de deux choix dans `src/lib/videoComposer.ts` :

1. Le masque est **binaire** (seuil à 0.5 → alpha 0 ou 255), ce qui crée un bord net et "escalier".
2. Le modèle utilisé est `selfie_segmenter` (rapide, mais peu précis sur les cheveux). MediaPipe propose `selfie_multiclass_256x256.tflite` qui sépare explicitement *hair / body-skin / face-skin / background* et donne des bords beaucoup plus fins.

### Solution

**1. Passer au modèle multi-classes "selfie multiclass"**
- Remplacer l'URL du modèle par `selfie_multiclass_256x256.tflite`.
- Activer `outputCategoryMask: true` ET `outputConfidenceMasks: true`.
- Considérer comme "premier plan" toutes les classes ≠ background (0) : hair, body-skin, face-skin, clothes, accessories. → les cheveux sont enfin inclus de façon nette.

**2. Masque à alpha doux (feathering) au lieu d'un seuil dur**
- Construire le masque à partir de la **probabilité** (0–1) plutôt que d'un seuil booléen :
  - alpha = clamp((p − 0.35) / (0.65 − 0.35)) × 255 → transition douce sur ~30 % de plage.
- Appliquer un léger **flou gaussien sur le masque lui-même** (`maskCtx.filter = "blur(2px)"` lors du `drawImage` du masque sur la frame finale) pour lisser les contours de cheveux fins.

**3. Upscaler le masque proprement**
- Le masque MediaPipe fait 256×256. Le redimensionner en 1280×720 avec `imageSmoothingEnabled = true` et `imageSmoothingQuality = "high"` (au lieu du défaut) avant le composite — réduit l'effet escalier.

**4. Garder un fallback**
- Si le modèle multi-classes échoue à charger (réseau, GPU), retomber automatiquement sur l'ancien `selfie_segmenter`. Le flou continue de fonctionner.

### Détails techniques (`src/lib/videoComposer.ts`)

- `loadSegmenter()` : nouvelle URL + `outputCategoryMask: true`. Try/catch interne pour fallback.
- `renderFrame()` :
  - Récupérer `result.categoryMask` (Uint8) ; foreground = pixel ≠ 0.
  - Si on a aussi un `confidenceMask`, l'utiliser pour le feathering ; sinon utiliser la category mask seule.
  - Remplacer la boucle qui écrit `alpha = p > 0.5 ? 255 : 0` par la rampe douce ci-dessus.
  - Activer `imageSmoothingQuality = "high"` sur le contexte temporaire avant le composite.
  - Ajouter un `filter = "blur(2px)"` au moment de `tctx.drawImage(this.maskCanvas, ...)` puis le réinitialiser.

### Hors périmètre

- Pas de nouveau réglage UI (le slider d'intensité existant reste tel quel).
- Pas de changement côté candidat ni en base.
- Pas de WebGL custom : on reste sur l'API Canvas 2D.
