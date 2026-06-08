# Page Stats projet

Les stats demandées (clics, formulaires remplis, sessions non complétées, complétées) sont des métriques de **projet**, pas de session. On les rassemble dans une nouvelle page `ProjectStats`, accessible depuis le menu "..." de la page d'une session (qui pointe vers le projet parent) **et** depuis la page projet elle-même.

## 1. UI de la page Stats

Route : `/projects/:id/stats` — header avec breadcrumb (← Retour au projet), titre "Statistiques · {nom du projet}", et un sélecteur de période (7 j / 30 j / 90 j / Tout — défaut 30 j).

### a) Bandeau "Entonnoir d'acquisition" (4 cartes KPI en ligne)

```text
┌────────────┬────────────────┬───────────────┬──────────────┐
│ 👆 Clics   │ 📝 Formulaires │ ▶  Démarrées  │ ✅ Complétées │
│   1 248    │     312        │      287      │     203      │
│  page pub  │   25,0 %       │   92,0 %      │   70,7 %     │
│            │   des clics    │   des form.   │  des démarrées│
└────────────┴────────────────┴───────────────┴──────────────┘
```
- **Clics** : visites uniques de `/p/:slug` (la page publique du projet) sur la période.
- **Formulaires remplis** : nombre de sessions créées (un candidat doit remplir le formulaire pour qu'une session existe).
- **Démarrées** : sessions avec `started_at IS NOT NULL`.
- **Complétées** : sessions `status = 'completed'`.
- Chaque carte affiche en sous-texte le **taux de conversion** vs l'étape précédente.

### b) Carte "Issue des sessions" (donut + légende)

Répartition des sessions sur la période :
- ✅ Complétées (vert)
- 🟧 Abandonnées en cours (orange) — `status = 'pending'` avec `started_at IS NOT NULL` et inactivité > 30 min
- ⛔ Annulées (rouge) — `status = 'cancelled'`
- ⏳ En attente (gris) — `status = 'pending'` jamais démarrées

À droite : durée moyenne d'un entretien complété + durée médiane.

### c) Graphique "Activité dans le temps"

Aire empilée sur la période : clics, formulaires remplis, sessions complétées (1 point / jour). Permet de voir l'effet d'une campagne / d'un partage de lien.

### d) Carte "Sources de trafic" (si dispo)

Top 5 referrers (`document.referrer` enregistré). Sinon "Direct".

### e) Carte "Performances candidats" (réutilise l'existant)

Mini-tableau (max 5) : meilleur score, score moyen, nombre de "Retenus" / "Refusés" déjà décidés. Lien vers la liste complète du projet.

## 2. Entrée dans le menu "..." de la session

Dans `DecisionBanner.tsx` (le menu kebab actuel), ajouter en haut un nouvel item :
```
📊 Statistiques du projet
```
Cliquable uniquement si `readOnly = false`, navigue vers `/projects/:projectId/stats`. Idem un petit bouton "Statistiques" dans le header de `ProjectDetail` (icône BarChart3).

## 3. Tracking des clics & formulaires

### Tracking clics (nouveau)

Nouvelle table `public.project_page_views` :
- `project_id` (uuid, FK logique vers projects, indexée)
- `viewed_at` (timestamptz, défaut now())
- `referrer_host` (text, nullable — extrait du `document.referrer`)
- `visitor_hash` (text — hash SHA-256 court de `user_agent + ip-truncatée + jour`, permet de dédupliquer en "visites uniques jour")

Edge function publique `track-project-view` (`verify_jwt = false`) :
- POST `{ project_id, referrer }`
- Calcule `visitor_hash` côté serveur à partir de l'IP (header `x-forwarded-for`) et de l'UA
- Insert atomique avec dédup `ON CONFLICT (project_id, visitor_hash) DO NOTHING` sur un index unique partiel par jour (`(project_id, visitor_hash, date_trunc('day', viewed_at))`)

`ProjectPublicPage.tsx` appelle cette fonction au mount (fire-and-forget).

### Formulaires remplis

Pas de tracking séparé : `count(sessions WHERE project_id = ?)` suffit (création de session = formulaire soumis).

## 4. Données techniques

- Query stats agrégée dans un nouveau hook `useProjectStats(projectId, period)` qui parallélise :
  - `count` sur `project_page_views` (filtré période)
  - `count` + agrégats sur `sessions` (status, started_at, duration_seconds, completed_at)
  - bucketing par jour côté SQL via une RPC `get_project_stats_timeseries(project_id, from, to)` (SECURITY DEFINER, vérifie l'appartenance org via `has_role`).
- RLS sur `project_page_views` :
  - `service_role` ALL
  - `authenticated SELECT` réservé aux membres de l'org propriétaire du projet (via jointure sur `projects.organization_id` + `has_role`)
  - pas d'`anon` direct (l'insert passe par l'edge function avec service role)

## 5. Hors scope

- Pas de tracking de scroll / temps passé sur la page publique.
- Pas d'export CSV des stats (peut s'ajouter ensuite).
- Pas de comparaison multi-projets (existant : `ProjectCompare`).
- Pas de A/B testing.

## Fichiers touchés

**Nouveaux**
- `src/pages/ProjectStats.tsx`
- `src/hooks/queries/useProjectStats.ts`
- `src/components/project/stats/FunnelCards.tsx`
- `src/components/project/stats/OutcomeDonut.tsx`
- `src/components/project/stats/ActivityChart.tsx`
- `supabase/functions/track-project-view/index.ts`
- Migration : table `project_page_views` + RLS + GRANTs + RPC `get_project_stats_timeseries`

**Modifiés**
- `src/App.tsx` — route `/projects/:id/stats`
- `src/components/session/DecisionBanner.tsx` — item "Statistiques du projet" dans le menu "..."
- `src/components/session/SessionReportView.tsx` — prop `onOpenProjectStats` + passage
- `src/pages/SessionDetail.tsx` — handler navigation vers les stats
- `src/pages/ProjectDetail.tsx` — bouton "Statistiques"
- `src/pages/ProjectPublicPage.tsx` — appel `track-project-view` au mount
