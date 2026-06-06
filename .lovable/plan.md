# Plan — Deltas Orale & Attitude vs moyenne projet

## 1. Étendre `useProjectAverages`
Fichier : `src/hooks/queries/useProjectAverages.ts`

- Ajouter `paraverbal_analysis, nonverbal_analysis` au `select` Supabase.
- Ajouter deux champs à l'interface `ProjectAverages` :
  - `paraverbalScore: number | null`
  - `nonverbalScore: number | null`
- Calculer pour chaque rapport le score via `computeParaverbalAverage` / `computeNonverbalAverage` (mêmes helpers que les badges), puis faire la moyenne sur les valeurs non-nulles.
- Renvoyer les deux scores arrondis (ou `null`).

## 2. Brancher le delta dans `ScoresOverviewCard`
Fichier : `src/components/session/ScoresOverviewCard.tsx`

- Dans le tableau `items`, alimenter `avg` :
  - Orale → `hasBenchmark ? projectAverages!.paraverbalScore : null`
  - Attitude → `hasBenchmark ? projectAverages!.nonverbalScore : null`
- Rendu du `+/- moy.` déjà en place — aucun autre changement.

## 3. Hors scope
- Pas de changement DB ni edge function.
- Pas de modification des badges ni des autres onglets.
- Cas `audioFailed` inchangé (N/A sans delta).
