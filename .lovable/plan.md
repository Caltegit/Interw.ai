## Vidéo d'introduction candidat plus haut sur l'écran

Fichier : `src/pages/InterviewLanding.tsx` (ligne 288)

### Constat
`CandidateLayout` utilise `<main className="flex-1 flex items-center justify-center …">` : tout le contenu est centré verticalement. Pour le cas vidéo, la lecture se retrouve trop bas, surtout sur mobile.

### Changement
Sur l'écran d'intro (`showIntroMedia`), uniquement quand `introMediaType === "video"`, ajouter `self-start mt-4 sm:mt-6` au conteneur racine pour aligner le bloc en haut du `<main>` plutôt qu'au centre.

```tsx
<div className={`${introMediaType === "video"
  ? "max-w-2xl self-start mt-4 sm:mt-6"
  : "max-w-md"} w-full animate-fade-in space-y-3`}>
```

Réduire aussi le padding vertical de la `Card` interne pour le cas vidéo (`py-8` → `py-5`) pour gagner encore un peu de hauteur.

### Hors scope
Pas de modification audio / texte / TTS, ni du layout global.