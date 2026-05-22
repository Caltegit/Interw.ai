## Pourquoi c'est vide

La requête dans `src/hooks/queries/useDashboardData.ts` trie sur `projects.updated_at`, colonne qui n'existe pas dans la table → la requête échoue silencieusement et `recentProjects` reste vide.

## Correctif

Dans `src/hooks/queries/useDashboardData.ts` :

1. Remplacer le tri et le champ sélectionné par `created_at` (existe déjà).
2. Mettre à jour le type `DashboardData.recentProjects` : `updated_at` → `created_at`.
3. Stratégie d'affichage demandée :
   - Récupérer les 10 derniers projets actifs (par `created_at` desc) avec `sessions(count)`.
   - Garder en priorité ceux qui ont au moins 1 session, dans la limite de 3.
   - Si moins de 3, compléter avec les plus récents sans session pour toujours afficher jusqu'à 3 cartes.

4. Dans `src/pages/Dashboard.tsx` : remplacer l'usage de `updated_at` par `created_at` pour l'affichage de la date relative.

Aucun changement SQL, aucune autre modification de l'UI.
