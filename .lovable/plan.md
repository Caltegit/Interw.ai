## Cartouche vidéo (vue Tableau / `SessionCard`)

Fichier : `src/components/project/SessionCard.tsx`

### Schéma proposé

```text
┌──────────────────────────────────────────┐
│ Sarah De Oliveira              ┌──────┐ │
│ deoliveirasarah77@gmail.com    │  62  │ │
│ [Mitigé]                       │NOTE IA│ │
│                                └──────┘ │
├──────────────────────────────────────────┤
│           [ VIDÉO + contrôles ]          │
├──────────────────────────────────────────┤
│ Question 2 / 15                          │  ← remplace "Q2"
│ Parlons un peu de votre parcours pro…    │
├──────────────────────────────────────────┤
│ < Précédent  [1×][1.5×][2×]  Suivant >  │  ← vitesse au centre
├──────────────────────────────────────────┤
│ [✓ Retenu] [? À discuter] [✗ Non]        │
└──────────────────────────────────────────┘
```

### Changements

1. **Ligne titre question** : remplacer `Q{qOrder}` par `Question {index+1} / {clips.length}`. La pastille « Relance » reste à côté si applicable.
2. **Barre nav** : remplacer le compteur central `{index+1} / {clips.length}` par 3 boutons de vitesse `1×` / `1.5×` / `2×` (le bouton actif en variant `default`, les autres en `outline`, taille `h-7 px-2 text-xs`).
3. **Logique vitesse** : ajouter un état `rate` (défaut 1) + `useEffect` qui applique `videoRef.current.playbackRate = rate` à chaque changement de `rate` ou de clip.

Aucun autre changement (header, vidéo, décision intacts).
