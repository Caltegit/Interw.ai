## Objectif
Rendre la colonne latérale du Copilote IA redimensionnable à la souris, avec une poignée de glissement sur son bord gauche.

## Approche
Remplacer la largeur figée par Tailwind (`w-[360px] xl:w-[400px]…`) dans `src/components/copilot/CopilotSidePanel.tsx` par une largeur contrôlée en state, ajustable via un handle vertical de 4 px placé sur le bord gauche du panneau.

## Détails techniques
- **Fichier modifié** : `src/components/copilot/CopilotSidePanel.tsx`
- **State local** : `width` (number, en px), initialisé à 400, borné entre 320 et 720.
- **Persistance** : sauvegarde dans `localStorage` (`copilot:panel-width`) pour conserver la préférence entre sessions.
- **Handle de resize** :
  - Petit rail vertical de 4 px ancré sur le bord gauche du panneau (`absolute left-0 top-0 h-full w-1 cursor-col-resize`).
  - Survol : légère teinte `bg-border` → `bg-primary/40`.
  - Au `mousedown` : écoute `mousemove` global, calcule `newWidth = window.innerWidth - e.clientX`, applique les bornes (320–720), met à jour le state.
  - Au `mouseup` : retire les listeners et persiste la valeur.
  - Pendant le drag : `document.body.style.userSelect = 'none'` pour éviter la sélection de texte.
- **Comportement quand le copilote est fermé** : la largeur reste à 0 (inchangé), le handle n'est pas rendu.
- **Responsive** : aucun changement en mobile (le composant est déjà `hidden md:flex`).

## Hors périmètre
- Pas de modification du `CopilotDrawer` mobile.
- Pas de modification de la sidebar de navigation principale.
- Pas de raccourcis clavier ni double-clic pour réinitialiser (peut être ajouté plus tard si souhaité).
