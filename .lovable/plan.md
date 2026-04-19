

Ajouter un 3e filtre (après Recherche + Catégorie) dans `QuestionLibraryManager.tsx` : un `Select` "Type" avec options Toutes / Texte / Audio / Vidéo, filtrant sur `t.type` (`written` / `audio` / `video`).

Fichier modifié : `src/components/QuestionLibraryManager.tsx`
- Ajout state `filterType` (default `"all"`)
- Ajout `<Select>` à côté du filtre catégorie
- Ajout condition dans `filtered` : `(filterType === "all" || t.type === filterType)`

Test : ouvrir la page Bibliothèque de questions → vérifier que les 3 filtres fonctionnent ensemble.

