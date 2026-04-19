

## Plan — Bibliothèque d'entretiens types

### Concept

Permettre au recruteur de créer/sauvegarder des **modèles d'entretiens complets** (un set cohérent : titre + description + liste de questions + critères d'évaluation + niveaux de relance) qu'il peut ensuite appliquer en 1 clic à un nouveau projet, plutôt que de tout reconstruire à chaque fois.

Exemples : "Entretien Commercial Junior", "Entretien Développeur Senior", "Entretien Manager", "Entretien Stage RH"...

### 1. Nouvelle table DB : `interview_templates`

Migration SQL pour créer :
- `id`, `organization_id`, `created_by`, `created_at`
- `name` (ex: "Entretien Commercial Junior")
- `description` (résumé du modèle)
- `category` (ex: Commercial / Tech / Management / RH...)
- `job_title` (intitulé poste suggéré)
- `default_duration_minutes`, `default_language`
- RLS : visible/modifiable par les membres de l'org.

Plus 2 tables liées (snapshot des questions/critères du modèle, indépendantes des projets) :
- `interview_template_questions` : id, template_id, order_index, title, content, type (written/audio/video), audio_url, video_url, category, follow_up_enabled, max_follow_ups, relance_level
- `interview_template_criteria` : id, template_id, order_index, label, description, weight, scoring_scale, applies_to, anchors

### 2. Nouvelle page `/library/interviews` — gestion des entretiens types

Composant `InterviewTemplatesManager` :
- Liste des modèles avec filtre par catégorie + recherche.
- Cards : nom, catégorie, nb de questions, nb de critères, durée, badge "X questions / Y critères".
- Actions : Créer, Dupliquer, Modifier, Supprimer.
- Ajouter l'item dans la sidebar `AppSidebar` ("Entretiens types") sous "Bibliothèque".

### 3. Éditeur de modèle (`InterviewTemplateEditor`)

Mini-wizard ou page unique avec onglets :
- **Infos** : nom, description, catégorie, job_title, durée, langue.
- **Questions** : réutilise la logique de `StepQuestions` (ajout manuel, depuis bibliothèque questions, drag&drop ordre, niveaux relance).
- **Critères** : réutilise la logique de `StepCriteria`.

Pas d'IA / d'avatar / de candidat ici — juste le contenu pédagogique du modèle.

### 4. Intégration côté création de projet

Dans `ProjectNew.tsx`, ajouter une **étape 0** ou un bandeau en tête de l'étape 1 :
> "Démarrer à partir d'un entretien type ?" → bouton "Choisir un modèle".

Dialog `InterviewTemplatePickerDialog` :
- Liste filtrable des modèles de l'org.
- Aperçu (questions + critères + durée).
- Bouton "Utiliser ce modèle" → pré-remplit tous les champs du wizard (titre, description, questions, critères, durée, langue, niveaux de relance).
- L'utilisateur peut ensuite tout modifier librement avant de créer le projet.

### 5. Sauvegarder un projet existant comme modèle

Dans `ProjectDetail.tsx` (ou `ProjectEdit.tsx`), bouton **"Sauvegarder comme entretien type"** → dialog demandant nom + catégorie → snapshot des questions + critères du projet vers `interview_templates`.

### 6. Seed (optionnel — recommandé)

Comme pour `question_templates` et `criteria_templates`, ajouter une fonction `seed_default_interview_templates(_org_id, _user_id)` qui crée 3-5 entretiens types prêts à l'emploi à la création d'une org :
- "Entretien Commercial",
- "Entretien Développeur",
- "Entretien Manager",
- "Entretien Stage / Alternance",
- "Entretien découverte générique".

Appelée depuis `accept_invitation` et `trg_seed_on_owner_set` (à côté des seeds existants).

### Fichiers touchés

- Migration SQL (3 tables + RLS + fonction seed).
- `src/pages/InterviewTemplates.tsx` (nouvelle page liste).
- `src/pages/InterviewTemplateEdit.tsx` (nouvelle page éditeur).
- `src/components/library/InterviewTemplatesManager.tsx`.
- `src/components/project/InterviewTemplatePickerDialog.tsx`.
- `src/components/AppSidebar.tsx` (ajout item menu).
- `src/App.tsx` (routes).
- `src/pages/ProjectNew.tsx` (intégration picker).
- `src/pages/ProjectDetail.tsx` (bouton "sauvegarder comme modèle").

### Hors scope

- Partage de modèles entre organisations (gardé privé à l'org).
- Marketplace publique de modèles.
- Voix ElevenLabs.

### Question avant de coder

3 points à valider :

