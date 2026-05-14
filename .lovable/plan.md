## Objectif

Transformer le copilote en **panneau latéral droit ancré** (docké) plutôt qu'un drawer modal, pour que le recruteur puisse continuer à naviguer dans l'app pendant la conversation.

Aujourd'hui, le copilote utilise `<Sheet>` (shadcn) avec un overlay sombre qui bloque les clics derrière. Impossible de cliquer sur la sidebar, le contenu, les boutons.

## Comportement cible

- Bouton flottant (en bas à droite) → ouvre/ferme le panneau, identique à aujourd'hui.
- Quand le panneau est ouvert :
  - Il occupe une **colonne fixe à droite** (largeur ~420 px sur desktop, plein écran sur mobile).
  - Le **contenu principal de l'app se rétrécit** automatiquement (la `main` perd la largeur du panneau) — pas de superposition, pas d'overlay.
  - La sidebar gauche, le header, et toute la navigation restent **pleinement cliquables**.
  - Le copilote **reste monté** quand on navigue entre pages : la conversation continue, les messages ne se perdent pas.
  - Le `activeProjectId` se met à jour automatiquement en suivant l'URL (déjà le cas via `CopilotContext`). Si on quitte une page projet, le panneau reste ouvert mais demande à choisir un projet (comme aujourd'hui).
- Sur mobile (< 768 px) : on garde un comportement de type drawer plein écran (overlay), car ancrer une colonne à 420 px ne tient pas.

## Implémentation

**`AppLayout.tsx`**
- Ajouter une 3ᵉ colonne à droite, conditionnée sur `copilot.open`, qui rend `<CopilotPanel />` (nouveau) à largeur fixe.
- Sur mobile, ne pas ajouter cette colonne — laisser `CopilotDrawer` s'occuper du cas mobile en mode `Sheet`.

```text
┌──────────┬───────────────────┬──────────────┐
│ Sidebar  │   <Outlet />      │  Copilote    │
│          │                   │  (420 px)    │
└──────────┴───────────────────┴──────────────┘
```

**Nouveau composant `CopilotPanel.tsx`**
- Reprend tout le contenu actuel de `CopilotDrawer` (header, tabs mode, thread switcher, chat window) sans le `Sheet`.
- Header avec titre + bouton fermer (X) qui appelle `setOpen(false)`.
- Bordure gauche (`border-l`) pour la séparation visuelle, fond `bg-background`.

**`CopilotDrawer.tsx`** (renommé en usage)
- Ne sert plus que sur mobile : on l'enveloppe d'un check `useIsMobile()` et il reste un `<Sheet>`.
- Sur desktop, le panneau est rendu via `CopilotPanel` dans le layout.

**Persistance d'état**
- Toute la logique d'état (mode, thread actif, projet) doit vivre **dans le `CopilotContext`** au lieu d'être locale à `CopilotDrawer`. Sinon, naviguer démonterait/remonterait le panneau et perdrait la sélection.
- À déplacer dans le contexte : `mode`, `activeThreadId`, `pickedProjectId`.

**Bouton flottant**
- Inchangé visuellement, mais quand le panneau est ouvert sur desktop, on peut le masquer (puisque la croix de fermeture est dans le panneau) ou le laisser et il sert juste à refermer. Mon choix : **masquer** le bouton flottant quand le panneau est ouvert sur desktop.

## Hors périmètre

- Pas de redimensionnement à la souris du panneau (largeur fixe pour V1).
- Pas de mémorisation `localStorage` de l'état ouvert/fermé entre rechargements (V1 : fermé par défaut au reload).
- Pas de mode « épinglé/détaché » en fenêtre flottante.

## Question

Largeur du panneau : **420 px** (compact, laisse de la place au contenu) ou **480 px** (comme le drawer actuel, plus confortable pour lire) ? Mon défaut : **420 px**.
