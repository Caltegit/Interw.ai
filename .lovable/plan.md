## Amélioration du composant `MediaRecorderField` (vidéo)

Ce composant est utilisé partout (intro, pop-up création de question, bibliothèque). Une seule modification couvre les 3 endroits.

### Comportement actuel

Phase vide → bouton « Enregistrer » → permission caméra → enregistrement direct. L'utilisateur ne voit pas le retour vidéo avant d'avoir lancé l'enregistrement.

### Nouveau comportement (vidéo uniquement)

Ajout d'une nouvelle phase **« preview caméra »** entre le vide et l'enregistrement :

1. **Au montage du composant**, si `type === "video"` et qu'aucune vidéo n'existe : demander immédiatement `getUserMedia({audio,video})` et brancher le flux sur le `<video>` de prévisualisation (effet miroir comme aujourd'hui). L'utilisateur voit son flux caméra.
2. **Bouton à droite de la vidéo** (panneau latéral aligné à droite) :
   - État repos : gros bouton vert « **Démarrer** » (icône cercle plein).
   - État enregistrement : gros bouton rouge « **Arrêter** » (icône carré).
   - Sous le bouton, petite note grise : « *Astuce : barre d'espace pour démarrer / arrêter* ».
3. **Raccourci clavier** : écouteur global `keydown` (uniquement quand le composant est en phase preview/enregistrement et que la cible n'est pas un `input`/`textarea`) sur la barre d'espace → toggle démarrer/arrêter. `e.preventDefault()` pour éviter le scroll.
4. **À l'arrêt**, on continue d'afficher le flux jusqu'à la finalisation du blob, puis on bascule sur la phase « preview du résultat » comme aujourd'hui.
5. **« Refaire »** depuis le résultat : on revient sur la phase preview caméra (et non plus directement enregistrement) — l'utilisateur appuie sur Démarrer ou espace.
6. **Démontage** : on coupe les tracks (déjà le cas dans le cleanup actuel).
7. **Audio** : aucun changement (pas de retour vidéo possible).

### Layout proposé (vidéo)

```text
┌─────────────────────────────┬──────────────┐
│                             │  ● Démarrer  │
│      <video preview>        │              │
│      (mirror, live)         │  Astuce :    │
│                             │  espace pour │
│                             │  démarrer/   │
│                             │  arrêter     │
└─────────────────────────────┴──────────────┘
[ Importer un fichier ]            (en bas)
```

Pendant l'enregistrement, le bouton devient rouge « Arrêter », chrono + jauge micro affichés sous la vidéo (déjà présents).

### Fichier modifié

- `src/components/media/MediaRecorderField.tsx`

Aucun changement dans les composants appelants — la nouvelle UX se déclenche dès qu'on monte un `MediaRecorderField type="video"` sans média existant.
