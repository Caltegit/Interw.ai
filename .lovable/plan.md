## Objectif
Dans le tableau de bord, à gauche du badge "Complété" de la carte "Dernières sessions candidats", afficher un petit rond contenant le score fit poste (ex. 37).

## Fichiers concernés
- `src/pages/Dashboard.tsx`
- `src/hooks/queries/useDashboardData.ts` (données déjà disponibles, pas de modification requise)

## Implémentation
1. **Récupération du score** : le hook `useDashboardData` renvoie déjà `reportsBySession` indexé par `session_id` avec le champ `score`.

2. **Affichage conditionnel** : dans la liste `last5Sessions`, avant le `<SessionStatusBadge />`, afficher un petit cercle si :
   - `s.status === "completed"`
   - `reportsBySession[s.id]?.score` existe

3. **Style du rond** :
   - Taille ~20-24 px, plein cercle, texte en xs gras
   - Couleur selon le score en réutilisant la logique existante `scoreColor` :
     - `≥ 65` : vert (success)
     - `≥ 45` : orange (warning)
     - `< 45` : rouge (destructive)
   - Pas de couleur codée en dur, utilisation des tokens sémantiques du design system

4. **Accessibilité** : ajouter un `title` ou `aria-label` du type "Score fit poste : 37 %".

## Résultat attendu
Chaque session complétée dans la carte "Dernières sessions candidats" affiche un rond coloré avec son score fit poste juste à gauche du badge "Complété". Les autres statuts restent inchangés.