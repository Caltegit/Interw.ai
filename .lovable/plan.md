## Diagnostic

J'ai inspecté les 3 systèmes qui peuvent afficher un avertissement micro pendant l'entretien :

1. **`useMicHealthWatcher`** (`src/hooks/useMicHealthWatcher.ts`) → bannière `MicFailureBanner`
2. **Watchdog STT/RMS** dans `InterviewStart.tsx` (l. 1255-1285) → `noMicSignal`
3. **`MicBlockingDialog`** au boot

3 vrais déclencheurs de faux positifs identifiés :

### Bug A — Bannière rouge "Micro déconnecté" qui apparaît à tort dès le démarrage
Dans `useMicHealthWatcher.ts` l. 93-95 :
```ts
if (track.muted || track.readyState !== "live") {
  setTrackDead(track.muted ? "track_muted_initial" : "track_not_live_initial");
}
```
Sur Chrome (surtout macOS) et Safari, `track.muted` est **transitoirement `true`** dans les ~200-500 ms qui suivent `getUserMedia`, puis l'event `unmute` arrive. → la bannière rouge "track-dead" s'affiche brièvement alors que le micro est OK.

### Bug B — Bannière jaune "Aucun son détecté" déclenchée par une simple pause de réflexion
`silentThresholdMs` par défaut = **6000 ms**, et `lastSignalAtRef` est initialisé à `Date.now()` au montage. Si le candidat réfléchit 6 s avant de parler à une question, on bascule en `silent` et la bannière s'affiche → puis disparaît dès qu'il parle. C'est très bruyant et donne l'impression que "le système croit que le micro ne marche pas".

### Bug C — Pas de reset du timer quand on (re)devient `active`
Quand l'IA finit de parler et qu'on repasse en `isListening=true`, `lastSignalAtRef` n'est pas remis à `Date.now()`. Si la TTS a duré >6 s, le watcher peut déjà être proche du seuil et basculer en `silent` instantanément à la fin du tour de l'IA.

## Plan d'implémentation

### 1. `src/hooks/useMicHealthWatcher.ts`

- **Bug A** : ajouter un délai de grâce de 1500 ms avant de déclencher `setTrackDead` à partir de l'état initial `track.muted`. Pendant ce délai, si l'event `unmute` arrive ou si `track.muted` repasse à `false`, on ne déclenche rien. Si après 1500 ms `track.muted` est toujours vrai → là on bascule en `track-dead`.
- **Bug B** : augmenter `SILENT_THRESHOLD_DEFAULT` de **6000 → 12000 ms** (12 s sans aucun signal RMS ni STT) pour absorber les pauses de réflexion normales.
- **Bug C** : dans l'effet RMS, quand `active` passe de `false → true`, remettre `lastSignalAtRef.current = Date.now()` (déjà fait dans la branche `!active`, mais il faut aussi le faire à la transition inverse).
- **Robustesse** : avant de basculer en `silent`, exiger 2 ticks RMS consécutifs au-dessus du seuil de silence (anti-glitch sur un frame isolé).

### 2. `src/pages/InterviewStart.tsx`

- Le watchdog `noMicSignal` (l. 1275) reste à 10 s, c'est correct — il utilise `WARMUP_SILENCE_MAX=0.01` (très bas) donc ne se déclenche que sur silence réel.
- **Aucune modification** côté watchdog pour ne pas casser la détection du vrai problème "STT mort".

### 3. `src/components/interview/MicFailureBanner.tsx`

- Le debounce de masquage (1500 ms) reste.
- Ajouter un **debounce d'affichage** de 800 ms pour `status === "silent"` : on n'affiche la bannière jaune que si la condition persiste au moins 800 ms. → évite tout clignotement résiduel.
- Le mode `track-dead` reste affiché immédiatement (vrai problème bloquant).

## Hors scope

- Ne touche pas au `MicBlockingDialog` du boot ni au test technique (`InterviewDeviceTest`), où les seuils sont déjà adaptés.
- Pas de changement de design ni de copywriting.
- Pas de migration DB.

## Validation

Après implémentation je vais :
1. Lancer le preview, démarrer un entretien sur Chrome, vérifier qu'aucune bannière jaune/rouge n'apparaît pendant les 12 premières secondes même si je ne parle pas.
2. Vérifier qu'une pause de réflexion de 8-10 s en cours de réponse ne déclenche plus la bannière jaune.
3. Couper physiquement le micro (mute système) → la bannière rouge "Micro déconnecté" doit toujours s'afficher (~1,5 s).
