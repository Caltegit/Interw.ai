## Pagination configurable sur la liste des sessions

Sur `src/pages/ProjectDetail.tsx`, onglet « Candidats », ajouter un sélecteur de taille de page à côté du « Précédent / Suivant » déjà présent en bas de la liste.

### Comportement
- Choix : 10, 25, 50, 100 sessions par page.
- Valeur par défaut : **25** (actuellement codé en dur à 50).
- Si on change la taille, on revient à la page 1 pour éviter d'être hors limites.
- Le bloc de pagination s'affiche dès qu'il y a plus de sessions que la taille choisie (même règle qu'aujourd'hui).

### Détails techniques
- Remplacer `const PAGE_SIZE = 50` (ligne 202) par un state `const [pageSize, setPageSize] = useState(25)`.
- Mettre à jour les calculs `totalSessionsPages` et `pagedSessions` (lignes 655-656) pour utiliser `pageSize`.
- Dans le footer de pagination (lignes 1251-1265) :
  - À gauche du `Page X / Y`, ajouter un `Select` shadcn compact avec les options 10 / 25 / 50 / 100 et le label « par page ».
  - `onValueChange` → `setPageSize(n); setPage(0)`.
- Aucun changement de logique métier, juste UI + state local.