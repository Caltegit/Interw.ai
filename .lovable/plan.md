## Modifications page projet (`/projects/:id`)

### 1. Remplacer le bloc « Détails du projet »

Supprimer le `Collapsible` « Détails du projet » (lignes ~488-506) et le remplacer par une barre de filtres rapides « Sélection » avec 4 boutons à bascule (toggle), un par décision recruteur :

- **À traiter** (gris)
- **Présélectionner** (vert)
- **2e avis** (orange)
- **Rejeter** (rouge)

Chaque bouton affiche le libellé, la pastille de couleur et le compteur de sessions correspondantes. Clic = afficher / masquer cette catégorie.

**Comportement par défaut** : « À traiter », « Présélectionner » et « 2e avis » activés ; « Rejeter » désactivé.

État persisté en `localStorage` par projet (`projectDecisionVisibility:{id}`) pour conserver le choix.

### 2. Filtrage des sessions

Le filtre existant `decisionFilter` (Select dans le Popover) reste, mais la nouvelle barre agit en plus comme un filtre multi-valeurs sur `recruiter_decision`. Les sessions dont la décision n'est pas dans l'ensemble visible sont masquées (table + cartes).

### 3. Pagination : 50 par page

Passer `PAGE_SIZE` de `20` à `50` (ligne 81).

### Détails techniques

- Nouveau state : `const [visibleDecisions, setVisibleDecisions] = useState<Set<string>>(...)` initialisé depuis `localStorage` avec fallback `{none, shortlisted, second_opinion}`.
- `useEffect` pour persister à chaque changement.
- Ajouter dans `filteredSessions` : `list = list.filter(s => visibleDecisions.has(s.recruiter_decision ?? "none"))`.
- UI : remplacer le `Collapsible` par un `<div className="flex flex-wrap gap-2">` avec 4 boutons style chip (réutilise `decisionOptions` déjà défini ligne 387).

### Fichier modifié

- `src/pages/ProjectDetail.tsx` (uniquement)
