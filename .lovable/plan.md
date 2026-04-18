

## Fix: dialog "Nouvelle intro vidéo" — bouton Sauvegarder inaccessible

### Problème
Dans `/library/intros` → "Nouvelle intro" → type Vidéo → "Enregistrer" : la preview vidéo de `IntroVideoRecorder` fait `min-height: 240px` + le contenu du dialog déborde de l'écran (viewport 921×656). Le footer avec "Sauvegarder" passe sous le pli et n'est pas atteignable car le `DialogContent` n'a ni hauteur max ni scroll interne.

### Correctifs

**1. `src/components/project/IntroVideoRecorder.tsx`**
- Réduire la preview d'enregistrement : retirer `min-height: 240px`, passer de `max-w-md` à `max-w-xs` (≈ moitié plus petit) et ajouter `max-h-[200px] object-cover` pour borner la hauteur.
- Appliquer la même contrainte à la vidéo de relecture (après enregistrement) pour cohérence.

**2. `src/pages/IntroLibrary.tsx` — DialogContent**
- Ajouter `max-h-[90vh] flex flex-col` sur le `DialogContent`.
- Wrapper la zone de contenu (au-dessus du `DialogFooter`) dans un `<div className="flex-1 overflow-y-auto">` pour que le footer reste toujours visible et collé en bas, même quand l'enregistrement vidéo est en cours.

### Résultat attendu
- Preview vidéo 2× plus petite pendant l'enregistrement.
- Le bouton "Sauvegarder" reste toujours visible en bas du dialog, quelle que soit la hauteur du contenu.
- Aucun changement fonctionnel (enregistrement, upload, sauvegarde inchangés).

