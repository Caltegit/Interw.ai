

## Sécuriser l'enchaînement des questions — un bloc « début / fin » par question

### Constat

Aujourd'hui, le passage d'une question à l'autre est rapide mais fragile :

- La TTS de transition, le média de la question, les relances et le redémarrage de l'écoute peuvent se chevaucher si une étape est lente (mobile, réseau).
- Le watchdog de 7 s peut basculer en écoute alors que le média n'a pas encore commencé à jouer (réseau lent).
- L'upload du segment vidéo de la question précédente part en tâche de fond ; en cas de coupure réseau, on n'a pas de garantie qu'il est bien parti avant de basculer.
- Pas de vérification explicite que le fichier média de la question est téléchargeable avant de commencer.

### Principe : chaque question = un bloc séquentiel avec verrou

Une seule fonction `runQuestionBlock(qIdx)` orchestre la question, étape par étape, avec un verrou `blockLockRef` qui empêche tout déclenchement parallèle (relance, autoplay, watchdog) tant que le bloc précédent n'est pas explicitement « fermé ».

Étapes garanties dans l'ordre :

```text
[Bloc question N]
  1. CLOSE_PREV    → stop TTS, stop player, stop STT, stop MediaRecorder
                    → flush upload du segment N-1 (await, avec retry)
                    → persist message « fin question N-1 »
  2. PREP_MEDIA    → si N a un média :
                       fetch(url) avec timeout 8 s + retry 1×
                       => si échec : badge « Question texte (média indisponible) »
                          et on lit le contenu en TTS à la place
  3. SPEAK_INTRO   → TTS de transition (await fin réelle, pas approximative)
  4. PLAY_MEDIA    → si média : attendre canplaythrough avant play()
                                attendre l'event ended (watchdog 20 s, réarmé sur progress)
  5. OPEN_LISTEN   → démarrer MediaRecorder de la question N
                    → démarrer STT
                    → démarrer chrono silence
  6. (attend la réponse candidat ou « Passer »)
```

Tant que l'étape en cours n'a pas résolu, aucune autre étape du bloc ne peut démarrer. Plus de superposition possible, même en cas de relance rapide ou de clic candidat trop tôt.

### Détails par garantie demandée

**1) Pas de superposition (questions / relances / TTS / média)**

- Un seul `currentBlockId` (incrémenté à chaque question/relance). Tout callback (`onPlaybackEnd`, watchdog, retour TTS, retour STT) compare son `blockId` au `currentBlockId` au moment de s'exécuter ; s'il est obsolète, il ne fait rien.
- À l'entrée de chaque étape : `cancelAll()` qui appelle :
  - `window.speechSynthesis.cancel()`
  - `elevenAudioRef.pause()`
  - `featuredPlayerRef.stop()`
  - `recognition.stop()`
  - `mediaRecorder.stop()` si encore actif
- Les relances passent par le même mécanisme : une relance ouvre un sous-bloc `runFollowUpBlock()` qui suit les mêmes étapes 1→5, sans jamais préparer un nouveau média.

**2) Vérifier que la question est bien chargée avant de la lire**

Nouvelle étape `PREP_MEDIA` :

- `await fetch(url, { cache: "force-cache" })` puis lire `response.blob()` → garantit que les octets sont bien dans le cache navigateur.
- Timeout 8 s + 1 retry. Si les deux échouent :
  - On affiche un mini-message « Problème de chargement de la question, lecture du texte à la place ».
  - On bascule la question en mode `written` pour ce candidat (en mémoire, pas en base).
  - Le bloc continue normalement (TTS du contenu de la question).
- Pendant `PREP_MEDIA`, indicateur visible « Préparation de la question… » (déjà présent partiellement, on le rend systématique).
- `QuestionMediaPlayer` : on attend `canplaythrough` (et plus seulement `canplay`) avant `play()` pour s'assurer que le navigateur estime pouvoir lire jusqu'à la fin sans rebuffering.

**3) Tout est bien enregistré au fur et à mesure**

- L'étape `CLOSE_PREV` **attend** (await) la fin de l'upload du segment vidéo de la question précédente avant de passer à la suivante. Si l'upload échoue après 2 retries, on affiche un toast non bloquant mais on logge l'erreur côté serveur (`logger.error`).
- L'insert du message candidat passe lui aussi en `await` à l'intérieur de `CLOSE_PREV` (avec retry 2× déjà existant).
- Un compteur `pendingUploads` reste affiché via `RecordingStatusBadge` (déjà en place).
- À la fin de chaque bloc, on met à jour `sessions.last_question_index` **après** confirmation que le segment N-1 est bien persisté → en cas de reprise, on ne saute pas une question dont la vidéo n'est pas montée.

**4) Watchdog plus intelligent**

- Watchdog de 20 s (au lieu de 7 s) après `play()`, et **ne peut pas** déclencher `forceStartListening` tant qu'aucun event `playing` n'a été reçu sur le `<audio>/<video>`. S'il n'a jamais joué : on affiche le bouton manuel « Lire la question » et on n'avance pas tout seul.
- Si `playing` a été reçu et que le média se bloque ensuite, watchdog réarmé sur `progress`. Si vraiment plus rien pendant 15 s → on coupe et on passe en écoute (la question a au moins été partiellement entendue).

### Modifications de fichiers

- `src/pages/InterviewStart.tsx`
  - Ajouter `blockLockRef`, `currentBlockIdRef`, helper `cancelAll()`.
  - Refactor de `beginInterview`, `handleSendResponse` (branches NEXT et FOLLOW_UP), `handleSkipQuestion` pour qu'ils délèguent à un seul `runQuestionBlock(qIdx, { isFirst, transitionText })` et un `runFollowUpBlock(text)`.
  - Ajouter `prepareMedia(url)` qui retourne `{ ok: true } | { ok: false }`.
  - `CLOSE_PREV` : passer en `await` la persistance du message candidat et l'upload du segment.

- `src/components/interview/QuestionMediaPlayer.tsx`
  - Attendre `canplaythrough` (avec timeout 10 s) avant `play()`.
  - Watchdog 20 s qui ne déclenche `onPlaybackEnd` que si `playing` a été reçu au moins une fois ; sinon expose le bouton « Lire la question ».
  - Exposer une nouvelle méthode `prepare()` via `ref` pour précharger sans jouer (utilisée par `PREP_MEDIA`).

### Compromis assumé

- Entre deux questions, on ajoute typiquement 0,3 à 1,5 s d'attente (préchargement + flush upload). C'est exactement ce que tu acceptes : un peu moins fluide, mais aucune question manquée et aucune réponse perdue.
- En cas de média totalement injoignable, le candidat continue avec la version texte plutôt que de bloquer.

### Vérification après implémentation

1. Sur mobile en « Slow 4G » : enchaîner 5 questions audio → toutes doivent être lues du début à la fin avant l'écoute candidat.
2. Couper le réseau juste avant la question 3 → message « lecture du texte à la place » apparaît, l'entretien continue.
3. Provoquer une relance IA → la TTS de relance ne démarre jamais avant l'arrêt complet du média précédent ; le micro ne s'ouvre qu'après la fin de la TTS.
4. Vérifier en base que chaque message candidat a bien un `video_segment_url` non null (sauf coupure réseau).
5. Recharger la page au milieu d'une question → la reprise repart sur la bonne question (last_question_index correct).

