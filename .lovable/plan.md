## Changement

Dans `src/components/session/CommunicationProfileCard.tsx` (ligne 86), remplacer l'affichage `{dim.score}/10` par `{dim.score * 10}%` pour aligner avec le reste du rapport (Big Five, Motivation, etc. qui affichent /100 ou %).

La barre de progression ne change pas (déjà calculée en pourcentage).

## Détails techniques

```tsx
// Avant
<span className="font-medium tabular-nums">{dim!.score}/10</span>

// Après
<span className="font-medium tabular-nums">{dim!.score * 10}%</span>
```

Aucun autre fichier à modifier. Pas d'impact backend.
