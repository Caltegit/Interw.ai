## Changement

Dans la carte « Derniers projets actifs » du Dashboard :
- afficher **5** projets au lieu de 3 ;
- pour les projets qui ont au moins un entretien (session), les classer par **date du dernier entretien** (le plus récent en premier) ;
- compléter (si moins de 5) avec les projets actifs sans entretien, triés par date de création décroissante.

## Détails techniques

Fichier : `src/hooks/queries/useDashboardData.ts` (lignes ~100-120).

1. Élargir la requête `projects` pour récupérer la date du dernier entretien :
   - sélectionner `sessions(created_at)` en plus du `count`,
   - augmenter `.limit(10)` → `.limit(30)` pour avoir assez de candidats à trier côté client.
2. Dans le `map`, calculer `lastSessionAt = max(sessions[].created_at)` (ou `null`).
3. Construire `recentProjects` :
   - `withSessions` : filtrés sur `sessionCount > 0`, triés par `lastSessionAt` desc, puis `slice(0, 5)`.
   - `withoutSessions` : triés par `created_at` desc (déjà le cas via la requête).
   - Concaténer et `slice(0, 5)`.
4. Mettre à jour le commentaire ("jusqu'à 5 cartes").

Aucun changement nécessaire dans `Dashboard.tsx` : il itère déjà sur `recentProjects`.

## Hors périmètre

- Le type `recentProjects` reste identique (pas besoin d'exposer `lastSessionAt` au composant).
- Pas de changement de design ni du reste du dashboard.
