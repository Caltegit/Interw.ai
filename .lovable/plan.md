## Objectif

Aujourd'hui, une session type (table `interview_templates`) ne stocke que : nom, description, catégorie, intitulé poste, durée, langue, questions et critères. Tout le reste du projet (avatar, voix, intro, messages, candidat, réglages avancés) est perdu à la sauvegarde et donc non réappliqué à la création d'un projet.

But : qu'une session type contienne **exactement** les mêmes champs qu'un projet, et que "Utiliser cette session" pré-remplisse 100 % du formulaire.

---

## 1. Base de données

Ajouter à `interview_templates` toutes les colonnes manquantes (mêmes noms, mêmes types, mêmes defaults que `projects`) :

- **Étape 1 / IA** : `ai_persona_name`, `ai_voice`, `avatar_image_url`, `tts_provider`, `tts_voice_id`, `tts_voice_gender`
- **Intro** : `intro_enabled`, `intro_mode`, `intro_text`, `intro_audio_url`, `presentation_video_url`
- **IA générative** : `ai_intro_enabled`, `ai_intro_mode`, `ai_intro_custom_text`, `ai_question_transitions_enabled`, `ai_question_transitions_mode`, `ai_question_transitions_custom_text`
- **Réglages session** : `record_audio`, `record_video`, `auto_skip_silence`, `allow_pause`, `allow_skip_question`, `intro_first_screen`, `audio_analysis_enabled`, `show_question_timer`
- **Messages** : `completion_message`, `pre_session_message`
- **Candidat** : `candidate_fields` (jsonb), `candidate_email_subject`, `candidate_email_body`

Toutes nullable / avec defaults identiques aux projets pour ne pas casser les sessions types existantes.

Aucune nouvelle table, RLS/grants inchangés.

## 2. Sauvegarde "Sauver comme session type" (`SaveAsTemplateDialog`)

À partir du projet courant, copier vers `interview_templates` **toutes** les colonnes ci-dessus (lire le projet via `select *`, puis insérer le mapping). Idem pour `interview_template_questions` (déjà OK) et `interview_template_criteria` (déjà OK).

## 3. Édition d'une session type (`InterviewTemplateEdit`)

Aujourd'hui : 3 onglets (Infos / Questions / Critères) avec un formulaire minimal. Remplacer par **le même composant `ProjectForm`** que la création de projet, en mode "template" :

- Ajout d'un prop `mode: "create" | "edit" | "template"` à `ProjectForm` (ou réutilisation simple via `mode="edit"` avec un `onSubmit` qui pointe vers `interview_templates`).
- L'écran d'édition de session type affiche les 5 étapes (Infos, Intro, Questions, Critères, Publier) sans la partie "Publier projet" — bouton final "Enregistrer la session type".
- Les champs propres au projet (statut actif/archivé, destinataires/visibilité, slug) sont masqués pour les sessions types.

Ainsi tout ce qu'on configure (intro vidéo/audio/TTS, persona, voix, transitions IA, email candidat, etc.) est édité et stocké.

## 4. Application d'une session type (`loadInterviewTemplate` + `mergeTemplateIntoState`)

Étendre le payload `InterviewTemplatePayload` avec tous les nouveaux champs, et compléter `mergeTemplateIntoState` pour les réinjecter dans le `ProjectFormState` à la création/duplication d'un projet (`/projects/new?template=...`).

Les URLs media (avatar, intro audio/vidéo) sont copiées telles quelles ; pas de re-upload nécessaire — le nouveau projet partage les fichiers de la session type.

## 5. Duplication (`InterviewTemplates`)

`handleDuplicate` recopie déjà toutes les colonnes via `...rest` après un `select *` — fonctionnera automatiquement avec les nouvelles colonnes.

## 6. Migration des sessions types existantes

Aucune donnée à migrer : les colonnes ajoutées prennent leurs valeurs par défaut (identiques au projet par défaut). Les anciennes sessions types restent utilisables et appliqueront simplement les defaults pour les nouveaux champs.

---

## Détails techniques

- Fichiers modifiés :
  - migration SQL : `ALTER TABLE public.interview_templates ADD COLUMN ...` (~25 colonnes).
  - `src/components/project/InterviewTemplatePickerDialog.tsx` : étendre `InterviewTemplatePayload`.
  - `src/components/project/loadInterviewTemplate.ts` : retourner les nouveaux champs.
  - `src/components/project/ProjectForm.tsx` : élargir `mergeTemplateIntoState` ; ajouter un mode "template" qui masque les champs non pertinents et change le bouton final.
  - `src/components/project/SaveAsTemplateDialog.tsx` : insérer tous les champs du projet dans `interview_templates`.
  - `src/pages/InterviewTemplateEdit.tsx` : remplacer le formulaire actuel par `ProjectForm` en mode template (`load` initial depuis `interview_templates`, `onSubmit` -> `update` sur `interview_templates` + remplacement des questions/critères, comme aujourd'hui).
  - `src/integrations/supabase/types.ts` : régénéré automatiquement après migration.

## Hors scope

- Pas de changement aux tables `interview_template_questions` / `interview_template_criteria` (déjà complètes).
- Pas de nouvelle UI dans la bibliothèque, juste un formulaire plus complet.
- Pas de duplication des fichiers media (avatar/audio/vidéo) — les URLs sont partagées.
