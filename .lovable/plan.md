## Ajouter colonne « Sélection » + filtre

### Contexte
Le champ `sessions.recruiter_decision` existe déjà (enum `none` / `shortlisted` / `second_opinion` / `rejected`). Il est aujourd'hui modifiable uniquement depuis la fiche détail d'une session. On l'expose en édition rapide dans la liste.

### Changements (dans `src/pages/ProjectDetail.tsx` uniquement)

**1. Nouvelle colonne « Sélection »** insérée entre `Candidat` et `Statut`.
- Composant : `Select` shadcn avec 4 options + pastille de couleur :
  - `none` → « À traiter » (gris/blanc, bordure)
  - `shortlisted` → « Présélectionner » (vert)
  - `second_opinion` → « 2ᵉ avis » (orange)
  - `rejected` → « Rejeter » (rouge)
- Rendu : trigger compact (h-8) avec un point coloré + libellé. Couleurs via tokens existants (`success`, `warning`, `destructive`, `muted`).
- Update : `supabase.from("sessions").update({ recruiter_decision, recruiter_decision_at, recruiter_decision_by })` puis refetch léger (mise à jour locale optimiste de la ligne).
- `onClick={(e) => e.stopPropagation()}` pour ne pas naviguer en cliquant sur le select.

**2. Nouveau filtre « Sélection »** dans la barre de filtres en haut (à côté du filtre « Recommandation »).
- `Select` shadcn avec : Toutes / À traiter / Présélectionner / 2ᵉ avis / Rejeter.
- État : `decisionFilter` (string), appliqué dans la fonction `filteredSessions` (filter par `s.recruiter_decision`).
- Compteur de filtres actifs incrémenté quand `decisionFilter !== "all"`.
- Bouton « Réinitialiser » remet aussi `decisionFilter` à `"all"`.

**3. Recalcul de l'onglet « À traiter »** : reste basé sur `recruiter_decision === "none"` + rapport présent → cohérent.

### Hors périmètre
- Pas de migration (colonne déjà en place).
- Pas de modification de la fiche détail.
- Pas d'action en masse (sélection multiple) — on ajoutera plus tard si demandé.