

## Aperçu du recadrage : montrer ce que voit vraiment le candidat

### Le problème

Le cropper actuel affiche un masque **circulaire** et un mini-aperçu en bulle de chat. Or, pendant l'entretien, le candidat voit l'avatar dans un **grand rectangle aux coins arrondis** (`rounded-3xl`, ~carré, `object-contain`) avec un halo lumineux quand l'IA parle. Le rond n'apparaît qu'en miniature sur l'écran d'accueil.

L'aperçu actuel induit donc en erreur : on cadre serré pour un rond, mais le rendu final est un rectangle qui montre toute l'image.

### Ce que je change

**Dans `src/components/project/AvatarUploadDialog.tsx` :**

1. **Masque du cropper** : passer `cropShape="round"` → `cropShape="rect"` et garder `aspect={1}` (l'export reste 512×512 carré, parfait pour le `object-contain` du rectangle candidat). Ajouter `showGrid={true}` pour aider au cadrage.

2. **Aperçu candidat refait** : remplacer la bulle de chat + vignette ronde par **une seule grande tuile** qui réplique fidèlement le rendu d'entretien :
   - Conteneur carré `rounded-3xl` avec ring et ombre comme dans `InterviewStart`
   - Image en `object-contain` sur fond `bg-muted/30` (identique au vrai rendu)
   - Badge `{nom} — IA` en haut à gauche, comme à l'écran
   - Légende sous l'aperçu : « Vue pendant l'entretien »
   - Petit aperçu rond secondaire de 40 px à côté avec légende « Miniature page d'accueil » pour ne pas oublier l'autre cas d'usage

3. **Layout** : aperçu à droite du cropper, taille ~200 px, pour rester lisible sans déborder.

### Ce qui ne change pas

- Export final toujours en JPEG 512×512 (compatible avec les deux contextes d'affichage).
- API du composant, drag & drop, paste, zoom, rotation, validations d'erreur.
- `AvatarPicker` et le flux d'upload.

### À propos de l'erreur de build

La dernière édition a probablement laissé un import inutilisé (`ImageIcon`) ou un fragment JSX cassé. Je nettoie en réécrivant la section aperçu d'un bloc et en retirant les imports devenus inutiles.

