## Objectif
Ajouter un nouveau statut **« En cours »** entre « À traiter » et « Retenu » dans la sélection des candidats, en bleu clair.

## Changements

### 1. Base de données — migration
Ajouter la valeur `in_progress` à l'enum `recruiter_decision_type` (entre `none` et `shortlisted`).
```sql
ALTER TYPE public.recruiter_decision_type ADD VALUE 'in_progress' BEFORE 'shortlisted';
```

### 2. Design system — token bleu clair
Ajouter un token sémantique `info` dans `src/index.css` (light + dark) et `tailwind.config.ts`, calé sur un bleu clair (~`hsl(210 90% 56%)` clair / `hsl(210 85% 65%)` dark) avec son `info-foreground`.

### 3. UI — ajouter l'option dans la liste de sélection
- `src/pages/ProjectDetail.tsx`
  - `DECISION_KEYS` et `DEFAULT_VISIBLE_DECISIONS` : insérer `"in_progress"` après `"none"`.
  - `decisionOptions` : ajouter `{ value: "in_progress", label: "En cours", dot: "bg-info", text: "text-info" }` en 2ᵉ position.
- `src/hooks/queries/useSessionDetail.ts` : étendre `RecruiterDecision` avec `"in_progress"`.
- `src/components/session/DecisionBanner.tsx`
  - Étendre le type `RecruiterDecision`.
  - Ajouter l'entrée dans `decisionConfig` (`label: "En cours"`, tone bleu clair).
  - Ajouter un bouton dans la barre d'action (entre l'état neutre et « Retenu »).
- `src/components/project/SessionCard.tsx` : ajouter le bouton « En cours » avant « Retenu ».
- `src/pages/SessionDetail.tsx` : ajouter un toast `"Candidat en cours."` dans `handleDecision`.

### 4. Vérification
- Recharger `ProjectDetail` → onglet Sélection : le nouvel onglet « En cours » apparaît en 2ᵉ position avec une pastille bleu clair, le filtre fonctionne.
- Sur `SessionDetail` : le bouton « En cours » est cliquable, persiste, et affiche le badge bleu clair.

## Hors scope
- Pas de migration de données existantes : aucune session n'a encore ce statut.
- Pas de modification des emails ou rapports.
