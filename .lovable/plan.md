## Objectif

Sur la landing, garder la **photo de la candidate** dans le mockup produit du hero **par défaut**. Dès que le visiteur scrolle et que le mockup entre dans le viewport, la photo est **remplacée à la même place** par la vidéo démo 20 s (`interw-demo-20s.mp4`) en autoplay muet, avec un bouton « Activer le son ».

Pas de nouvelle page, pas de nouvelle section — on remplace uniquement le contenu du conteneur `aspect-video` existant (lignes 121-131 de `src/pages/Landing.tsx`).

## Comportement attendu

1. **Au chargement** (avant scroll) : la photo `landing-candidate-view.jpg` est affichée, comme aujourd'hui. Badge « En direct » visible.
2. **Au premier scroll qui amène le mockup à 50 % visible** : transition douce (fondu 300 ms) vers la vidéo. La vidéo démarre en `muted` + `playsInline` + `autoplay`.
3. **Pendant la lecture** : un petit bouton « Activer le son » (icône `Volume2`) apparaît en bas à droite du mockup, même style que celui déjà fait pour `TutoVideo`.
4. **Clic sur le bouton** : `video.muted = false`, le bouton disparaît.
5. **Quand la vidéo se termine** : on la laisse sur sa dernière frame (CTA « 3× moins de temps ») avec `controls` activés pour rejouer si besoin. Pas de retour à la photo.
6. **Si le visiteur quitte le viewport** : la vidéo se met en pause (économie ressources) mais ne revient pas à la photo.

## Étapes techniques

### 1. Uploader le MP4 dans `public/`

- Copier `/mnt/documents/interw-demo-20s.mp4` vers `public/demo-interwai-20s.mp4` (servi en statique par Vite, pas besoin de Storage Supabase puisque c'est un asset public et léger). Vérifier la taille : si > 5 Mo, ré-encoder avec ffmpeg en H.264 baseline + faststart pour streaming progressif.
- Garder la photo `src/assets/landing-candidate-view.jpg` comme **poster** de la vidéo (déjà importée).

### 2. Créer un composant `HeroProductMock` dans `src/pages/Landing.tsx`

Remplacer le bloc `<div className="relative aspect-video ...">` (lignes 121-131) par un composant local qui gère l'état photo → vidéo.

Logique :
- `useRef` sur le conteneur + sur la `<video>`.
- `IntersectionObserver` à 50 % de seuil → quand visible la première fois : `setShowVideo(true)`, `video.play()`.
- État `hasUnmuted` pour cacher le bouton « Activer le son » après clic.
- `onEnded` : `setEnded(true)` pour activer `controls`.
- Quand `!entry.isIntersecting` après démarrage : `video.pause()` (mais pas de reset de `showVideo`).
- Crossfade photo ↔ vidéo : les deux superposés en `absolute inset-0`, `opacity` contrôlée par `showVideo` avec `transition: opacity 300ms`.

### 3. Markup remplacé (extrait)

Conserver exactement les mêmes classes du conteneur (`relative aspect-video overflow-hidden rounded-lg` + bordure) et le badge « En direct ». Ajouter par-dessus :
- `<img>` (photo) — `opacity` 1 → 0 quand `showVideo`.
- `<video>` — `opacity` 0 → 1 quand `showVideo`, attributs : `muted defaultMuted playsInline preload="metadata" poster={candidateView}`.
- Bouton « Activer le son » en bas à droite, masqué si `!showVideo || hasUnmuted`.
- Le badge « En direct » reste affiché (cohérent avec le côté « démo en cours »).

### 4. Garder le tuto actuel intact

Ne pas toucher à la section `<TutoVideo />` (lignes 156-169) ni à son composant. Les deux vidéos coexistent : démo produit dans le hero, tuto « créer une session » plus bas.

### 5. Vérifications

- Build TypeScript OK.
- Charger la landing : photo visible avant scroll.
- Scroller jusqu'au mockup : la vidéo prend la place avec un fondu, démarre muette, bouton son visible.
- Cliquer sur le bouton : son activé, bouton disparaît.
- Laisser jouer 20 s : controls apparaissent, possibilité de rejouer.
- Sortir de l'écran puis revenir : la vidéo reste en place (pas de redémarrage forcé).
- Tester sur mobile (autoplay muet doit passer iOS/Android).

## Fichiers touchés

- `src/pages/Landing.tsx` — remplacer le bloc `aspect-video` du hero par le composant `HeroProductMock` ; ajout des refs/états/observer.
- `public/demo-interwai-20s.mp4` — nouveau fichier (copie du MP4 généré).

## Hors scope

- Pas de page `/demo`.
- Pas de modification du tuto existant.
- Pas de musique de fond ajoutée à la vidéo (le MP4 actuel est silencieux — le bouton « Activer le son » reste cohérent pour le jour où on ajoutera une piste audio, et il sera de toute façon masqué après clic).