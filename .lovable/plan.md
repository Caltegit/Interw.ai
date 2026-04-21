

## Plan — Tests Playwright pour `InterviewStart`

Ajouter 4 specs E2E qui couvrent les régressions visuelles et fonctionnelles principales du flow candidat **sans** dépendre de l'IA, du STT ou du TTS (trop fragiles en headless). On vise les invariants de l'écran : il charge, il propose la reprise, il enregistre les médias, il survit au refresh.

### Modifications côté seed (edge function `seed-e2e-user`)

Pour rendre les tests rejouables sans collision avec le scénario rapport :

- Ajouter une **2e session candidate** dédiée à `InterviewStart`, statut `pending`, token fixe (ex. `e2e-pending-session-token-...`), pas de messages.
- Ajouter une **3e session de reprise** : statut `in_progress`, token fixe, 2 messages déjà persistés (1 IA + 1 candidat) sur la 1re question, `last_question_index = 1`.
- Le seed reste idempotent (upsert) et ne touche pas la session complétée existante.
- Exposer ces deux nouveaux tokens dans `helpers/constants.ts` (champs `pendingSessionToken` et `resumeSessionToken`).

### Configuration Playwright

Mettre à jour `playwright.config.ts` (ou `playwright-fixture.ts` si déjà custom) pour accorder les permissions navigateur nécessaires :

- `permissions: ["camera", "microphone"]`
- `launchOptions.args` : `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, `--autoplay-policy=no-user-gesture-required`

Cela permet à Chromium de fournir un flux audio/vidéo factice à `getUserMedia` et `MediaRecorder` sans intervention manuelle.

### Specs ajoutées (dans `tests/e2e/`)

**`interview-start-loading.spec.ts`** — chargement initial
- Va sur `/interview/{slug}/start/{pendingSessionToken}`.
- Attend que l'écran d'accueil de la session s'affiche (avatar IA, bouton « Commencer » / `readyToStart`).
- Vérifie absence d'erreur console critique (filtre les warnings TTS/ElevenLabs connus).
- Vérifie présence du nom de l'IA (`Sophie`) et du job (`QA Engineer E2E`).

**`interview-start-resume.spec.ts`** — reprise de session
- Va directement sur `/interview/{slug}/start/{resumeSessionToken}`.
- Attend l'apparition du dialogue « Reprendre votre entretien ? ».
- Clique « Reprendre » → vérifie qu'on bascule sur l'écran d'entretien et que le compteur de question est sur la 2e question (index 1).
- Sous-test : recharge la page, le dialogue de reprise réapparaît (preuve que la persistance fonctionne).

**`interview-start-media.spec.ts`** — enregistrement média
- Va sur le token pending, lance l'entretien (clic sur « Commencer »).
- Vérifie qu'un élément `<video>` autoplay est présent et a un `srcObject` (caméra active via fake stream).
- Vérifie la présence d'un indicateur d'enregistrement (texte « Enregistrement » ou icône micro active).
- Attend ~3 s, vérifie qu'aucune erreur `getUserMedia` / `MediaRecorder` n'apparaît dans la console.
- Note : on n'essaie pas de naviguer vers la question suivante via STT — c'est non testable en headless. À la place, on déclenche `handleSendResponseRef` via un `data-testid="next-question-debug"` (voir ci-dessous) **uniquement si** un tel testid existe ; sinon on se limite à vérifier que la 1re question est affichée et que le recorder est en `recording`.

**`interview-start-refresh.spec.ts`** — résistance au refresh
- Démarre l'entretien sur le pending token (passe l'écran d'accueil).
- Vérifie que la session est passée en BDD à `in_progress` via une requête Supabase REST (clé anon, RLS le permet pour un token public).
- Refresh la page (`page.reload()`).
- Vérifie que le dialogue de reprise apparaît automatiquement (puisque session est `in_progress` + au moins 1 message IA persisté).
- Clique « Recommencer » → la session est purgée et on revient à l'écran d'accueil.

### Petits ajouts non invasifs côté composant

Pour rendre les éléments interrogeables de façon stable sans changer l'UI :

- Ajouter `data-testid` sur les éléments clés de `InterviewStart.tsx` :
  - `interview-start-screen` (conteneur principal de l'écran d'accueil)
  - `interview-start-button` (bouton « Commencer »)
  - `interview-resume-dialog` (dialogue de reprise)
  - `interview-resume-confirm` / `interview-resume-restart` (boutons du dialogue)
  - `interview-current-question-index` (badge ou compteur de question)
  - `interview-self-video` (le `<video>` selfview)
  - `interview-recording-indicator` (badge « Enregistrement »)
- Ces `data-testid` ne changent rien au comportement visuel.

### Ce que ces tests **ne** couvrent pas (assumé)

- La conversation IA (appel à `ai-conversation-turn`) : non déterministe, hors scope régression UI.
- Le TTS ElevenLabs / browser : flaky en headless, déjà loggé/géré côté code.
- La reconnaissance vocale (STT) : impossible sans vrai micro humain.
- L'analyse vidéo finale : couverte par `report-generation.spec.ts`.

### Fichiers touchés

- `supabase/functions/seed-e2e-user/index.ts` — 2 sessions supplémentaires.
- `tests/e2e/helpers/constants.ts` — nouveaux tokens.
- `playwright-fixture.ts` ou `playwright.config.ts` — permissions + flags fake media.
- `tests/e2e/interview-start-loading.spec.ts` (nouveau)
- `tests/e2e/interview-start-resume.spec.ts` (nouveau)
- `tests/e2e/interview-start-media.spec.ts` (nouveau)
- `tests/e2e/interview-start-refresh.spec.ts` (nouveau)
- `src/pages/InterviewStart.tsx` — ajout de ~6 `data-testid` (zéro changement comportemental).
- `tests/e2e/README.md` — mise à jour du tableau des scénarios.

### Stratégie d'exécution

J'enchaîne : seed mis à jour d'abord (déployé automatiquement), puis config Playwright, puis `data-testid`, puis les 4 specs. Je lance les tests à la fin pour valider qu'ils passent, et je documente dans le README ce qui est volontairement hors scope.

