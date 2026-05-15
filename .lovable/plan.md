## Problème

Dans la page projet, le champ "Rechercher" ne cherche qu'à l'intérieur des candidats déjà filtrés par les puces de décision (À traiter / Oui / Non / Peut-être / Non retenu). Quand on tape un nom, on rate les profils dont la décision n'est pas dans la sélection active.

## Correctif

Dans `src/pages/ProjectDetail.tsx` (fonction `filteredSessions`, lignes 532-567) : quand `search.trim()` est non vide, ne pas appliquer le filtre `visibleDecisions` ni `decisionFilter`. Tous les autres filtres (assigné, reco, score, dates) restent inchangés, et le tri continue de s'appliquer.

Le compteur "X / Y" et la pagination utilisent déjà `filteredSessions`, donc ils se mettront à jour automatiquement et refléteront le périmètre élargi pendant une recherche.

Aucun autre fichier n'est touché.