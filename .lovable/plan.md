## Réponse à ta question technique — oui, ce statut existe

Vérifié en base :

- Table `report_jobs`, enum `report_job_status` : `queued | processing | done | failed | cancelled`.
- La fonction `mark_report_job_failed` (RPC appelée par `process-report-queue` sur erreur) fait exactement ce que tu décris :
  - Tant que `attempts < max_attempts` (6 par défaut) → repasse en `queued` avec backoff exponentiel (1m, 5m, 15m, 1h, 4h, 12h).
  - Quand `attempts >= max_attempts` → bascule en **`status = 'failed'`** de manière définitive.
- État actuel : 323 jobs `done`, 34 jobs `failed` réellement épuisés. Pas de zone grise.

**Donc `report_jobs.status = 'failed'` = signal fiable et binaire d'échec définitif après retries.** Pas besoin de matérialiser quoi que ce soit. Je le lis tel quel.

Un `queued` ou `processing`, même vieux de plusieurs heures, reste "en cours" et ne doit **jamais** être considéré comme unusable — le worker cron le reprendra. Idem pour "pas de ligne report_jobs du tout" → on ne sait rien, on ne marque rien.

## v1 — Badge dashboard « Incomplet » (règle finale)

`isReportUnusable(session)` retourne `true` **si et seulement si** au moins un signal d'échec avéré est présent :

1. **`audio_health.verdict === 'failed'`** dans le rapport (cas d'Inès).
2. **Rapport existe mais `executive_summary` vide ou blanc**.
3. **`report_jobs.status === 'failed'`** (échec définitif après épuisement des 6 tentatives).

Dans tous les autres cas — rapport absent, job `queued` / `processing` / inexistant, score légitimement bas — on ne marque rien. Aucun seuil temporel, jamais.

### Fichiers touchés

**1. `src/hooks/queries/useDashboardData.ts`**
- Le fetch de `recentReports` (déjà là pour les scores) rapatrie en plus `audio_health` et `executive_summary`.
- Nouveau fetch parallèle : `report_jobs` scopé aux `recentIds`, on ne garde que `status`. Léger, indexé par PK `session_id`.
- Nouvelle fonction pure exportée :
  ```ts
  export function isReportUnusable(input: {
    report?: { audio_health?: any; executive_summary?: string | null } | null;
    jobStatus?: string | null;
  }): boolean {
    if (input.jobStatus === "failed") return true;
    const r = input.report;
    if (!r) return false; // rapport absent = pas encore de verdict, on ne marque rien
    if (r.audio_health?.verdict === "failed") return true;
    if (!r.executive_summary || !r.executive_summary.trim()) return true;
    return false;
  }
  ```
- `reportsBySession[sessionId]` : ajout d'un champ `unusable: boolean`.
- Agrégats : le score reste dans `reportsBySession` (pour l'affichage détaillé), mais **les rapports `unusable` sortent de** `avgScore30d`, `topCandidates` (top 5), `dist` (recommandations) et `toProcess` (candidats à traiter).

**2. `src/components/SessionStatusBadge.tsx`**
- Nouveau libellé **« Incomplet »**, style `bg-destructive/10 text-destructive`, icône `AlertTriangle` neutre.
- Prop optionnelle `override?: "unusable"` — quand présent, remplace le status. Les call sites existants restent intacts.

**3. `src/pages/Dashboard.tsx` — « Dernières sessions candidats »**
- Si `reportsBySession[s.id]?.unusable` → badge « Incomplet » et pastille de score masquée. Lien vers la session inchangé.
- Sections « Meilleurs candidats » et « À traiter » : rien à faire côté composant, l'exclusion est faite en amont.

## Zone grise assumée pour le v1

Sur la page Session elle-même, une session « Incomplet » continue d'afficher son faux 50 issu de `generate-fit-matrix`. C'est laid mais isolé au v1. Le badge dashboard suffit à alerter le recruteur.

## Lot 2 (à faire ensuite, ticket séparé) — supprimer le faux 50 en base

Origine confirmée du 50 : **`supabase/functions/generate-fit-matrix/index.ts`** lignes 270-294. Quand une cellule (critère × question) a `evidence: "none"` (ou absent), le serveur force `score = 50`. Ensuite `generate-report` recalcule `reports.overall_score` comme moyenne pondérée de la matrice → une session muette a mécaniquement toutes ses cellules à 50 → global à 50, persisté en base.

Modifs prévues (chiffrage indicatif, à valider) :
1. **`generate-fit-matrix`** : détecter le cas « toutes cellules `none` » → renvoyer `overall_score: null`, `unusable: true`.
2. **`generate-report`** : accepter `overall_score = null` et `recommendation = null`, court-circuiter les sections dépendantes du score.
3. **UI page Session + `SharedReport` + exports PDF** : gérer `null` proprement (« Non évaluable »).
4. **Migration one-shot** : passer à `NULL` les `overall_score` des rapports déjà identifiés unusable, ou re-régénérer proprement.
5. **`isReportUnusable`** : ajouter `overall_score === null` comme signal fort.

## Régressions / risques v1

- `avgScore30d`, top, distribution reco et « à traiter » : légères variations attendues (les sessions cassées sortent).
- `SessionStatusBadge` : nouvelle prop optionnelle, aucun call site cassé.
- Un fetch supplémentaire `report_jobs` sur ~10 lignes max, coût négligeable.
- **Aucun changement DB, aucun changement génération, aucun changement page Session.**
- Un rapport en cours de génération (`queued` / `processing`) reste affiché « Complété » comme aujourd'hui — jamais marqué « Incomplet » à tort.
