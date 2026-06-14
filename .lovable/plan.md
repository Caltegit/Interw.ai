## Problème

Sur mobile, la sidebar est en mode `offcanvas` (cachée par défaut). Le `SidebarTrigger` actuel est placé **dans** le `SidebarHeader`, donc il disparaît avec la sidebar — impossible de la rouvrir.

## Solution

Ajouter un bouton déclencheur visible uniquement sur mobile, fixé en haut à gauche de l'écran, qui ouvre la sidebar.

### Modification

Dans `src/components/AppLayout.tsx` (composant `AppShell`) :

- Ajouter un `<SidebarTrigger />` positionné en haut à gauche, visible uniquement en mobile (`md:hidden`), avec un style discret (fond translucide, ombre légère) pour qu'il reste lisible au-dessus du contenu.
- Le placer en `fixed top-2 left-2 z-40` afin qu'il reste accessible même en scroll.
- Conserver le `SidebarTrigger` existant dans `AppSidebar` pour le desktop.

Aucun changement de logique métier, uniquement présentation.

## Vérification

- Sur mobile (393px) : bouton visible en haut à gauche, clic ouvre la sidebar offcanvas.
- Sur desktop : bouton masqué, comportement actuel inchangé.