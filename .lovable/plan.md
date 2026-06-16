# Recherche globale sur la page Projets

## Objectif
Ajouter un champ « Recherche » en haut à droite de la page `/projects` (à gauche du bouton Archives) qui interroge à la fois les projets et les candidats, et affiche les résultats dans un panneau scindé en deux sections.

## Emplacement UI

```text
[+ Nouveau projet]        [🔍 Rechercher projets et candidats...]  [📦 Archives]
```

- Champ posé sur la même ligne que les boutons existants, à gauche de « Archives ».
- Largeur ~320 px sur desktop, plein largeur sur mobile (la barre passe en colonne sous `sm`).
- Icône loupe `Search` à gauche du champ, placeholder « Rechercher un projet ou un candidat… ».

## Comportement

- Saisie debouncée (250 ms), recherche déclenchée à partir de 2 caractères.
- Ouvre un panneau de résultats sous le champ (popover ancré au champ, largeur = champ, `max-h-[420px]` scrollable).
- `Esc` ou clic extérieur ferme le panneau. `↑/↓/Enter` navigue/sélectionne.
- Résultats scindés en 2 sections, dans cet ordre :
  1. **Projets** (max 5) — clic → `/projects/:id`
  2. **Candidats** (max 8) — clic → ouvre directement le rapport de la session
- Sous chaque section, lien « Voir tous les résultats » si plus de résultats existent (filtre la liste de la page pour les projets, ouvre la page projet concerné pour les candidats — voir Détails techniques).
- État vide : « Aucun résultat ». État de chargement : spinner discret.

### Rendu d'un résultat

- **Projet** : titre (mise en surbrillance du match) + petit badge « Projet » + sous-ligne `X sessions · créé il y a N jours`.
- **Candidat** : nom (surbrillance) + sous-ligne `email · projet "<titre>" · statut`. Icône `FileText` si rapport prêt, sinon icône `Clock` désactivée pour les sessions non terminées (mais cliquable vers la session).

## Périmètre de recherche

- **Projets** : `projects.title` (ilike), exclut `status = 'archived'`, limité à l'organisation courante via RLS.
- **Candidats** : `sessions.candidate_name`, `sessions.candidate_email` (ilike OR), exclut `is_demo = true`. Jointure sur `projects(id, title)` pour afficher le projet et router vers la session.
- Tri : projets par `created_at desc`, candidats par `completed_at desc nulls last, created_at desc` (les rapports finalisés en premier).

## Navigation

- Projet → `navigate('/projects/:id')`.
- Candidat → `navigate('/projects/:projectId?session=:sessionId')` (la page ProjectDetail ouvre déjà une session via ce param — à vérifier ; sinon `navigate('/sessions/:id')` selon la route existante du rapport).

## Détails techniques

- **Nouveau hook** `src/hooks/queries/useGlobalSearch.ts` :
  - `useQuery` activé quand `term.length >= 2`.
  - Lance en parallèle 2 requêtes Supabase :
    - `projects` : `select id,title,slug,created_at, sessions(count)` `ilike title %term%` `neq status archived` `limit 6`.
    - `sessions` : `select id, candidate_name, candidate_email, status, completed_at, project_id, projects(id,title)` `or(candidate_name.ilike.*,candidate_email.ilike.*)` `eq is_demo false` `limit 9`.
  - `staleTime: 10_000`.
- **Nouveau composant** `src/components/GlobalSearch.tsx` :
  - Champ `Input` + popover custom (`Popover` shadcn) ; pas besoin de `cmdk` pour rester simple.
  - Sections rendues conditionnellement (masquer une section vide).
  - Gestion clavier basique (focus index, Enter, Esc).
  - Met en surbrillance le terme via `<mark>` (utilitaire `highlight(text, term)`).
- **Intégration** : modifier `src/pages/Projects.tsx` pour placer `<GlobalSearch />` dans le header flex, entre les deux boutons existants.
- **Cache** : invalider `["global-search"]` lors de création/archivage d'un projet (best effort, sinon `staleTime` court suffit).

## Hors périmètre

- Pas de recherche sur les projets archivés (visible uniquement depuis `/projects/archives`).
- Pas de page dédiée « Tous les résultats » : le filtrage tabulaire reste assuré par la liste existante.
- Pas de raccourci clavier global (⌘K) — peut être ajouté plus tard.

## Tests rapides après implémentation

- Saisir un fragment de titre de projet : voir le projet apparaître, cliquer y mène à `/projects/:id`.
- Saisir un nom/email candidat : voir la ligne dans la section Candidats, cliquer ouvre la session/rapport.
- Champ vide → popover fermé. 1 caractère → pas de requête. Aucun résultat → message d'état vide.
