## Diagnostic

Le `start_seconds` est bien stocké en base (vérifié : 3, 5, 9, 52 s pour les 5 critères de la session ouverte). Le problème vient de `SessionVideoNavigator.playMessage` côté front (`src/components/session/SessionVideoNavigator.tsx`) :

1. **Marge de -5 s trop agressive.** Le code fait `seek = max(0, startSeconds - 5)`. Pour les 3 premiers critères (3 s, 5 s, 9 s), on retombe à 0 ou ~4 s → impression de "ça démarre au début".
2. **Reset à 0 dans `stopCurrent`.** Quand on est déjà sur le bon clip, `stopCurrent()` fait `currentTime = 0` puis on tente `currentTime = target`. Sur les WebM `MediaRecorder` (durée = `Infinity` tant qu'on n'a pas fait l'astuce du `currentTime = 1e9`), le navigateur peut refuser le seek tant que la durée n'est pas connue → la vidéo reste à 0.
3. **Race au changement de clip.** `pendingSeekRef` est appliqué dans l'effet de chargement, mais si `loadedmetadata` annonce `duration = Infinity`, `applyPendingSeek` est appelé avec `duration = 0` → target borné à 0. La 2e étape (`fixDuration` → `timeupdate`) re-applique bien le seek, mais entre-temps `play()` peut déjà avoir démarré à 0.

## Changements (front uniquement)

Fichier : `src/components/session/SessionVideoNavigator.tsx`

### 1. Marge adaptative au lieu de -5 s fixe
```ts
// Avant : const seek = Math.max(0, (startSeconds ?? 0) - 5);
// Après : marge proportionnelle, mini 0,5 s, maxi 3 s
const raw = startSeconds ?? 0;
const margin = Math.min(3, Math.max(0.5, raw * 0.15));
const seek = Math.max(0, raw - margin);
```
→ pour 3 s on démarre à ~2,5 s ; pour 9 s à ~7,5 s ; pour 52 s à ~49 s.

### 2. Ne pas reset `currentTime = 0` dans le chemin "même clip"
Extraire un `pauseOnly()` qui annule le `play()` en attente sans toucher à `currentTime`, et l'utiliser dans `playMessage` (cas `i === index`). Garder le reset à 0 pour les vrais changements de clip.

### 3. Garantir la durée avant le seek "même clip"
Dans le chemin `i === index` :
- Si `duration === Infinity` ou `NaN`, déclencher `fixDuration()` et faire le seek dans le `timeupdate` final (réutiliser le mécanisme existant via `pendingSeekRef` + remount logique).
- Sinon, seek direct comme aujourd'hui.

### 4. Différer `safePlay()` après le seek
Sur changement de clip : ne lancer `safePlay()` qu'après que `applyPendingSeek` a été appelé avec une `duration` finie (et pas dans la branche `Infinity` initiale). Évite le démarrage à 0 visible 0,5 s avant le saut.

## Validation

1. Ouvrir `/sessions/f3f4c74b-3b01-4e7f-875d-a08d29224dd4`.
2. Cliquer sur "Voir le moment" du critère **Expérience hospitality** (start = 3 s) → la vidéo doit démarrer ~2,5 s, pas à 0.
3. Cliquer sur "Voir le moment" du critère **Leadership & management** (start = 52 s, autre clip) → changement de clip + démarrage ~49 s.
4. Re-cliquer sur le même bouton plusieurs fois → seek refait à chaque fois, pas de retour à 0.
5. Tester aussi depuis "Signaux" et "Profil de communication" qui utilisent le même mécanisme.

## Hors périmètre

- L'estimation IA peut rester imprécise quand `transcript_segments` est `null` (cas de la session testée). Améliorer la transcription horodatée est un autre chantier (back).
- Pas de changement de schéma ni de logique métier.
