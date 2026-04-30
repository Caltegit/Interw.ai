## Objectif

Sur mobile, masquer le texte « ou appuyer sur la barre d'espace du clavier » sous le bouton micro pendant la session candidat (il n'y a pas de clavier physique sur mobile).

## Modification

Fichier : `src/pages/InterviewStart.tsx` (ligne 3018)

Ajouter `hidden sm:block` au paragraphe pour qu'il soit visible uniquement à partir du breakpoint tablette/desktop.

```tsx
// Avant
<p className="text-xs text-center" style={{ color: "hsl(var(--l-fg) / 0.5)" }}>
  ou appuyer sur la barre d'espace du clavier
</p>

// Après
<p className="hidden sm:block text-xs text-center" style={{ color: "hsl(var(--l-fg) / 0.5)" }}>
  ou appuyer sur la barre d'espace du clavier
</p>
```
