## Objectif

Quand l'utilisateur ouvre le Copilote IA sur un écran trop étroit, replier automatiquement la barre latérale gauche pour libérer de l'espace. Restaurer son état précédent quand le Copilote se referme.

## Comportement proposé

- Seuil : largeur de fenêtre **< 1440 px** (en dessous, l'addition sidebar étendue + copilote + contenu principal devient à l'étroit ; au-dessus on a la place pour tout garder ouvert).
- À l'ouverture du Copilote :
  - Si `window.innerWidth < 1440` **et** la sidebar est étendue → la replier, et mémoriser « je l'ai repliée moi-même ».
  - Sinon → ne rien toucher (respect du choix utilisateur).
- À la fermeture du Copilote :
  - Si on l'avait repliée nous-mêmes → la rouvrir.
  - Sinon → ne rien toucher.
- Si l'utilisateur rouvre/replie manuellement la sidebar pendant que le Copilote est ouvert → on oublie notre « marqueur » et on ne touchera plus à rien à la fermeture (priorité à l'action utilisateur).
- Mobile (< 768 px) : inchangé. Le Copilote est en drawer plein écran, la sidebar mobile a déjà son propre comportement.

## Implémentation

Un seul endroit, dans `src/components/AppLayout.tsx` (composant `AppShell`), parce qu'il a déjà accès à `useCopilot()` et peut accéder à `useSidebar()` (les deux providers sont au-dessus).

Petit hook local `useAutoCollapseSidebar(copilotOpen)` :

```ts
const { state, setOpen } = useSidebar();
const autoCollapsedRef = useRef(false);
const prevCopilotOpenRef = useRef(copilotOpen);
const prevSidebarStateRef = useRef(state);

useEffect(() => {
  const wasOpen = prevCopilotOpenRef.current;
  prevCopilotOpenRef.current = copilotOpen;

  // Détecter une action manuelle utilisateur sur la sidebar pendant que le copilote est ouvert
  if (copilotOpen && wasOpen && state !== prevSidebarStateRef.current) {
    autoCollapsedRef.current = false;
  }
  prevSidebarStateRef.current = state;

  // Ouverture du copilote
  if (copilotOpen && !wasOpen) {
    if (window.innerWidth < 1440 && state === "expanded") {
      autoCollapsedRef.current = true;
      setOpen(false);
    }
    return;
  }

  // Fermeture du copilote
  if (!copilotOpen && wasOpen && autoCollapsedRef.current) {
    autoCollapsedRef.current = false;
    setOpen(true);
  }
}, [copilotOpen, state, setOpen]);
```

Branché dans `AppShell` :

```tsx
function AppShell() {
  const { open: copilotOpen } = useCopilot();
  useAutoCollapseSidebar(copilotOpen);
  // ... reste inchangé
}
```

## Points de détail

- Le seuil est lu **au moment de l'ouverture** du Copilote, pas en continu — pas de listener resize, pas de re-pli/dépli intempestif si l'utilisateur redimensionne après coup.
- Aucun changement visuel sur les écrans larges (≥ 1440 px) : la sidebar reste ouverte comme aujourd'hui.
- Aucun changement sur mobile.
- `SidebarProvider` persiste déjà son état dans un cookie ; notre `setOpen` met simplement à jour le même state, donc cohérent.

## Fichier modifié

- `src/components/AppLayout.tsx` : ajout du hook `useAutoCollapseSidebar` et de son appel dans `AppShell`.

## Hors périmètre

- Pas de réglage utilisateur pour désactiver ce comportement (peut s'ajouter plus tard si demandé).
- Pas de changement du seuil en fonction de la taille du Copilote (déjà responsive).
- Pas de modification du Copilote ni de la sidebar elle-même.
