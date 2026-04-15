

# Bibliothèque de questions prédéfinies

## Objectif
Permettre au recruteur de maintenir une bibliothèque de questions réutilisables, et de les insérer rapidement lors de la création/édition d'un projet.

## Architecture

### 1. Base de données
Nouvelle table `question_templates` :
- `id` (uuid, PK)
- `organization_id` (uuid, lié à l'organisation)
- `content` (text, le texte de la question)
- `category` (text, nullable — ex: "Motivation", "Technique", "Soft skills")
- `follow_up_enabled` (boolean, default true)
- `max_follow_ups` (integer, default 2)
- `created_by` (uuid)
- `created_at` (timestamptz)

RLS : accès limité aux membres de la même organisation via `get_user_organization_id()`.

### 2. Gestion de la bibliothèque (Settings)
Ajout d'un onglet "Bibliothèque de questions" dans la page Paramètres (`/settings`) :
- Liste des questions groupées par catégorie
- Formulaire d'ajout (contenu + catégorie)
- Modification et suppression
- Filtre/recherche

### 3. Sélecteur dans le stepper (StepQuestions)
Ajout d'un bouton "Choisir depuis la bibliothèque" à côté du bouton "Ajouter" :
- Ouvre un dialog/popover avec la liste des templates
- Recherche et filtre par catégorie
- Sélection multiple possible
- Les questions sélectionnées sont ajoutées au formulaire avec leurs paramètres (follow_up, etc.)

### 4. Fichiers impactés

| Fichier | Modification |
|---|---|
| Migration SQL | Création table `question_templates` + RLS |
| `src/pages/Settings.tsx` | Nouvel onglet bibliothèque |
| `src/components/project/StepQuestions.tsx` | Bouton + dialog de sélection |
| Nouveau composant `QuestionLibraryDialog.tsx` | Dialog de sélection des templates |
| Nouveau composant `QuestionLibraryManager.tsx` | CRUD dans Settings |

### 5. Étapes d'implémentation
1. Migration : créer la table `question_templates` avec RLS
2. Créer le composant de gestion dans Settings (CRUD)
3. Créer le dialog de sélection depuis la bibliothèque
4. Intégrer le dialog dans `StepQuestions` et `ProjectEdit`

