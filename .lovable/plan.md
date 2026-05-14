## Problème

Sur `/sessions/:id`, la mise en page est :

```text
[ Sidebar ]  [ Contenu rapport (1fr) | Vidéo (510px fixe) ]  [ Copilote (420px) ]
```

À 1559px, dès que le copilote s'ouvre, il reste ~1100px pour le rapport. La colonne vidéo garde 510px → la colonne gauche tombe à ~590px et les cartes (FitBreakdown, SignalsCard, etc.) deviennent illisibles.

## Stratégie : adaptation contextuelle pilotée par `useCopilot().open`

Plutôt que de tout réduire uniformément, on touche **en priorité la colonne vidéo** (qui supporte bien le redimensionnement) et on garde le contenu analytique lisible.

### 1. Rétrécir la colonne vidéo quand le copilote est ouvert

Dans `SessionDetail.tsx` ligne 410, remplacer la largeur fixe `510px` par une valeur conditionnelle :

- Copilote fermé : `510px` (état actuel)
- Copilote ouvert : `400px`

La `SessionVideoNavigator` reste parfaitement utilisable à 400px (player 16:9 ≈ 225px de hauteur, contrôles compacts).

### 2. Compacter la barre d'onglets quand le copilote est ouvert

Les 5 onglets (Reco IA, Big Five, À l'oral, Attitude, Réponses) ont déjà des libellés masqués sous `sm`. Quand le copilote est ouvert, masquer les libellés à partir d'un breakpoint plus haut (≥ `xl`) pour éviter qu'ils ne tronquent. On garde les icônes + badges.

### 3. Réduire le padding du `<main>` quand le copilote est ouvert

Dans `AppLayout.tsx`, `main` est en `p-6` (24px). Quand le copilote est ouvert, passer à `p-4` (16px) → +16px utiles pour le contenu.

### 4. Réduire le gap de la grille

`gap-6` → `gap-4` quand le copilote est ouvert.

### Bilan d'espace gagné à 1559px

| | Copilote fermé | Copilote ouvert (avant) | Copilote ouvert (après) |
|---|---|---|---|
| Colonne contenu | ~870px | ~590px | **~720px** |
| Colonne vidéo | 510px | 510px | 400px |

→ +130px sur la colonne contenu, ce qui rend les cartes confortables.

## Détails techniques

- Source de vérité : `useCopilot().open` (déjà disponible via `CopilotContext`).
- `SessionDetail.tsx` ligne 410 : grid-template basculé via template-string conditionnel sur `open`.
- `SessionDetail.tsx` ligne 441 : ajustement responsive des libellés d'onglets.
- `AppLayout.tsx` : padding du `<main>` lu depuis `useCopilot()`.
- Aucun changement back, aucune logique métier touchée.
- Sous le breakpoint `lg`, la grille passe déjà en colonne unique → comportement mobile inchangé.

## Validation

1. Ouvrir `/sessions/:id` à 1559px, copilote fermé → état actuel inchangé.
2. Ouvrir le copilote → la colonne vidéo se rétrécit, le contenu respire, aucune carte ne déborde.
3. Refermer le copilote → retour fluide à 510px.
4. Tester à 1280px et en dessous de `lg` pour vérifier qu'on ne casse rien.
