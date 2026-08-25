# Cacher « Tuto » dans la sidebar

## Objectif
Masquer l'entrée « Tuto » de la sidebar sans supprimer la feature (la route `/admin/tuto` et sa page restent intactes).

## État actuel
`src/components/AppSidebar.tsx` (lignes 82-84) ajoute « Tuto » à `bottomItemsList` pour les super-admins :
```tsx
const bottomItemsList = isSuperAdmin
  ? [...bottomItems, { title: "Tuto", url: "/admin/tuto", icon: PlayCircle }]
  : bottomItems;
```

## Changement
Ne plus ajouter l'entrée « Tuto » — `bottomItemsList` devient simplement `bottomItems` :
```tsx
const bottomItemsList = bottomItems;
```
Aucune autre modification : la route `/admin/tuto`, la page associée et l'icône importée ne sont pas touchées. L'entrée réapparaîtra si on réajoute l'objet plus tard.
