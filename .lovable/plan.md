## Objectif

Sur la liste des projets : remplacer l'action « Supprimer » par « Archiver », ajouter un bouton « Archives » en haut à droite menant à une page dédiée, et supprimer complètement le statut « Brouillon ».

## Changements

### 1. Liste des projets (`src/pages/Projects.tsx`)

- Header en `flex justify-between` :
  - À gauche : bouton **Nouveau projet** (existant)
  - À droite : nouveau bouton **Archives** (variant `outline`, icône `Archive`) → lien vers `/projects/archives`
- N'afficher que les projets non archivés (`status !== 'archived'`)
- Colonne « Statut » supprimée (puisque tous les projets affichés sont actifs)
- Dernière colonne renommée « Archiver » : icône `Archive` (lucide), couleur normale (plus rouge)
- Action : confirmation via `AlertDialog` (« Archiver le projet ? Il sera déplacé dans les archives, vous pourrez le restaurer à tout moment. ») puis `update({ status: 'archived' })`
- Toast « Projet archivé » avec invalidation des queries

### 2. Nouvelle page `src/pages/ProjectsArchives.tsx`

- Même structure de tableau que `Projects.tsx` mais filtrée sur `status = 'archived'`
- Header : bouton retour « ← Projets actifs »
- Colonnes : Titre, Sessions, Archivé depuis, Restaurer, Supprimer
- **Restaurer** : icône `ArchiveRestore` → repasse `status = 'active'`
- **Supprimer** (définitif) : icône `Trash2` rouge → confirmation puis `rpc('delete_project')`

### 3. Route

- Ajouter `/projects/archives` dans `src/App.tsx` (layout RH protégé)

### 4. Suppression du statut « Brouillon »

- **Migration** : `UPDATE projects SET status = 'active' WHERE status = 'draft'`
  (l'enum reste en place pour éviter de casser les types Supabase générés ; aucune nouvelle écriture ne créera de draft)
- `src/pages/ProjectDetail.tsx` ligne 380 : duplication crée le projet en `'active'` au lieu de `'draft'`
- `src/pages/ProjectDetail.tsx` ligne 455 : retirer l'entrée `draft` du label
- `src/components/project/ProjectForm.tsx` ligne 742 : retirer `<SelectItem value="draft">Brouillon</SelectItem>`
- `src/components/project/ProjectForm.tsx` ligne 963 : simplifier l'affichage (Actif / Archivé)
- `src/pages/ProjectEdit.tsx` : type cast laissé tel quel (l'enum existe toujours côté DB)

### 5. Hook `useProjectsList`

- Aucun changement de signature ; le filtre archivé / actif sera fait côté composant pour réutiliser la même query (déjà mise en cache)
