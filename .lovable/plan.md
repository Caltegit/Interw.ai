## Objectif

Standardiser tous les scores Big Five sur **0-100** par trait. Le badge de l'onglet « Big Five » affiche la **moyenne des 5 traits** sur 100, avec couleur rouge → orange → vert (mêmes seuils que les scores IA : < 45 rouge, < 65 orange, ≥ 65 vert).

## Changements

### 1. Migration des données existantes (Option A)
`UPDATE` SQL sur `reports` : pour chaque rapport ayant `personality_profile`, multiplier par 10 le `score` de chaque trait Big Five (`openness`, `conscientiousness`, `extraversion`, `agreeableness`, `emotional_stability`), borné à 100. Ne s'applique qu'aux scores ≤ 10 (idempotent : un rapport déjà migré ne sera pas re-multiplié).

### 2. `supabase/functions/generate-report/index.ts`
- Schéma JSON Big Five : `score` passe de `min 0 / max 10` à **`min 0 / max 100`**.
- Mettre à jour la consigne dans le prompt en conséquence.

### 3. `src/components/session/BigFiveBadge.tsx`
Déjà correct (calcule la moyenne, borne 0-100, couleurs alignées sur les seuils IA). Aucun changement.

### 4. `src/components/session/PersonalityRadar.tsx`
Déjà correct (affichage `X/100`, barre `width: score%`, marqueur projet en %). Aucun changement.

### 5. `src/hooks/queries/useProjectAverages.ts`
Aucun changement (calcul brut, échelle conservée).

## Validation

Sur la session `7a9bd667-…` après migration :
- Rigueur 9 → **90/100** (barre quasi pleine)
- Ouverture 7 → **70/100**
- Moyenne ≈ **74** → badge vert avec « 74 »

## Hors scope
- Pas de refonte visuelle.
- Pas de changement de structure de table.
