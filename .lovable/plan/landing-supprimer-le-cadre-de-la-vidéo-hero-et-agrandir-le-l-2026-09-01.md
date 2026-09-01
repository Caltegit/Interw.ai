# Landing : supprimer le cadre de la vidéo hero et agrandir le lecteur

## Objectif

Enlever le cadre visuel (ombre + coins arrondis) derrière la vidéo de la landing, et agrandir la vidéo (notamment en mobile), tout en garantissant qu'elle ne chevauche jamais le bloc du haut (titre/CTA) ni le bloc du bas (section logos/preuve), quel que soit le breakpoint.

## État actuel

Dans `src/pages/Landing.tsx`, la vidéo est enveloppée d'un conteneur avec un cadre décoratif :

```text
section (max-w-6xl, px-4, pb-6)
  └── div (aspect-video, max-w-[1120px], rounded-xl, shadow-2xl)
        └── <DemoVideo />
```

Ce `rounded-xl shadow-2xl` crée l'effet de cadre qui réduit l'espace utile autour de la vidéo et la fait paraître plus petite, surtout en mobile.

## Correctif

1. Supprimer le cadre décoratif sur le conteneur de la vidéo :
   - retirer `rounded-xl`
   - retirer `shadow-2xl`
   - conserver `overflow-hidden` si nécessaire pour le `aspect-video`, ou le supprimer si la vidéo gère elle-même ses bords
2. Augmenter la largeur utile :
   - passer `max-w-[1120px]` à une valeur plus large (par exemple `max-w-7xl` / `max-w-[1280px]`)
   - conserver `aspect-video` pour ne pas déformer le média
3. Maintenir les espacements verticaux entre les sections :
   - vérifier que le `pb` du conteneur vidéo + le `pt`/`py` de la section preuve laissent un espace lisible
   - s'assurer que le titre/CTA du hero conserve son propre padding et ne vient pas coller la vidéo en mobile
4. Conserver le centrage horizontal et le responsive (`px-4 sm:px-6 md:px-8`).

## Fichier concerné

- `src/pages/Landing.tsx` (lignes 320-324)

## Vérification

- Capture desktop (≥1280 px) : la vidéo occupe toute la largeur max autorisée, pas de cadre, pas de chevauchement avec le hero ni avec la section logos.
- Capture mobile (≤375-414 px) : la vidéo est plus grande qu'avant, les CTA du hero restent lisibles au-dessus, la section logos reste visible en dessous sans chevauchement.
- Aucune régression sur `DemoVideo` (lecture, poster, autoplay).
