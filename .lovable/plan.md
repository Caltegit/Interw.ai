## Réorganisation page rapport (SessionDetail)

### 1. Cartouche vidéo (SessionVideoNavigator) — colonne droite

- **Position figée** : rendre la colonne droite `sticky top-4` afin que le lecteur reste visible au scroll.
- **Agrandir ×1,5** : passer la colonne droite de `340px` à `510px` dans la grille `lg:grid-cols-[1fr_510px]` de `SessionDetail.tsx`.
- **Boutons de vitesse** : ajouter dans `SessionVideoNavigator.tsx` une rangée de boutons `1×` / `1,5×` / `2×` qui modifient `videoRef.current.playbackRate`. Bouton actif mis en surbrillance. État local `rate`, réappliqué après chaque changement de clip via l'effet existant.

### 2. Suppression du Best-of

- Retirer la `Card` "Best-of" et le `HighlightReelPlayer` de la colonne droite dans `SessionDetail.tsx`.
- Retirer l'import inutilisé `HighlightReelPlayer` / `HighlightClip`.
- Conserver les composants eux-mêmes (utilisés par `HighlightsPublic`/`SharedReport`).

### 3. Décision sous le nom du candidat (DecisionBanner)

- Déplacer les 3 boutons de décision de la zone "Actions" vers une rangée placée **juste sous le nom et le sous-titre** du candidat.
- La zone "Actions" à droite ne garde que le menu `…` (partage / téléchargement / régénération).
- La pastille badge "décision" actuelle (à côté de la reco) est retirée pour éviter la redondance.

### 4. Renommage des libellés

Remplacer dans toute l'application :

| Avant | Après |
|---|---|
| Présélectionner / Présélectionné | **Retenu** |
| 2e avis / 2e avis demandé | **À discuter** |
| Rejeter / Rejeté | **Non** |

Fichiers concernés :
- `src/components/session/DecisionBanner.tsx` (boutons + `decisionConfig`)
- `src/components/project/SessionCard.tsx` (boutons décision)
- `src/pages/ProjectDetail.tsx` (filtres `decisionOptions` et chips de visibilité)
- `src/pages/SessionDetail.tsx` (toasts `handleDecision`)

Les valeurs internes (`shortlisted`, `second_opinion`, `rejected`) ne changent pas — uniquement l'affichage en français.

### Fichiers modifiés

1. `src/pages/SessionDetail.tsx` — grille, sticky, suppression Best-of, toasts
2. `src/components/session/SessionVideoNavigator.tsx` — boutons vitesse, sticky compatible
3. `src/components/session/DecisionBanner.tsx` — réorganisation décision + libellés
4. `src/components/project/SessionCard.tsx` — libellés boutons
5. `src/pages/ProjectDetail.tsx` — libellés filtres et chips
