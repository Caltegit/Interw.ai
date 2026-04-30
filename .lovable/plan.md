## Objectif

Rendre l'affichage du lien « Passer la question » optionnel côté projet. Par défaut, l'option est **activée** (comportement actuel préservé). L'option est placée **juste sous** « Autoriser le candidat à mettre en pause » dans l'étape Info de la création/édition de projet.

## Modifications

### 1. Base de données
Migration : ajouter une colonne booléenne `allow_skip_question` sur `projects`, par défaut `true`. Aucune mise à jour des lignes existantes nécessaire (le défaut s'applique).

### 2. `src/components/project/ProjectForm.tsx`
- Ajouter `allowSkipQuestion: boolean` à l'interface des valeurs initiales et au state local.
- Inclure `allowSkipQuestion` dans le payload `onSubmit`.
- Ajouter un bloc Switch **directement après** « Autoriser le candidat à mettre en pause » (avant le Statut) :
  - Label : « Autoriser le candidat à passer une question »
  - Description courte : « Affiche un lien discret « Passer la question » pendant l'entretien. »
- Ajouter une ligne dans le récapitulatif final (« Passage de question autorisé : Oui / Non »).

### 3. `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx`
- Valeur par défaut `allowSkipQuestion: true` dans `ProjectNew`.
- Lecture `allow_skip_question ?? true` dans `ProjectEdit`.
- Ajouter `allow_skip_question: s.allowSkipQuestion` dans les payloads d'insert/update.

### 4. `src/pages/InterviewStart.tsx`
- Conditionner l'affichage du bouton/lien « Passer la question » par `project?.allow_skip_question !== false`.
- Conserver la miniature vidéo mobile dans la même rangée même quand le lien est masqué (le `flex justify-between` reste valide avec un seul enfant à gauche).
- Important : si l'option est désactivée, le mécanisme automatique d'escalade (`silenceTier >= 3`) qui propose le bouton ne doit pas non plus apparaître — on respecte le choix RH.

### 5. Types Supabase
Le fichier `src/integrations/supabase/types.ts` se régénère automatiquement après migration.

## Détails techniques

- Comportement de migration : `DEFAULT true` garantit que tous les projets existants conservent le lien actif sans intervention.
- Le test e2e `interview-media-no-overlap` n'est pas impacté (il ne dépend pas du bouton skip).
- Aucune modification visuelle du lien lui-même (style et position inchangés quand l'option est activée).
