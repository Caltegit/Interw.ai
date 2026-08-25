# Masquer le sélecteur d'organisation en sidebar repliée

## Objectif
Quand la sidebar est repliée (mode icône), le logo de l'organisation dépasse. En mode replié, ne montrer **que** le bouton d'ouverture/fermeture de la sidebar ; cacher le `OrganizationSwitcher`.

## État actuel
`src/components/AppSidebar.tsx` (lignes 88-95) :
```tsx
<SidebarHeader className="px-2 py-2">
  <div className="flex items-center gap-1">
    <SidebarTrigger className="h-7 w-7 shrink-0" />
    <div className="min-w-0 flex-1">
      <OrganizationSwitcher />
    </div>
  </div>
</SidebarHeader>
```
Le `OrganizationSwitcher` reste visible même replié, d'où le débordement du logo. La variable `collapsed` (déjà calculée ligne 67) est disponible.

## Changement
Masquer le wrapper du switcher quand `collapsed` est vrai :
```tsx
<SidebarHeader className="px-2 py-2">
  <div className="flex items-center gap-1">
    <SidebarTrigger className="h-7 w-7 shrink-0" />
    {!collapsed && (
      <div className="min-w-0 flex-1">
        <OrganizationSwitcher />
      </div>
    )}
  </div>
</SidebarHeader>
```

Ainsi replié : seul le bouton trigger reste. Déplié : trigger + switcher comme actuellement. Aucun autre élément touché.
