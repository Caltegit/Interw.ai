## Problème

Le panneau du copilote à droite n'a pas de contrainte de hauteur. Il vit dans le flex row `min-h-screen` de `AppLayout`, donc il s'étire à la hauteur naturelle du contenu de la page. Résultat : la zone de saisie tout en bas du panneau sort sous le viewport et il faut scroller la page entière pour l'atteindre.

## Correctif

Dans `src/components/copilot/CopilotSidePanel.tsx`, fixer le panneau à la hauteur de l'écran et le rendre collant en haut :

- Ajouter `sticky top-0 h-screen` sur le `<aside>`.
- Garder `overflow-hidden` pour que `CopilotPanelContent` (déjà en `flex h-full min-h-0 flex-col`) gère son propre scroll interne (messages scrollables, header / tabs / input restent visibles).

Aucun autre fichier à modifier — la structure interne du panneau est déjà prête à occuper 100% de la hauteur disponible.

## Vérification

Recharger une page longue (ex. liste de sessions), ouvrir le copilote, confirmer que :
- Le champ de saisie reste visible en bas du panneau sans scroller la page.
- Les messages scrollent à l'intérieur du panneau.
- La sidebar de gauche et le contenu principal restent navigables.
