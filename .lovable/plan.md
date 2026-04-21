

## Plan — Citation inspirante sur le Dashboard

Remplacer le sous-titre statique « Voici un aperçu de votre activité. » par une citation courte tirée d'une liste, qui change à chaque chargement du Dashboard.

### Comportement

- Une liste d'environ 20 citations courtes (2 lignes max) sur les thèmes du recrutement, du talent, de l'écoute et de la décision.
- À chaque montage du composant `Dashboard`, une citation est tirée au hasard.
- Affichage sous le « Bonjour {prénom} 👋 », en italique discret, avec l'auteur précédé d'un tiret cadratin.

### Exemple de rendu

```
Bonjour Marc 👋
« Le talent gagne des matchs, mais l'esprit d'équipe gagne des championnats. »
— Michael Jordan
```

### Détails techniques

**Fichier modifié** : `src/pages/Dashboard.tsx` uniquement.

- Ajout d'une constante `QUOTES` (tableau d'objets `{ text, author }`) en haut du fichier, hors composant.
- Ajout d'un `useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])` pour figer la citation pendant la session de visite de la page.
- Remplacement du `<p>` actuel par deux lignes : la citation en italique + l'auteur en plus petit et plus pâle.

### Liste de citations (sélection)

Mélange de citations sur le recrutement, le leadership, l'écoute et la décision — toutes courtes, toutes attribuées à un auteur connu (Steve Jobs, Peter Drucker, Simone Weil, Maya Angelou, Confucius, Antoine de Saint-Exupéry, Coco Chanel, Henry Ford, etc.).

### Hors champ

- Pas de stockage en base, pas d'API externe.
- Pas de bouton « nouvelle citation » (le rechargement de la page suffit).
- Pas de traduction dynamique : citations en français uniquement.

