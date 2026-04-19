

## Plan : Uniformiser l'ajout de question (création projet ↔ bibliothèque)

### Contexte

Aujourd'hui dans la création/édition de projet (`StepQuestions.tsx`), ajouter une question se fait **inline** (la question se déplie dans la liste). Dans la bibliothèque (`QuestionLibraryManager.tsx`), l'ajout se fait via une **pop-up** (Dialog) plus structurée.

Objectif : aligner le projet sur le même UX que la bibliothèque → ouvrir une pop-up identique.

### Approche

1. **Extraire le formulaire** de la pop-up existante de `QuestionLibraryManager.tsx` dans un composant réutilisable `QuestionFormDialog.tsx` (champs : titre, contenu, catégorie, type média écrit/audio/vidéo + enregistreur, relance IA, max relances).

2. **Adapter `StepQuestions.tsx`** :
   - Remplacer le bouton "Ajouter une question" inline par un bouton qui ouvre `QuestionFormDialog`.
   - À la validation de la pop-up, push la question dans la liste (même structure `Question` que actuellement).
   - Garder l'option "Sauver dans la bibliothèque" (case à cocher) déjà présente dans le projet.
   - Garder l'édition inline existante des questions déjà ajoutées (ou ouvrir la même pop-up en mode édition — voir question ci-dessous).

3. **Garder intact** :
   - La sélection depuis la bibliothèque (`QuestionLibraryDialog`) — bouton séparé.
   - Le drag-and-drop de réorganisation.
   - La logique d'upload audio/vidéo lors du save du projet.

### Fichier(s) modifié(s)

- **Nouveau** : `src/components/QuestionFormDialog.tsx` (composant partagé)
- **Modifié** : `src/components/QuestionLibraryManager.tsx` (utilise le nouveau composant)
- **Modifié** : `src/components/project/StepQuestions.tsx` (utilise le nouveau composant pour ajouter)

### Question à clarifier

Pour l'**édition d'une question déjà ajoutée** dans le projet : on garde l'édition inline actuelle, ou on ouvre la même pop-up ?

