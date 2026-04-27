## Contexte

Lors de la modification d'un projet, l'utilisateur supprime des questions, mais elles continueraient d'apparaître / être jouées en session candidat.

## Analyse de la base

Le mécanisme côté édition (`ProjectEdit.tsx`) et côté lecture (`InterviewStart.tsx`, `ProjectDetail.tsx`, `ProjectEdit.tsx`) filtre déjà `archived_at IS NULL`. Le delete tente une vraie suppression et bascule en archivage si une contrainte FK l'empêche (questions référencées par des messages d'anciennes sessions). Tout cela fonctionne — la dernière question archivée du projet « Poylo, une dernière conversation » date d'aujourd'hui 20:56, donc l'archivage est bien déclenché.

## Bugs identifiés malgré tout

En relisant attentivement `ProjectEdit.handleSave` (lignes 270-340), j'ai trouvé **deux causes possibles** au symptôme :

### Bug 1 : la session déjà créée n'est pas resynchronisée

Côté candidat, `InterviewStart` charge bien `questions WHERE project_id = X AND archived_at IS NULL` ✅. **Mais** : quand un candidat a déjà commencé la session (`status = in_progress`, des messages existent), il « reprend » à `last_question_index`. Si tu as supprimé/réordonné des questions entre-temps, l'index ne pointe plus sur la bonne question, et les messages déjà enregistrés (avec `question_id` pointant vers la question archivée) continuent à s'afficher dans le replay/transcript et à influencer l'IA.

### Bug 2 : la suppression ne purge pas les médias orphelins

Quand une question est archivée (FK violation), son `audio_url`/`video_url` reste accessible. Si tu recrées une question avec le même contenu, l'ancienne archivée garde un média qui peut réapparaître dans certains contextes (rapports, replay).

### Bug 3 (probable, à confirmer côté UX) : suppression silencieuse en cas d'erreur

Lignes 290-300 : si `delete` échoue pour une raison autre que FK (ex. droits RLS, réseau), le code essaie d'archiver — mais si l'archivage échoue aussi, l'erreur est levée tout en haut de la transaction. Le projet a déjà été update et certaines questions update/insert ont eu lieu avant. Résultat : la sauvegarde apparaît partielle et la question supprimée réapparaît au refresh.

## Plan de correction

### 1. `src/pages/ProjectEdit.tsx` — sync robuste

- Faire **toute la synchronisation des questions dans une transaction RPC** (créer une fonction `sync_project_questions(project_id, questions jsonb)`) côté Supabase pour atomicité, OU à défaut :
- Réorganiser l'ordre des opérations : 1) calculer le diff, 2) supprimer/archiver, 3) update/insert. Vérifier explicitement le résultat de chaque suppression et logger via `logger.error` les échecs.
- Ajouter un **toast d'erreur explicite** par question non supprimée plutôt que de laisser la sauvegarde réussir silencieusement.

### 2. `src/pages/InterviewStart.tsx` — réconciliation à la reprise

- À la reprise d'une session `in_progress`, si la liste des questions actives a changé depuis le démarrage (détection via comparaison `question_id` des `session_messages` vs `questions actives`), proposer un dialog : « Le questionnaire a été modifié. Reprendre depuis la question X ou recommencer ? »
- Recalculer `last_question_index` en fonction de la nouvelle liste plutôt que de prendre la valeur stockée brute.

### 3. Nettoyage de la session existante

- Cleanup ponctuel : la question `d0f56244-d23b-4676-bae1-bf38fb8f2f0c` (archivée à 20:56 sur le projet « Poylo, une dernière conversation ») et la session pending `0ad92ccd...` créée juste après. Vérifier qu'aucune question fantôme ne reste à jouer dans cette session.

### 4. Question pour préciser le diagnostic

Avant d'implémenter, j'aimerais savoir **où précisément** tu vois la question supprimée :
- (a) Dans l'éditeur du projet après refresh ?
- (b) En jouant la session côté candidat (preview) ?
- (c) Dans le rapport / transcript d'une session déjà passée ?

La réponse oriente vers le bug 1, 2 ou 3.

## Résultat attendu

- Suppression de questions fiable et atomique, avec feedback en cas d'échec.
- Reprise de session intelligente quand le questionnaire a changé.
- Plus de questions « fantômes » jouées au candidat.
