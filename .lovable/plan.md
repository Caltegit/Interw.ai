# Réorganisation de l'en-tête de la sidebar

## Objectif
Placer le bouton d'ouverture/fermeture de la sidebar à **gauche** du sélecteur d'organisation, sur la **même ligne**, et supprimer la mention de rôle (« Propriétaire » / « Membre ») sous le nom de l'organisation. Aucun ajout d'élément nouveau.

## État actuel
- `src/components/AppSidebar.tsx` — `SidebarHeader` empile `OrganizationSwitcher` puis `SidebarTrigger` (avec `self-end`) l'un au-dessus de l'autre.
- `src/components/OrganizationSwitcher.tsx` — affiche `roleLabel` (« Propriétaire » / « Membre ») sous le nom de l'org, dans les deux variantes (org unique et sélecteur déroulant), via une seconde `<span>` `text-muted-foreground`.

## Changements

### 1. `src/components/AppSidebar.tsx` — en-tête sur une ligne
Remplacer le bloc `SidebarHeader` actuel :
```tsx
<SidebarHeader className="gap-1 px-2 py-2">
  <OrganizationSwitcher />
  <SidebarTrigger className="h-7 w-7 self-end" />
</SidebarHeader>
```
par une mise en ligne flex où le trigger précède le switcher :
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
Le trigger reste visible en mode replié (icône seule) ; le switcher conserve son comportement existant.

### 2. `src/components/OrganizationSwitcher.tsx` — suppression du rôle
- Retirer la variable `roleLabel` et l'import/usage de `isOwner` (si devenu inutilisé).
- Dans la variante org unique : remplacer le bloc `grid` à deux lignes par le nom seul (garder la même `SidebarMenuButton size="lg"`, garder `OrgLogo`).
- Dans la variante déroulante : idem, supprimer la seconde `<span>` `roleLabel` ; garder le nom + `ChevronsUpDown`.

Concrètement, passer de :
```tsx
<div className="grid flex-1 text-left leading-tight">
  <span className="truncate font-semibold">{label}</span>
  <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
</div>
```
à :
```tsx
<div className="grid flex-1 text-left leading-tight">
  <span className="truncate font-semibold">{label}</span>
</div>
```
(dans les deux variantes).

## Non concerné
- Aucun autre élément (nav, footer, dropdown du compte) n'est touché.
- Aucun nouvel élément ajouté.
