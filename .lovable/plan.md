# Fluidifier les transitions entre questions (#1 + #3) — analyse d'impact

Objectif : passer de 6–10s à 2–4s sur l'overlay entre la fin d'une réponse candidat et le début de la question suivante, **sans toucher à l'enregistrement, au STT, ni au flux de relance**.

## #1 — Bypass `ai-conversation-turn` quand la décision est déterministe

Aujourd'hui (`InterviewStart.tsx` L1847-1898), on appelle Gemini systématiquement, même quand l'issue est connue.

**Conditions de bypass (toutes vérifiées côté client AVANT l'appel)** :
- `relance_level === "light"` sur la question courante
- `follow_up_enabled === false`
- `followUpsAsked >= max_follow_ups`
- `forceMaxFollowUps === 0` (réseau "poor")

Quand l'une est vraie : on saute `supabase.functions.invoke("ai-conversation-turn", …)` et on calcule localement :
- `action = isLastQuestion ? "end" : "next"`
- `aiMessage` :
  - `"end"` → `"Merci pour cette session, à bientôt."`
  - `"next"` + `ai_question_transitions_enabled === false` → `""`
  - `"next"` + question N+1 a `video_url` → `"Regardez la question suivante."`
  - `"next"` + question N+1 a `audio_url` → `"Écoutez la question suivante."`
  - `"next"` + question N+1 texte → `""` (le texte sera lu par la branche TTS standard plus loin, comme aujourd'hui)

Le reste du flux (branches `follow_up`, `next`, `end` à partir de L1907) reste **strictement identique**. On ne fait que court-circuiter l'appel réseau et fournir les mêmes valeurs `action`/`aiMessage` qu'aurait renvoyées l'edge.

## #3 — Cache TTS pour transitions statiques

Nouveau module `src/lib/ttsCache.ts` :
- `Map<string, Blob>` en mémoire, clé = `${voiceId}|${normalizedText}`
- `getCachedTtsBlob(text, voiceId)` / `setCachedTtsBlob(...)` 
- `prefetchTransitionPhrases(project, fetchFn)` — précharge en parallèle au boot les 3 phrases ci-dessus pour `project.tts_voice_id`

Dans `InterviewStart.tsx` :
- Au moment où le projet/voix sont connus (après chargement), lancer `prefetchTransitionPhrases` en *fire-and-forget*. N'awaite jamais — si ça échoue, on retombe sur le flux normal.
- Dans `tryElevenLabs`/`fetchElevenLabsBlob`, avant le `fetch`, regarder le cache. Si hit, renvoyer le blob directement (mesure réseau ignorée — `recordTtsTiming` non appelé pour ne pas fausser l'EWMA de `useNetworkQuality`).

## Analyse d'impact — ce qui ne change PAS

J'ai relu `InterviewStart.tsx` (L1750-1980) et les pièces critiques :

1. **Enregistrement vidéo candidat** (`stopAndUploadQuestionVideo`, L1793) — appelé en parallèle (`persistCandidatePromise`, L1788-1845), totalement indépendant de l'appel IA. Bypass n'y touche pas.
2. **Insert message candidat** (`persistMessage`, L1804) — idem, dans la promise parallèle.
3. **Branches `follow_up` / `end` / `next`** (L1907+) — inchangées : elles consomment `action` et `aiMessage`, peu importe leur source.
4. **CLOSE_PREV** (`await persistCandidatePromise`, L1937-1940) — préservé, dans la branche follow_up. Pour la branche `next`, vérifier que l'attente est aussi présente (à confirmer en lisant L1980-2100 lors de l'implémentation, mais aucun changement requis).
5. **Watchdog audio** (L540-553), unlock overlay, `cancelAll`, `currentBlockIdRef` — non touchés.
6. **STT / `startListening` / silence timer** — non touchés.
7. **`recordTtsTiming` et `useNetworkQuality`** — sur cache hit on n'enregistre PAS de mesure (cohérent : ce n'était pas un vrai aller-retour réseau). Sur cache miss → comportement inchangé.
8. **Edge function `ai-conversation-turn`** — non modifiée. Reste source de vérité pour les cas avec relance possible. Les garde-fous serveur (transitions interdites en relance, etc.) restent en place pour ces cas.
9. **Edge function `tts-elevenlabs`** — non modifiée.
10. **Tests E2E** (`interview-start-media.spec.ts`, `interview-start-resume.spec.ts`, etc.) — vérifient caméra/recorder/resume, pas le contenu de la transition IA. Pas d'impact attendu.

## Risques identifiés et mitigations

- **Désynchronisation client/serveur des règles de bypass** : si l'edge évolue (nouvelle dimension de relance) et pas le client, on pourrait skipper à tort. → Mitigation : commentaire `// MIRROR of ai-conversation-turn server-side gating` au-dessus du bloc de bypass + pointer vers le fichier edge. Conservatif : en cas de doute (champ inconnu, valeur null), on N'AUTORISE PAS le bypass, on appelle l'edge.
- **Transition vide** quand `ai_question_transitions_enabled === false` : déjà géré aujourd'hui par l'edge (renvoie `""`) et la branche `next` sait gérer un message vide (à confirmer d'un coup d'œil L1980+ avant codage). Si non, on appelle l'edge dans ce cas précis.
- **Cache TTS obsolète si la voix change pendant la session** : très improbable (voix figée au boot). Clé inclut `voiceId`, donc un changement invaliderait naturellement.
- **Fuites mémoire blobs** : Map borné à 3 entrées par voix, négligeable. Pas de `URL.createObjectURL` stocké — on le crée à la lecture comme aujourd'hui.
- **Question N+1 avec média (video/audio)** : la transition annonce "Regardez/Écoutez", ensuite la branche `next` joue le média comme aujourd'hui. Comportement préservé.
- **Première question** : pas concernée (le bypass agit après la première réponse). Aucun risque sur le démarrage.

## Fichiers touchés

- `src/pages/InterviewStart.tsx` — ajouter le bloc de bypass (≈30 lignes) avant L1866 ; brancher le cache dans `fetchElevenLabsBlob` (≈5 lignes) ; appel `prefetchTransitionPhrases` après chargement projet (≈3 lignes).
- `src/lib/ttsCache.ts` — nouveau fichier, ~60 lignes.

Aucune migration BDD, aucune edge function modifiée, aucun changement contractuel.

## Hors scope

#2 (pre-TTS spéculatif), #4 (prefetch média N+1), #5 (fast-next), #6 (overlay raccourci), #7 (TTS streaming) — réservés pour une 2e salve si besoin après mesure terrain.
