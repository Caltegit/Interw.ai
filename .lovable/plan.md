

## Upload incrémental : ce qui existe et ce qu'on améliore

### Ce qui se passe déjà aujourd'hui (bonne nouvelle)

L'enregistrement n'est **pas** transmis d'un seul bloc à la fin. Le code (`src/pages/InterviewStart.tsx`) tourne déjà en mode incrémental :

- Un `MediaRecorder` distinct est démarré **à chaque question**, avec un timeslice de 500 ms (les chunks s'accumulent côté navigateur en flux continu).
- Dès que le candidat valide sa réponse, le segment vidéo de cette question est immédiatement uploadé vers Storage (`stopAndUploadQuestionVideo`) avec retry exponentiel (1 s / 3 s / 8 s).
- L'URL est stockée dans `session_messages.video_segment_url`, et la première URL devient aussi `sessions.video_recording_url`.
- L'upload se fait **en arrière-plan** (`trackBackground`), pendant que l'IA prépare la question suivante. Le candidat n'attend rien.
- À la fin de l'entretien, on redirige le candidat **immédiatement** vers la page « Complete » et on finalise en tâche de fond. Seul reste le segment de la **dernière question** à pousser, plus la mise à jour `status = completed`.

Donc l'impression de « tout charger d'un coup à la fin » vient surtout du tout dernier segment (la dernière réponse) qui, par construction, ne peut être uploadé qu'après son clic « Terminer ». Sur une longue réponse finale, ça peut faire quelques secondes de latence visible.

### Ce qu'on améliore quand même

Trois points concrets pour rendre la perception encore plus fluide et garantir le nettoyage des sessions abandonnées.

**1. Streaming continu vers Storage pendant la question (le chunk part avant la fin)**

Aujourd'hui les chunks de 500 ms sont gardés en RAM jusqu'au `recorder.stop()`. On va les pousser au fur et à mesure :

- Pour chaque chunk reçu dans `recorder.ondataavailable`, on l'envoie directement dans `media/interviews/{sessionId}/q{index}/chunk-{n}.webm` sans attendre la fin de la question.
- À la fin de la question, on poste un petit fichier `manifest.json` qui liste les chunks dans l'ordre.
- Côté lecture (rapport recruteur), on lit le manifest et on concatène les segments via un `MediaSource` (ou plus simple : on garde aussi le blob assemblé final comme fallback, uploadé en tâche de fond — mais l'expérience candidat n'attend plus rien).

Avantage : à l'instant où le candidat clique « Terminer », il ne reste que 0–500 ms de données à pousser, plus le manifest. Plus de pic de bande passante en fin de session.

**2. Indicateur discret de sauvegarde**

Petit badge en bas à droite pendant l'entretien : « Enregistrement en cours ✓ » qui passe à « Sauvegarde… » pendant un upload de chunk en cours, et à « Tout est sauvegardé ✓ » quand la file est vide. Ça rassure et ça rend le mécanisme visible.

**3. Nettoyage automatique des sessions abandonnées**

Aujourd'hui, si le candidat ferme l'onglet en cours d'entretien, les chunks déjà uploadés restent orphelins dans Storage et la session reste en `pending` ou `in_progress` à vie.

On ajoute une fonction edge planifiée `cleanup-abandoned-sessions` (lancée toutes les heures via `pg_cron`) qui :

- Cherche les sessions `status IN ('pending','in_progress')` dont `last_activity_at < now() - 2 heures`.
- Pour chacune : supprime les fichiers `interviews/{sessionId}/*` du bucket `media`, supprime les `session_messages` associés, puis supprime la session.
- Logue un compteur (nombre de sessions purgées) pour suivi.

On garde un délai de 2 h pour absorber les coupures réseau temporaires (le candidat peut revenir et reprendre via le mécanisme de resume existant).

**Cas explicite « le candidat n'arrive pas au bout » :** déjà géré côté UX (resume possible jusqu'à 2 h, puis purge). Pas besoin de bouton « j'abandonne » côté candidat — la fermeture d'onglet suffit, le ménage se fait tout seul.

### Ce qu'on ne change pas

- L'API publique des composants et hooks.
- Le format des `session_messages` (on rajoute juste une colonne optionnelle `video_chunks_manifest_url` si on garde le streaming par chunks, sinon rien).
- Le flux de génération du rapport.
- Le mécanisme de resume (`last_activity_at`).

### Détails techniques

- **Fichier principal** : `src/pages/InterviewStart.tsx` — modifier `startQuestionRecording` et `stopAndUploadQuestionVideo` pour pousser les chunks en streaming, et ajouter un état `uploadQueueSize` exposé via un nouveau composant `RecordingStatusBadge`.
- **Migration DB** : une nouvelle colonne nullable `session_messages.video_chunks_manifest_url text` (uniquement si on adopte le manifest ; sinon zéro migration).
- **Edge function** : `supabase/functions/cleanup-abandoned-sessions/index.ts` (nouveau), avec service role, plus une entrée `pg_cron` programmée toutes les heures dans une migration.
- **Lecture côté recruteur** : `src/pages/SessionDetail.tsx` lit `video_recording_url` en priorité (fallback existant), et si absent reconstruit depuis le manifest. La majorité des sessions auront déjà `video_recording_url` rempli, donc rien ne change visuellement.

### Hors champ

- Streaming WebRTC vers un serveur média (overkill pour ce besoin).
- Compression côté client avant upload (le navigateur encode déjà en VP9/Opus).
- Reprise d'upload après coupure réseau pendant l'entretien (le retry exponentiel actuel suffit pour les coupures < 12 s).

