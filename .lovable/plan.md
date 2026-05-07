## Améliorations cartouche vidéo (SessionVideoNavigator)

### 1. Vitesse sans retour au début

Dans l'effet qui réagit au changement de `index/rate/shouldAutoPlay`, le `currentTime = 0` est appliqué à chaque exécution. Conséquence : changer `rate` rejoue depuis le début.

**Fix** : séparer en deux effets :
- Effet A — dépend uniquement de `[index]` : reset `currentTime = 0`, applique le `rate` courant, autoplay si demandé.
- Effet B — dépend uniquement de `[rate]` : se contente de mettre `videoRef.current.playbackRate = rate` (déjà présent, à conserver). Aucun reset de position.

### 2. Durée affichée à côté du libellé

Pas de durée stockée en base — on la lit depuis la vidéo via l'événement `loadedmetadata`.

- Ajouter un état local `durationSec: number | null`.
- Sur `loadedmetadata` du `<video>`, faire `setDurationSec(v.duration)` (réinitialiser à `null` lors du changement de clip via `key={current.url}` déjà présent + reset au début de l'effet A).
- Helper `formatMinutes(s)` → `"3.22min"` (format `M.SSmin`, secondes sur 2 chiffres comme dans la maquette).
- Affichage : `{current.questionLabel}{durationSec ? ` - ${formatMinutes(durationSec)}` : ""}`.

### Fichier modifié

- `src/components/session/SessionVideoNavigator.tsx`
