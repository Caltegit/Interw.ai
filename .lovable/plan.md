## Objectif

Agrandir de 10% la taille d'affichage de l'avatar IA côté candidat pendant l'entretien (questions Texte et Audio).

## Modification

Fichier : `src/pages/InterviewStart.tsx` (ligne 2776)

Le conteneur de l'avatar utilise actuellement :
- `max-w-[420px]` sur mobile
- `sm:max-w-[680px]` sur desktop

Passer à :
- `max-w-[462px]` sur mobile (+10%)
- `sm:max-w-[748px]` sur desktop (+10%)

Le ratio 16:9 (`aspect-video`) est conservé, donc la photo s'agrandit proportionnellement sans déformation. Les questions Vidéo ne sont pas concernées (autre branche du rendu).

## Détails techniques

```tsx
// Avant
<div className="relative w-full max-w-[420px] sm:max-w-[680px] aspect-video mx-auto">

// Après
<div className="relative w-full max-w-[462px] sm:max-w-[748px] aspect-video mx-auto">
```
