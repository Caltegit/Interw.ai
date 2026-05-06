## Objectif
Faire en sorte que le rapport accessible via lien partagé (`/r/:token`, `SharedReport.tsx`) ait exactement le même contenu et la même mise en page que le rapport vu côté recruteur (`/sessions/:id`, `SessionDetail.tsx`), à l'exception des éléments réservés au recruteur.

## Constat
Aujourd'hui les deux pages divergent fortement :

| Bloc | SessionDetail (interne) | SharedReport (lien) |
|---|---|---|
| En-tête « Decision banner » (verdict, fit score, headline, recommandation) | ✅ `DecisionBanner` | ❌ `OverviewHeader` basique |
| Decision drivers (forces/faiblesses cliquables) | ✅ `DecisionDriversCard` | ❌ liste simple |
| Fit breakdown par critère | ✅ `FitBreakdownCard` | ❌ barres `bg-primary` génériques |
| Signaux (red flags, follow-ups) | ✅ `SignalsCard` | ❌ absent |
| Profil de communication | ✅ `CommunicationProfileCard` | ❌ absent |
| Comparaison projet | ✅ `ProjectComparisonCard` | ❌ absent |
| Analyse profonde (personnalité, soft skills) | ✅ `DeepAnalysisAccordion` | ❌ absent |
| Onglet Réponses (Q/R fusionnées) | ✅ `QuestionAnswerRow` | ❌ liste vidéo brute |
| Onglet Transcription | ✅ `VirtualizedMessageList` | ✅ `SimpleMessageList` |
| Best-of | ✅ panneau latéral | ✅ onglet séparé |
| Disclaimer IA | ✅ | ❌ |

## Approche
Réécrire `src/pages/SharedReport.tsx` pour reprendre la même structure que `SessionDetail.tsx`, en retirant uniquement les actions recruteur :
- pas de bouton « Retour au projet »
- pas de boutons de décision (`DecisionBanner` en mode lecture seule)
- pas de bouton partager / régénérer / télécharger
- pas de zone « Notes recruteur »
- pas de bouton « Re-transcrire »
- pas de navigation vers un message (les `onGoToMessage` deviennent des no-ops, ou on garde le scroll local)

## Étapes

1. **Refactor `SharedReport.tsx`**
   - Charger en plus : `report_shares` → `reports` → `sessions(*, projects(*, questions))` → `session_messages` (déjà fait) + récupérer `project_id` pour la moyenne projet.
   - Calculer les mêmes dérivés que `SessionDetail` : `candidateMainVideos`, `sessionClips`, `questionItems`, `stats`, `criteriaScores`, `questionEvaluations`, `verdictHeadline`, `fitScore`.
   - Réutiliser : `DecisionBanner`, `DecisionDriversCard`, `FitBreakdownCard`, `SignalsCard`, `CommunicationProfileCard`, `ProjectComparisonCard`, `DeepAnalysisAccordion`, `QuestionAnswerRow`, `VirtualizedMessageList`, `SessionVideoNavigator`, `HighlightReelPlayer`, `AiAnalysisDisclaimer`.
   - Layout identique : 3 onglets `Décision / Réponses / Transcription` + panneau latéral `Navigation vidéo` + `Best-of`.

2. **`DecisionBanner` en mode lecture seule (lien public)**
   - Ajouter une prop `readOnly?: boolean`. Quand `true` :
     - masquer les boutons Présélectionner / Rejeter / 2e avis / Annuler
     - masquer Partager / Copier lien / Régénérer / Télécharger vidéos
     - garder verdict, fit score, headline, recommandation, durée, nombre de réponses, rank label
   - Aucune autre page n'est modifiée (props additive).

3. **`useProjectAverages` accessible en anonyme**
   - Vérifier que le hook fonctionne sans `auth.uid()`. Si la requête nécessite l'utilisateur connecté, l'appeler quand même (RLS `sessions`/`reports` autorisent `anon` en lecture pour les rapports partagés). Sinon, fallback : ne pas afficher `ProjectComparisonCard` côté lien (acceptable, mais à tester d'abord).

4. **Navigation vers un message depuis les cartes**
   - `onGoToMessage` reste fonctionnel : il bascule sur l'onglet Transcription et scrolle. Identique à l'interne.

5. **QA**
   - Ouvrir un lien `/r/:token` existant et vérifier visuellement qu'il rend la même chose que `/sessions/:id` côté recruteur, sans les actions.
   - Vérifier que le rapport reste accessible sans authentification (RLS `anon`).

## Fichiers modifiés
- `src/pages/SharedReport.tsx` — réécriture complète
- `src/components/session/DecisionBanner.tsx` — ajout prop `readOnly`

Aucune migration DB nécessaire.
