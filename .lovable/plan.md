## Problème

Aujourd'hui la popup "Recadrer la photo" (utilisée pour l'avatar du recruteur **et** l'avatar par question) recadre l'image **au format carré 1:1 (512×512)**.

Mais pendant l'entretien, côté candidat, la photo est affichée dans une zone **16:9** (`aspect-video`) en `object-cover`. Conséquence : le haut et le bas du carré sont coupés → la photo est mal cadrée pendant la session.

## Solution

Aligner la zone de recadrage **et** l'export de la popup sur le format réellement affiché pendant la question : **16:9 paysage**.

### Changements dans `src/components/project/AvatarUploadDialog.tsx`

1. **Cropper en 16:9**
   - `aspect={1}` → `aspect={16/9}`
   - Garder `cropShape="rect"`

2. **Export en 16:9**
   - Constantes : remplacer `OUTPUT_SIZE = 512` par `OUTPUT_W = 1280`, `OUTPUT_H = 720` (HD 16:9, qualité conservée).
   - Mettre à jour `getCroppedImage` pour produire un canvas `1280×720` au lieu de `512×512`.
   - Mettre à jour le texte de description : « L'image sera exportée en 1280×720 (16:9). »

3. **Aperçu "Vue pendant l'entretien"**
   - Remplacer `aspect-square` + `rounded-3xl` par `aspect-video` + `rounded-2xl` pour refléter exactement le rendu candidat.
   - Garder `object-contain` (l'image exportée est déjà en 16:9, donc remplira la zone).

4. **Aperçu "Miniature page d'accueil"** (rond, 1:1, `object-cover object-top`)
   - Conservé tel quel : la miniature ronde de la landing page utilise `object-cover object-top`, donc une image 16:9 bien cadrée affichera correctement le visage en haut.
   - Aucun changement nécessaire ici.

### Pas de changement nécessaire ailleurs

- `InterviewStart.tsx` : continue d'utiliser `aspect-video` + `object-cover` → l'image 16:9 s'affichera parfaitement, sans crop.
- `InterviewLanding.tsx` : la mini ronde avec `object-top` fonctionne avec une image 16:9 (le visage doit être cadré dans le tiers supérieur, ce qui est naturel).
- `AvatarPicker.tsx` : les vignettes presets restent rondes ; les images 16:9 uploadées y apparaîtront en `object-cover` (centrées) — acceptable comme vignette de sélection.
- Pas de migration BDD : le champ `avatar_image_url` reste un simple URL, seul le format de l'image change.

### Compatibilité avec les anciennes photos

Les avatars carrés déjà uploadés continuent de fonctionner (affichés en `object-cover` dans le 16:9 → crop vertical comme aujourd'hui). Pour corriger une ancienne photo, il suffit de la re-uploader via la popup mise à jour.

## Fichiers modifiés

- `src/components/project/AvatarUploadDialog.tsx` (seul fichier à toucher)
