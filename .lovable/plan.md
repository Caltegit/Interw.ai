# Plan — Onglet Résumé + renommage Fit Poste

## 1. Renommer "Reco IA" → "Fit Poste" et épurer

Dans `src/components/session/SessionReportView.tsx` :

- TabsTrigger `value="decision"` : libellé `Reco IA` → `Fit Poste` (ligne 276).
- Dans `TabsContent value="decision"` (lignes 387-446), ne garder QUE `FitBreakdownCard` (= "Adéquation selon les critères définis").
- Retirer de cet onglet : `SignalsCard`, `CommunicationProfileCard`, `ProjectComparisonCard`, et la Card "Bilan global" (`executive_summary`). Ces éléments seront déplacés dans le nouvel onglet "Résumé".

## 2. Nouvel onglet "Résumé" en première position

- Nouvelle `TabsTrigger value="summary"` placée en premier (avant `decision`), icône `LayoutDashboard` (ou `Sparkles`), libellé "Résumé".
- `TabsList` passe de `grid-cols-5` à `grid-cols-6`.
- `activeTab` par défaut = `"summary"`.

### Contenu de l'onglet Résumé

Un panneau visuel synthétique avec :

**a) Vue graphique des 4 notes (radar / barres)**
Un composant `ScoresOverviewCard` qui affiche côte à côte les 4 scores déjà calculés ailleurs dans le rapport :
- Fit Poste — `fitScore`
- Big Five — score agrégé dérivé de `report.personality_profile` (même logique que `BigFiveBadge`)
- Orale (paraverbal) — score dérivé de `report.paraverbal_analysis` (même logique que `ParaverbalBadge`)
- Attitude (non-verbal) — score dérivé de `report.nonverbal_analysis` (même logique que `NonverbalBadge`)

Visualisation : Radar chart `recharts` (déjà utilisé dans le projet) avec 4 axes + badges chiffrés en-dessous réutilisant `FitScoreBadge` / `BigFiveBadge` / `ParaverbalBadge` / `NonverbalBadge` pour la cohérence visuelle. Gestion `audioFailed` (les 2 derniers passent en N/A si audio failed, comme aujourd'hui).

**b) Reco IA sur le profil**
Réutilisation des composants déjà existants déplacés depuis l'onglet `decision` :
- `executive_summary` (Card "Bilan global")
- `SignalsCard` (forces / red flags / questions de relance)
- `CommunicationProfileCard`
- `ProjectComparisonCard` (si `projectAverages.count >= 3`)

Ordre proposé dans l'onglet : Radar des 4 notes → Bilan global → SignalsCard → CommunicationProfileCard → ProjectComparisonCard.

## 3. Fichiers touchés

- `src/components/session/SessionReportView.tsx` — modif tabs, déplacement des cards, défaut `activeTab`.
- `src/components/session/ScoresOverviewCard.tsx` — **nouveau**, radar + badges des 4 scores.

Aucune modification SQL, aucune modif des edge functions, aucun changement des données — uniquement réorganisation UI et un nouveau composant de visualisation.

## 4. Hors scope

- Pas de modification des onglets Big Five / Orale / Attitude / Transcription.
- Pas de changement du `DecisionBanner` (qui reste au-dessus des tabs).
- Pas de nouveau calcul de score : on réutilise les scores existants tels qu'ils alimentent déjà les badges.
