## Constat

La vidéo Q15 de la session `f456e99a` est cassée parce que le pipeline d'enregistrement de l'entretien peut produire, dans certains cas, des chunks qui — une fois recollés côté serveur — ne forment pas un fichier lisible.

Ce que j'ai vérifié dans le code actuel (`src/pages/InterviewStart.tsx`, `supabase/functions/finalize-abandoned-session/index.ts`) :

1. `MediaRecorder.start(1000)` : le navigateur émet un chunk par seconde. **Seul le tout premier chunk contient l'en-tête EBML** (WebM) ou l'atome `ftyp`/`moov` (MP4). Si ce premier chunk est perdu, uploadé en retard, ou si le recorder est redémarré en cours de question (changement de micro, `onerror`), on obtient un flux sans header lisible.
2. L'assemblage serveur (`finalize-abandoned-session`) fait un scan EBML pour retrouver le début, mais si aucun chunk ne contient l'en-tête (cas Q15), le fichier reconstitué est illisible : audio récupérable, piste vidéo décodable seulement partiellement, durée = `Infinity`.
3. Les redémarrages de recorder (`restartActiveRecorderAfterAudioSwap`, `recorder.onerror`) créent un second flux MediaRecorder avec **son propre header**, concaténé au premier → conteneur invalide.
4. Les uploads de chunks sont parallèles avec retry, mais rien ne garantit l'ordre d'écriture ni la présence effective du chunk 0 avant la fin.
5. Aucun contrôle d'intégrité à la fin de la question : on passe à la suivante sans vérifier que le blob assemblé est lisible.

Le bouton « Réparer » sert de filet de sécurité, mais la vraie correction est de garantir un fichier lisible dès l'enregistrement.

## Objectif

Faire en sorte que chaque question produise, à la fin, un fichier vidéo **toujours** lisible, avec header et durée, sans dépendre d'une réparation ultérieure.

## Plan

### 1. Un seul flux MediaRecorder par question, jamais redémarré

- Interdire tout redémarrage du `MediaRecorder` vidéo pendant l'enregistrement d'une question. Si un changement de micro survient, on ne touche qu'au recorder audio auxiliaire, jamais au recorder vidéo principal.
- Si `recorder.onerror` se déclenche, on arrête proprement la question, on marque le segment comme partiel, et on passe à la suivante — plutôt que de recoller deux flux incompatibles.

### 2. Garantir la présence de l'en-tête (chunk 0)

- Garder `start(1000)` pour l'upload progressif, mais **bufferiser le chunk 0 en local** et l'uploader en priorité absolue, avec un retry infini borné en temps (jusqu'à la fin de la question). Aucun chunk suivant n'est considéré comme "committable" tant que le chunk 0 n'est pas confirmé.
- Écrire dans le manifest un champ `header_chunk_confirmed: true/false` pour que le serveur sache immédiatement si le fichier sera lisible.

### 3. Finalisation locale avec contrôle d'intégrité

- À la fin de chaque question, avant d'enchaîner :
  - appeler `requestData()` puis `stop()`,
  - reconstituer localement le blob complet en mémoire,
  - vérifier la présence de l'en-tête (EBML pour WebM, `ftyp` pour MP4),
  - uploader **ce blob final unique** en tant que `q{i}.{ext}` dans un chemin dédié `interviews/{session}/final/q{i}.{ext}`, avec `upsert: true`.
- Le fichier final ainsi produit contient toujours son header (il vient d'un `stop()` propre), avec durée correcte.
- Les chunks continuent d'exister en secours pour les cas d'abandon (téléphone fermé), mais le chemin nominal n'en dépend plus.

### 4. Priorité du fichier final côté serveur

- `finalize-session` et le lecteur utilisent en priorité `interviews/{session}/final/q{i}.{ext}` s'il existe. On ne retombe sur la reconstitution depuis les chunks que si ce fichier est absent (session abandonnée avant `stop()`).
- Le manifest indique explicitement le chemin final attendu.

### 5. Sauvegarde de secours: TUS resumable pour le blob final

- Utiliser l'upload resumable de Lovable Cloud Storage (protocole TUS) pour le blob final, avec reprise automatique si le réseau coupe pendant l'upload post-`stop()`. Cela règle le cas "le candidat ferme l'onglet au moment où on envoie le fichier final".

### 6. Détection en amont dans le tableau de bord admin

- Étendre `AdminSessionsQueue` / `AdminCandidatesToRecover` : lister automatiquement les sessions dont au moins une question n'a pas de fichier `final/q{i}.{ext}` valide, avec bouton « Réparer » déjà en place.
- Ajouter un compteur "questions à réparer" visible côté RH.

### 7. Test bout en bout

- Ajouter un test Playwright qui simule :
  - un entretien complet normal → vérifier la présence des fichiers `final/q{i}.webm` avec durée finie,
  - un changement de micro pendant une question → vérifier que la vidéo reste lisible,
  - une fermeture d'onglet en cours de question → vérifier que la reconstitution depuis chunks reste possible (chemin de secours).

## Ce qui reste comme filet

- La chaîne « Rebuild serveur → Remux/Transcode client → Upload » reste en place pour les entretiens déjà passés et pour les cas d'abandon. Elle n'est plus la voie normale, mais la voie de secours.

## Détails techniques (pour référence)

- Fichiers principaux à modifier :
  - `src/pages/InterviewStart.tsx` : `startQuestionRecording`, `stopAndUploadQuestionVideo`, `restartActiveRecorderAfterAudioSwap`, `uploadChunk`.
  - `supabase/functions/finalize-abandoned-session/index.ts` : lecture prioritaire de `final/q{i}.{ext}`.
  - `supabase/functions/recover-session-video/index.ts` : idem.
  - `src/components/session/SessionVideoNavigator.tsx` : lecture prioritaire de `final/q{i}.{ext}`.
- Format du manifest étendu : ajouter `header_chunk_confirmed`, `final_path`, `final_uploaded_at`.
- Bucket Storage : réutiliser `media`, sous-dossier `final/` par session.
