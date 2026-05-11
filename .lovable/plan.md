## Objectif

Cliquer « Voir le moment » lance la lecture du clip de la question correspondante dans la vidéo vignette de droite, **positionnée 5 s avant** le passage cité (estimé par l'IA).

## Contexte

- Panneau droit : `<SessionVideoNavigator clips={sessionClips} />` (sticky `lg:sticky top-4`).
- Chaque clip = 1 `session_message` ayant un `video_segment_url`. L'`id` du message identifie le clip.
- Aucun timing fin n'est stocké en base (pas de word-timestamps).
- Les boutons « Voir le moment » appellent `goToMessage(messageId)` (`EvidenceLink` + inlines dans `PersonalityRadar`).

## Changements

### 1. Backend — `supabase/functions/generate-report/index.ts`

Pour chaque evidence/citation produite par l'IA, ajouter un champ optionnel `start_seconds: number` représentant la seconde estimée de début de la citation **dans le clip de la question concernée** (commence à 0).

Schémas à étendre (chacun a déjà `quote` + `message_id`) :
- `decision_drivers[].quote` → ajouter `start_seconds`
- `signals[].quote` → idem
- `fit_breakdown[].quote` → idem
- `red_flags[].quote` → idem
- `personality_profile.<trait>.evidences[]` → idem
- `soft_skills[].evidence` → idem
- `communication_profile.<dim>.quote` → idem
- `question_evaluations[].key_quote` → idem (le `evidence_message_id` existe déjà)

Mettre à jour le prompt : « Pour chaque citation, fournis `start_seconds` : la seconde estimée à laquelle la phrase citée commence dans la vidéo de réponse à la question (0 = début de la réponse). Estime à partir de la position du texte dans la transcription de la réponse et de sa durée. »

Côté front : pas de migration nécessaire — champ simplement absent sur les anciens rapports → fallback début du clip.

### 2. Frontend — `SessionVideoNavigator.tsx`

- Étendre `SessionVideoClip` avec `messageId: string` et `durationSec?: number` (déjà calculée à la volée par `loadedmetadata`, on garde le mécanisme actuel).
- Convertir le composant en `forwardRef` exposant :
  ```ts
  type SessionVideoNavigatorHandle = {
    playMessage: (messageId: string, startSeconds?: number) => boolean;
  };
  ```
- Logique `playMessage` :
  1. Trouver l'index du clip via `messageId`.
  2. Calcul du seek : `seek = Math.max(0, (startSeconds ?? 0) - 5)` (marge 5 s).
  3. Si l'index change → `setIndex` + `setShouldAutoPlay(true)` + mémoriser `pendingSeek`. Le `useEffect` existant qui repositionne `currentTime = 0` doit appliquer `pendingSeek` à la place.
  4. Si l'index ne change pas → `videoRef.current.currentTime = seek` puis `safePlay()`.
  5. Retourne `true`/`false`.
- Si `startSeconds` non fourni → seek = 0 (comportement « début de la réponse »).

### 3. Frontend — `SessionDetail.tsx` & `SharedReport.tsx`

- Inclure `messageId: m.id` dans le `useMemo` qui construit `sessionClips`.
- Créer `const videoNavRef = useRef<SessionVideoNavigatorHandle>(null);` et passer `ref={videoNavRef}`.
- Propager un `start_seconds` optionnel à travers `onGoToMessage` :
  - Nouvelle signature côté parent : `goToMessage(messageId: string, startSeconds?: number)`.
  - Comportement :
    1. `const ok = videoNavRef.current?.playMessage(messageId, startSeconds)`.
    2. Si `ok` → sur petit écran, `scrollIntoView` du conteneur vidéo. Pas de bascule d'onglet.
    3. Sinon (message sans clip vidéo : message IA, message texte) → fallback actuel (onglet Transcript + scroll vers le message).

### 4. Composants enfants — propagation du `start_seconds`

Mettre à jour la signature `onGoToMessage?: (id: string, startSeconds?: number) => void` et passer `ev.start_seconds` (ou équivalent) au handler dans :

- `EvidenceLink.tsx` (utilisé par la majorité des cartes) — accepte une prop `startSeconds?: number` et la transmet.
- `PersonalityRadar.tsx` — appelle directement `onGoToMessage(ev.message_id!, ev.start_seconds)`.
- Cartes parentes qui rendent `EvidenceLink` : `DecisionDriversCard`, `SignalsCard`, `FitBreakdownCard`, `RedFlagsCard`, `CommunicationProfileCard`, `SoftSkillsCard` — ajouter `startSeconds={item.start_seconds}` au `<EvidenceLink>`.

## Hors scope

- Pas de word-level timestamps (Whisper).
- Pas de migration des anciens rapports : champ `start_seconds` absent → fallback seek = 0.
- Pas de retouche visuelle des cartes / du libellé des boutons.

## Cas limites

- `start_seconds` absent → seek 0 (début du clip).
- `start_seconds` > durée du clip → on borne à `max(0, duration - 5)`.
- Citation sur un message sans clip vidéo (IA / texte) → fallback transcript actuel.
- Re-clic sur la même citation → relance la lecture depuis `start_seconds - 5`.
