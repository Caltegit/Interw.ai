# Plan — Test Playwright pour la détection de panne micro

## Contexte
L'infra Playwright existe déjà (`tests/e2e/`, `playwright.config.ts` avec flux media factices, seed auto via `global-setup.ts`). Il suffit d'ajouter un fichier `.spec.ts`. Pas de nouvelle dépendance ni config.

## Fichier à créer
`tests/e2e/interview-mic-failure.spec.ts`

## Scénario du test
Simuler une perte de piste micro en cours d'entretien et vérifier que `MicFailureBanner` apparaît avec le bon message.

```text
1. goto /interview/{slug}/start/{pendingSessionToken}
2. click "Démarrer l'entretien"
3. attendre selfview + indicateur REC (comme interview-start-media.spec.ts)
4. attendre que le bouton de réponse soit visible (= phase listening)
5. page.evaluate(...) : forcer track.stop() sur la piste audio du stream actif
6. expect bannière "Micro déconnecté" visible dans les 8 s
7. expect bouton "Réactiver le micro" visible
```

## Comment déclencher la panne
Trois options testées par ordre de fiabilité :

**A. `track.stop()` via page.evaluate** (préféré)
On accède au `MediaStream` actif via une référence exposée sur `window` (à ajouter dans `InterviewStart.tsx` en mode dev/test : `if (import.meta.env.DEV) (window as any).__streamRef = streamRef`). Le test appelle ensuite :
```js
window.__streamRef.current.getAudioTracks()[0].stop()
```
Déclenche l'event `ended` → bascule en `track-dead`.

**B. Sans hook : `RMS silencieux`**
Plus simple mais plus lent — attendre 6 s sans signal STT pour basculer en `silent`. Problème : les flux factices Chromium émettent un signal audio non nul, donc le RMS reste au-dessus du seuil. Ne marchera pas sans patch.

**C. Mock getUserMedia avant `goto`**
`page.addInitScript` qui remplace `navigator.mediaDevices.getUserMedia` pour retourner un stream dont la piste audio se mute après 5 s. Plus invasif, casse les autres assertions du flow normal.

**Recommandation : option A.** Petite trappe de test (`window.__streamRef`) gardée derrière `import.meta.env.DEV || import.meta.env.MODE === 'test'`. C'est la pratique standard pour tester du code WebRTC avec Playwright.

## Implications / risques

| Risque | Mitigation |
|---|---|
| Exposer `streamRef` sur `window` même en prod | Garde stricte `import.meta.env.DEV` — n'est jamais inclus dans le build prod (Vite tree-shake) |
| Flaky : la bannière dépend du timing du watcher | `expect.poll` avec timeout 10 s sur `getByRole("alert")` filtré par texte |
| La session pending est consommée par le test (passe en `in_progress`) | Le seed la recrée à chaque run via `global-setup.ts` — pas de nettoyage manuel |
| Le test consomme un slot de session sur Lovable Cloud | Identique aux autres tests interview-* existants, aucun impact |
| Sur CI headless, `requestAnimationFrame` peut tourner moins vite → watcher plus lent | Le watcher tourne sur rAF mais le `track.onended` est synchrone, donc bannière instantanée |

## Tests à ajouter (1 fichier, 1 ou 2 cases)

1. **`micro déconnecté affiche la bannière + bouton Réactiver`** — option A
2. *(optionnel)* **`reacquireMic réussit avec fake media`** — clic sur "Réactiver", la bannière disparaît dans les 5 s

## Modifications de code requises

1. `src/pages/InterviewStart.tsx` : 2 lignes pour exposer `streamRef` en dev uniquement
   ```ts
   if (import.meta.env.DEV) {
     (window as any).__interviewStreamRef = streamRef;
   }
   ```
2. `tests/e2e/interview-mic-failure.spec.ts` : nouveau fichier (~50 lignes)
3. `tests/e2e/README.md` : ajouter une ligne dans le tableau des scénarios

## Lancer le test

```bash
npx playwright test tests/e2e/interview-mic-failure.spec.ts
```

Tourne automatiquement en CI au prochain push sur `main` (workflow `.github/workflows/e2e.yml` existant).

## Hors scope
- Test unitaire Vitest de `useMicHealthWatcher` (mock AnalyserNode) — utile mais redondant si le E2E passe
- Test du fallback `getUserMedia` quand le deviceId exact échoue — difficile à simuler de façon réaliste
