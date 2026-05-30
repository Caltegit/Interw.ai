## Vidéo en sticky à droite du cartouche candidat

### Objectif
Sur desktop, la vidéo se positionne dès le haut à droite du cartouche « prénom nom » (DecisionBanner) et reste sticky lors du défilement. La largeur du panneau vidéo est réduite d'environ 20 %.

### Changements (`src/pages/SessionDetail.tsx`)

1. **Largeur du panneau vidéo** : passer la variable `--video-col` de `459px` à `367px` (≈ 459 × 0,8). Variante copilot ouvert : `360px` → `288px`.

2. **Réintégrer le `DecisionBanner` dans la colonne gauche du grid** (au-dessus des `TabsList`), pour qu'il soit aligné horizontalement avec le panneau vidéo sticky à droite. L'`AudioHealthBanner` reste également en haut de la colonne gauche.

3. **Ordre mobile préservé** :
   - Colonne gauche (banner + tabs) : `order-2 lg:order-1`
   - Colonne droite (vidéo) : `order-1 lg:order-2`
   - Sur mobile : banner d'abord (en haut du contenu gauche), puis vidéo, puis onglets — comportement déjà demandé précédemment.

4. **Sticky vidéo** : la colonne vidéo conserve `lg:sticky lg:top-6 lg:self-start`. Comme elle est désormais alignée en haut du grid avec le banner, elle apparaît dès le haut et colle au défilement.

### Hors scope
- `SharedReport.tsx` n'est pas modifié (déjà en bon ordre, hors demande).
- Pas de changement du contenu du DecisionBanner ni du SessionVideoNavigator.

### Vérification
- Desktop ≥ 1024 px : DecisionBanner à gauche, lecteur vidéo à droite, alignés au top ; lors du scroll, la vidéo reste visible.
- Mobile : ordre inchangé (banner → vidéo → onglets).
