

## Curseurs de pondération auto-rééquilibrés

### Comportement

Chaque critère a un slider 0–100. Bouger un slider rééquilibre les autres au prorata pour garder un total de 100 %. Cadenas par critère pour figer une valeur. Bouton « Répartir équitablement » pour repartir d'une base neutre.

### UI dans `StepCriteria`

```
Critères d'évaluation                     [Répartir équitablement]
Total : 100% ✓

🔓  Communication            ●━━━━━━━━━━  35
🔒  Résilience               ━━━●━━━━━━━  20
🔓  Fit culturel             ━━━━●━━━━━━  25
🔓  Expérience technique     ━━━●━━━━━━━  20
```

- Slider remplace le badge `%`.
- Cadenas à gauche : critère figé, ignoré par le rééquilibrage.
- Valeur numérique à droite du slider (lecture seule).
- Ligne de total passe en vert permanent (toujours 100 %).
- Texte « doit atteindre 100 % » supprimé.

### Logique de rééquilibrage (`src/lib/rebalanceWeights.ts`)

Fonction pure :
```
rebalance(weights, lockedSet, changedIndex, newValue) → weights[]
```
- delta = newValue − weights[changedIndex]
- pool = indices non verrouillés sauf changedIndex
- redistribuer −delta sur pool au prorata des poids actuels
- si pool vide ou somme nulle : refuser le changement (clamp)
- arrondir à l'entier, ajuster ±1 sur le plus gros pour total = 100 exact

### Ajout / suppression / import

- **Ajout d'un critère** : nouveau poids = moyenne des poids non verrouillés, ces derniers se réajustent.
- **Suppression** : son poids est redistribué au prorata sur les non verrouillés.
- **Import depuis bibliothèque** (multi) : chaque critère importé arrive avec un poids égal, rééquilibrage global.
- **Premier critère** : 100 %.

### Dialog critère

Retrait complet du champ « Poids % » de `CriterionFormDialog` (la pondération est désormais gérée uniquement dans la liste, où le contexte global est nécessaire).

### Validation wizard

`ProjectForm` : la règle « total = 100 % » reste vraie par construction. Suppression des messages anxiogènes liés au total.

### Conversion à l'ouverture d'un projet existant

Les `weight` stockés en base sont déjà des entiers 0–100. S'ils ne totalisent pas 100, normalisation au prorata à l'ouverture (sans modifier la base tant que l'utilisateur ne sauvegarde pas).

### Fichiers touchés

- `src/lib/rebalanceWeights.ts` — nouveau, fonction pure + tests d'invariants
- `src/components/project/StepCriteria.tsx` — sliders, cadenas, bouton « Répartir équitablement », logique d'ajout/suppression/import
- `src/components/CriterionFormDialog.tsx` — retrait du champ poids
- `src/components/project/ProjectForm.tsx` — nettoyage du libellé de validation

### Hors champ

- Aucune migration BDD (colonne `weight` inchangée).
- Pas de changement du moteur de scoring (`generate-report`).
- Pas de modification de la bibliothèque de critères.

