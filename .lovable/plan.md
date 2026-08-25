# Sélecteur d'organisation en haut de la sidebar

Remplacer le texte « Interw » en haut à gauche par un vrai sélecteur d'organisation (logo + nom, ex. « Albo »), construit sur le motif « team switcher » de shadcn.

## Ce qui change

- Le mot « Interw » disparaît de l'en-tête de la sidebar.
- À la place : un bouton pleine largeur avec le logo carré de l'organisation active, son nom en gras, la mention du rôle en dessous, et une double chevron à droite.
- Clic sur le bouton : menu déroulant listant toutes les organisations de l'utilisateur, avec leur logo et une coche sur l'organisation active. Sélectionner une organisation bascule dessus (comportement actuel conservé).
- S'il n'y a qu'une seule organisation, le bouton reste affiché mais sans menu ni chevron.
- Sidebar repliée : seul le carré du logo reste visible, centré, et le menu reste accessible au clic.
- Le bouton de repli de la sidebar reste en place ; il passe dans la barre d'en-tête pour ne pas gêner le sélecteur quand la sidebar est repliée.
- Le bloc sélecteur qui était plus bas, au-dessus de « Dashboard », est supprimé (il devient redondant).

## Détails techniques

- `src/components/OrganizationSwitcher.tsx` : réécriture du rendu avec `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton size="lg"` en `DropdownMenuTrigger`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSeparator`. Logo dans un carré `size-8 rounded-lg` (repli sur l'initiale de l'organisation ou l'icône `Building2` si pas de `logo_url`). Le `DropdownMenuContent` utilise `side={isMobile ? "bottom" : "right"}` et `w-[--radix-popper-anchor-width]`, comme le composant shadcn. Logique de données et RPC `switch_active_organization` inchangées.
- `src/components/AppSidebar.tsx` : `SidebarHeader` contient désormais `<OrganizationSwitcher />` seul ; suppression du `<span>Interw</span>` et du bloc `OrganizationSwitcher` dans `SidebarGroup`. Le `SidebarTrigger` est déplacé dans l'en-tête applicatif (`src/components/AppLayout.tsx`) s'il n'y est pas déjà, afin de rester visible en mode replié.
- Le rôle affiché sous le nom vient de `useOrgRole()`.

## Vérification

Captures d'écran de `/dashboard` en sidebar déployée puis repliée, plus ouverture du menu déroulant.
