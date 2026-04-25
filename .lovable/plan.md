## Modifications dans `src/pages/Landing.tsx` — composant `TutoVideo`

1. **Autoplay muet au scroll** (déjà prévu) :
   - `IntersectionObserver` (seuil ~50%) déclenche `play()` sur la vidéo avec `muted=true`.
   - Pause automatique quand la vidéo sort du viewport.

2. **Bouton « Activer le son »** :
   - State `isMuted` (initialisé à `true`).
   - Tant que `isMuted` est vrai ET que la vidéo joue → afficher un bouton overlay en haut à droite (ou centre-bas) avec icône `Volume2` + libellé « Activer le son ».
   - Clic → `video.muted = false`, `setIsMuted(false)`, le bouton disparaît.
   - Le bouton Play central existant disparaît dès que la lecture démarre (auto ou manuel).

3. **Contrôles natifs** :
   - Activés dès que la vidéo joue, pour permettre pause/seek/volume manuel.

4. **Conformité navigateurs** :
   - `muted` + `defaultMuted` + `playsInline` sur le `<video>` pour garantir l'autoplay sur iOS/Safari.

Aucun changement hors de `TutoVideo`. Pas de dépendance ajoutée.