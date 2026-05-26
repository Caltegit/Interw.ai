## Contexte
Ajouter une option toggle "Afficher le timer sur les questions" dans les fonctionnalités avancées de la création/modification de projet. Quand désactivée, le candidat voit une indication statique du temps imparti (ex: "Réponse en 1 min") au lieu du décompte en temps réel. Le décompte reprend automatiquement dès qu'il reste 20 secondes ou moins.

## Étapes techniques

### 1. Migration base de données
- Ajouter la colonne `show_question_timer` (boolean, DEFAULT true) à la table `projects`.
- Cette colonne contrôle l'affichage du timer pendant la session candidat.

### 2. Formulaire de projet (`ProjectForm.tsx`)
- Ajouter `showQuestionTimer: boolean` dans l'interface `ProjectFormState`.
- Ajouter un état local `showQuestionTimer` initialisé depuis `initial.showQuestionTimer`.
- Ajouter un toggle Switch dans la section "Fonctionnalités avancées" (step 0), sous "Autoriser le candidat à passer une question".
- Libellé : "Afficher le timer sur les questions" avec description "Quand désactivé, le candidat voit seulement une indication statique du temps imparti. Le décompte reprend automatiquement à 20 secondes restantes."
- Inclure `showQuestionTimer` dans l'objet transmis à `handleSubmit`.

### 3. Création de projet (`ProjectNew.tsx`)
- Ajouter `showQuestionTimer: true` dans l'`initialState` par défaut.
- Insérer `show_question_timer: s.showQuestionTimer` lors de la création du projet dans la base.

### 4. Modification de projet (`ProjectEdit.tsx`)
- Lire `(project as { show_question_timer?: boolean }).show_question_timer ?? true` lors du chargement et l'assigner à `showQuestionTimer` dans l'état initial.
- Inclure `show_question_timer: s.showQuestionTimer` dans l'objet de mise à jour envoyé à Supabase.

### 5. Session d'entretien (`InterviewStart.tsx`)
- Lire la valeur `show_question_timer` depuis le projet chargé.
- Modifier le rendu du `TimerBadge` (ligne ~3847) :
  - Si `showQuestionTimer` est **true** → comportement actuel (badge avec décompte `mm:ss` qui pulse quand critique/final).
  - Si `showQuestionTimer` est **false** et `remaining > 20` → afficher un badge statique avec le texte "Réponse en Xm" (ou "Xs" si moins d'une minute) dans le même style visuel (bordure, fond muted, etc.) mais sans chiffre de décompte. Pas de `aria-live` ni d'animation pulse.
  - Si `showQuestionTimer` est **false** et `remaining <= 20` → reprendre l'affichage normal du décompte (avec pulse critique/final exactement comme actuellement).
- Le texte statique sera calculé à partir de `configuredMax` (ex: 60s → "Réponse en 1 min", 120s → "Réponse en 2 min", 90s → "Réponse en 1 min 30").

## Fichiers modifiés
- `supabase/migration` (ajout colonne)
- `src/components/project/ProjectForm.tsx`
- `src/pages/ProjectNew.tsx`
- `src/pages/ProjectEdit.tsx`
- `src/pages/InterviewStart.tsx`