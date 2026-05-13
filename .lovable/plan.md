## Nouveau statut « Oui » (vert foncé) après « En cours »

Ordre final dans la catégorie Sélection : **À traiter → Non → À discuter → Retenu → En cours → Oui**

### 1. Migration BDD

Ajouter la valeur `accepted` à l'enum `recruiter_decision_type`, **après** `in_progress` :

```sql
ALTER TYPE public.recruiter_decision_type ADD VALUE 'accepted' AFTER 'in_progress';
```

(Postgres ne permet pas d'insérer après une valeur d'enum dans la même transaction qu'une utilisation — ok ici car on n'utilise pas la valeur immédiatement.)

### 2. Tokens couleur (`src/index.css` + `tailwind.config.ts`)

- **`--success`** (Retenu) : passe d'un vert moyen à un vert plus clair.
  - Light : `160 84% 39%` → `152 60% 52%`
  - Dark : ajuster l'équivalent dans `.dark`
- **`--success-strong`** : nouveau token vert foncé pour « Oui ».
  - Light : `152 70% 30%`
  - Dark : `152 60% 38%`
- `--success-strong-foreground` : `0 0% 100%`
- Ajouter `success-strong` dans `tailwind.config.ts` (mêmes mappings DEFAULT/foreground que `success`).

### 3. Code TypeScript

**`src/hooks/queries/useSessionDetail.ts`** (l. 105) — étendre le type :
```ts
export type RecruiterDecision = "none" | "in_progress" | "shortlisted" | "rejected" | "second_opinion" | "accepted";
```

**`src/pages/ProjectDetail.tsx`** :
- `DECISION_KEYS` (l. 153) → ajouter `"accepted"` à la fin
- `DEFAULT_VISIBLE_DECISIONS` (l. 154) → idem
- `decisionOptions` (l. 535-540) → ajouter `{ value: "accepted", label: "Oui", dot: "bg-success-strong", text: "text-success-strong" }`

**`src/components/session/DecisionBanner.tsx`** :
- `decisionConfig` (l. 70-73) → ajouter `accepted: { label: "Oui", tone: "bg-success-strong text-success-strong-foreground" }`
- Étendre le type `tone` pour inclure `"success-strong"`
- Ajouter un `DecisionButton` après « En cours » (icône `ThumbsUp` ou `CheckCheck` de lucide)

**`src/components/project/SessionCard.tsx`** :
- Étendre le type `tone`
- Ajouter `decisionBtn("accepted", "Oui", ThumbsUp, "success-strong")` après « En cours »

**`src/pages/SessionDetail.tsx`** (l. 272-275) :
- Ajouter `else if (d === "accepted") toast({ title: "Candidat accepté." });`

### 4. Vérification

- `tsc --noEmit` doit passer.
- Inspection visuelle de la palette (Retenu plus clair, Oui plus foncé que Retenu).

### Hors périmètre

- Pas de changement dans le rapport généré ni dans les emails.
- Pas de regénération de la liste des décisions historiques.