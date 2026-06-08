## Diagnostic

Le tracking « clics » n'écrit dans `project_page_views` que depuis `src/pages/ProjectPublicPage.tsx` (route `/p/:slugPublic`).

Or le lien partagé aux candidats est `/session/:slug` (page `InterviewLanding`), qui n'appelle jamais l'edge function `track-project-view`. Résultat : tous les clics sur le lien candidat ne sont pas comptés → la métrique reste à 0 (ou ne reflète que les visites de la page publique vitrine).

## Correctif

Ajouter le tracking sur `InterviewLanding` (et le garder sur `ProjectPublicPage`).

1. **`src/pages/InterviewLanding.tsx`**
   - Une fois `project` chargé (avec `project.id`), invoquer `supabase.functions.invoke("track-project-view", { body: { project_id: project.id, referrer: document.referrer } })`.
   - Garde-fou : n'appeler qu'une fois par montage (ref booléenne), ignorer les erreurs silencieusement, ne pas appeler en mode démo (`slug === "demo"` ou route `/demo`).

2. **Pas de changement DB** : la table `project_page_views` et son index unique `(project_id, visitor_hash, view_date)` gèrent déjà la déduplication quotidienne par visiteur (IP tronquée + UA + date). Un même candidat qui ouvre plusieurs fois la page le même jour ne sera compté qu'une fois — comportement voulu pour une métrique « visiteurs uniques / jour ».

3. **Vérification** après build :
   - Ouvrir `/session/<slug>` dans le preview → vérifier l'appel réseau `track-project-view` (200).
   - Recharger la page Stats du projet → la KPI « Clics » doit incrémenter (J+0).
   - Vérifier qu'aucun appel n'est émis sur les sous-routes `/session/:slug/start/...`, `/complete/...`, `/test/...`, `/demo`.

## Hors périmètre

- Pas de refonte du schéma stats.
- Pas de tracking côté serveur des sessions créées (déjà couvert par la métrique « Formulaires »).
- Les visites précédant ce fix ne seront pas rétroactivement comptées.