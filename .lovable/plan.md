## Objectif
Sur mobile, dans la page de rapport partagé (`/shared-report/:token`), la colonne vidéo est actuellement affichée **après** les onglets (Décision / Réponses / Transcription). On veut qu'elle apparaisse **en premier**, au-dessus des onglets, sur mobile uniquement. Le layout desktop (vidéo sticky à droite) reste inchangé.

## Changement
Dans `src/pages/SharedReport.tsx`, sur le conteneur `grid lg:grid-cols-[1fr_510px]` :
- Ajouter `order-2 lg:order-1` à la colonne des onglets
- Ajouter `order-1 lg:order-2` à la colonne vidéo (`SessionVideoNavigator`)

Résultat : sur mobile, la vignette vidéo s'affiche juste sous le `DecisionBanner`, avant les onglets. Sur desktop (≥ lg), l'ordre actuel est préservé grâce à `lg:order-*`.

Aucune autre modification (pas de logique métier, pas de changement de données).