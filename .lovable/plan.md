# Corriger la duplication de projet

## Problème constaté

Dans `src/pages/ProjectDetail.tsx` (fonction `handleDuplicate`, lignes 442-520), seuls quelques champs du projet sont recopiés. Les blocs suivants sont oubliés :

- **Réglages projet** : `auto_skip_silence`, `allow_pause`, `allow_skip_question`, `intro_first_screen`, `audio_analysis_enabled`, `completion_message`, `pre_session_message`, `tts_provider`, `tts_voice_id`, `tts_voice_gender`
- **Intro** : `intro_enabled`, `intro_mode`, `intro_text`, `presentation_video_url` (seul `intro_audio_url` est copié)
- **IA conversation** : `ai_intro_enabled`, `ai_intro_mode`, `ai_intro_custom_text`, `ai_question_transitions_enabled`, `ai_question_transitions_mode`, `ai_question_transitions_custom_text`
- **Questions** : champ `avatar_image_url` oublié
- **Critères** : OK, mais le champ `scoring_criteria_ids` des questions (qui pointe vers des IDs de critères) n'est pas remappé vers les nouveaux IDs de critères du projet copié → lien fantôme vers l'ancien projet

## Correctifs

### 1. `src/pages/ProjectDetail.tsx` — `handleDuplicate`

**a. Insert du nouveau projet** : recopier tous les champs de configuration listés ci-dessus depuis `project`.

**b. Critères avant questions** : insérer les critères en premier avec `.select()` pour récupérer les nouveaux IDs, et construire une map `ancienCritereId → nouveauCritereId`.

**c. Questions** : ajouter `avatar_image_url` et remapper `scoring_criteria_ids` via la map ci-dessus (sinon les questions copiées pointent vers les critères de l'ancien projet).

**d. Statut** : conserver `status: "active"` comme actuellement (le toast dit "brouillon" mais le code crée en active — corriger le toast en "Le nouveau projet a été créé.").

## Indépendance entre projet original et copie

- Les **lignes en base** (projects, questions, evaluation_criteria) seront totalement séparées : nouveaux UUID, aucune FK partagée, `scoring_criteria_ids` remappés.
- Les **fichiers média** (avatar, intro audio/vidéo, médias de questions) resteront référencés via la même URL Supabase Storage. C'est volontaire et sans risque : ces fichiers ne sont pas supprimés quand un projet est effacé, donc la copie reste fonctionnelle même si l'original est supprimé. Dupliquer physiquement les fichiers serait coûteux et n'apporte rien tant qu'on ne purge pas le storage par projet.

## Détails techniques

```ts
// 1. insert projet — recopier TOUTES les colonnes de config
// 2. insert critères → récupérer mapping ids
// 3. insert questions avec scoring_criteria_ids remappés + avatar_image_url
```

Aucune migration DB nécessaire.
