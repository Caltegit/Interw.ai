## Objectif

Ajouter un gros bouton Play/Pause central superposé sur la vidéo, deux fois plus grand que le bouton natif, sans remplacer les contrôles natifs (timeline, volume, plein écran restent).

## Approche

Dans `src/components/session/SessionVideoNavigator.tsx` :

1. Ajouter un état local `isPlaying` synchronisé avec les évènements `play` / `pause` / `ended` de l'élément `<video>`.
2. Superposer un bouton circulaire centré sur la zone vidéo (mode non-compact uniquement) :
   - Taille ~80 px (≈ 2× la taille du bouton play natif)
   - Fond `bg-black/50` semi-transparent, icône blanche `Play` ou `Pause` (lucide-react)
   - Visible en permanence quand la vidéo est en pause ; en lecture, masqué automatiquement après ~1,5 s d'inactivité souris, réapparaît au survol (comme YouTube)
   - `pointer-events-auto` ; au clic : toggle play/pause via `safePlay()` / `pauseOnly()`
3. Garder les contrôles natifs (`controls`) pour timeline / volume / fullscreen.
4. Ne pas afficher en mode `compact` (mini-lecteur de la barre fixe) ni en mode `hideDownload` n'a pas d'impact ici.

## Détails techniques

- Utiliser un `useState` + `useEffect` qui attache `play` / `pause` / `ended` sur `videoRef.current` (re-attaché quand `current.url` change via `key`).
- Pour l'auto-masquage : `useState` `controlsVisible`, timer `setTimeout` réinitialisé sur `mousemove` du conteneur vidéo.
- Pas de modification de la logique existante (autoplay, seek, vitesse, fixDuration).

## Fichiers modifiés

- `src/components/session/SessionVideoNavigator.tsx`
