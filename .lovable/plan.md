
## Objectif

Ajouter, dans l'onglet **Fit Poste** du rapport de session, **après** l'existant, un tableau matriciel :

- **Lignes** : les questions posées (Q1, Q2, …)
- **Colonnes** : les critères d'évaluation du projet (étape 2)
- **Cases** : une note 0-100, colorée selon le niveau, cliquable pour voir la justification IA + citation + saut vidéo
- **Bord droit** : moyenne pondérée de chaque question (score global de la question sur les critères)
- **Bord bas** : moyenne pondérée par critère (cohérent avec le Fit Poste existant)

L'existant (`FitBreakdownCard`) reste intact au-dessus.

## Rapports existants sans matrice

Un bouton **« Voir les détails »** s'affiche à la place du tableau. Au clic :
- appelle la nouvelle fonction serveur qui génère la matrice
- rafraîchit le rapport pour afficher le tableau
- état de chargement pendant la génération (30-60 s)

## Détails techniques

### Nouvelle edge function `supabase/functions/generate-fit-matrix/index.ts`

- Input : `session_id`
- Charge `report + session + criteria + questions + session_messages`
- Regroupe les réponses candidat par `question_id`
- Appelle l'IA (Gemini 2.5 Pro, fallback Flash) avec tool schema `fit_matrix { rows: [{ question_index, cells: [{ criterion, score, justification, quote?, message_id? }] }] }`
- Normalise sur `questions[]` × `criteria[]`, indexé par `question_id` / `criterion_id`
- Persiste dans `reports.stats.fit_matrix = { version, generated_at, criteria: [{id,label,weight}], rows: [{question_id, question_index, question_content, cells: { [criterion_id]: {score, justification, quote?, message_id?} }}] }`
- Aucune migration SQL (JSONB dans `reports.stats`)

### Modification `generate-report/index.ts`

- Après l'insertion du rapport, invocation fire-and-forget de `generate-fit-matrix` (n'allonge pas la génération du rapport). Si l'appel échoue, le bouton « Voir les détails » reste dispo côté UI.

### Frontend

- **Nouveau** `src/components/session/FitMatrixCard.tsx` :
  - props : `matrix`, `onGoToMessage`
  - tableau responsive (scroll horizontal si beaucoup de critères)
  - cellules colorées par palier (excellent/solid/partial/gap)
  - Popover shadcn au clic → justification + citation + bouton "Voir la vidéo" via `onGoToMessage`
  - dernière colonne = moyenne pondérée par question ; dernière ligne = moyenne pondérée par critère
- **`SessionReportView.tsx`**, dans `<TabsContent value="decision">`, sous `<FitBreakdownCard>` :
  - si `stats.fit_matrix?.rows?.length` → `<FitMatrixCard …/>`
  - sinon → carte « Voir les détails » : bouton qui invoque `generate-fit-matrix` + `queryClient.invalidateQueries` pour recharger

### Compatibilité

- Anciens rapports : bouton « Voir les détails » à la demande
- Nouveaux rapports : matrice générée automatiquement en arrière-plan
- Aucun changement à `fit_score` / `overall_score`
