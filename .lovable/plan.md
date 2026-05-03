## Objectif

Permettre au téléchargement / conversion MP4 de continuer même quand l'onglet n'est plus au premier plan.

## Pourquoi ça ralentit aujourd'hui

`ffmpeg.wasm` tourne dans le thread principal de l'onglet. Quand l'onglet passe en arrière-plan, le navigateur :
- réduit la fréquence des `setTimeout` / `requestAnimationFrame` à environ 1 Hz
- réduit drastiquement la priorité CPU du thread principal

Résultat : la conversion semble figée tant qu'on ne revient pas sur l'onglet.

## Solution

Combiner trois mécanismes complémentaires dans `src/pages/SessionVideoExport.tsx` :

### 1. Web Worker dédié (cœur de la solution)

Déplacer toute la logique lourde (téléchargement des segments + ffmpeg.wasm + zip) dans un Web Worker.
Les Web Workers ne sont pas throttlés de la même façon que le thread principal : ils continuent à tourner à pleine vitesse même quand l'onglet est en arrière-plan (sauf cas extrêmes de mise en veille système).

Concrètement :
- Nouveau fichier `src/workers/videoExport.worker.ts` qui contient toute la boucle actuelle (fetch des segments, `ffmpeg.load`, `ffmpeg.exec`, `JSZip.generateAsync`).
- La page envoie `{ sessionId, authToken, segments }` au worker et reçoit en retour des messages `progress`, `status`, `done` (avec le Blob du ZIP), `error`.
- La page reste un simple afficheur de progression + déclencheur du téléchargement final.

### 2. Audio silencieux pour empêcher le throttling agressif

Sur certains navigateurs (notamment Chrome récent), même un Worker peut être ralenti si l'onglet est complètement inactif depuis longtemps. Astuce standard : faire jouer un `AudioContext` silencieux (oscillateur à volume 0) tant que la conversion est en cours. L'onglet est alors considéré comme « lecture audio en cours » et garde une priorité normale.

À ajouter au début de la conversion, à arrêter à la fin.

### 3. Wake Lock + notification (confort utilisateur)

- `navigator.wakeLock.request('screen')` quand disponible : empêche la mise en veille de l'écran (utile sur portable / mobile).
- `Notification` du navigateur quand le ZIP est prêt, pour que l'utilisateur sache qu'il peut revenir sur l'onglet. Demande de permission au démarrage si pas encore accordée.
- Petit bandeau d'info en haut de la carte : « Vous pouvez changer d'onglet, la conversion continue en arrière-plan. »

## Détails techniques

- Vite supporte nativement les workers via `new Worker(new URL('../workers/videoExport.worker.ts', import.meta.url), { type: 'module' })`.
- `ffmpeg.wasm` fonctionne dans un Worker (c'est même son contexte d'exécution préféré). On charge `@ffmpeg/core` via `toBlobURL` exactement comme aujourd'hui, mais depuis le worker.
- Le client Supabase ne tourne pas dans le worker : on récupère le `access_token` côté page et on le passe au worker, qui fait des `fetch` directs vers les URLs de segments (déjà signées) et vers l'API Supabase si besoin.
- Communication via `postMessage` avec des messages typés (`{ type: 'progress', value: number, label: string }`, etc.). Le Blob final est transféré via `Transferable` pour éviter une copie mémoire.
- L'`AudioContext` silencieux reste sur le thread principal (les Workers ne peuvent pas créer d'AudioContext).
- Wake Lock est relâché automatiquement à la fin ou en cas d'erreur ; on le re-demande sur `visibilitychange` si le navigateur le révoque.

## Fichiers touchés

- nouveau : `src/workers/videoExport.worker.ts` (logique extraite de la page)
- modifié : `src/pages/SessionVideoExport.tsx` (devient un orchestrateur léger : worker + audio silencieux + wake lock + notification + UI)

## Limites honnêtes

- Si l'utilisateur **met l'ordinateur en veille**, tout s'arrête (aucune API web ne peut empêcher ça).
- Sur mobile iOS Safari, les Workers sont aussi ralentis quand l'app passe en arrière-plan ; l'audio silencieux aide mais ne garantit pas 100 %.
- Sur desktop Chrome/Firefox/Edge, la combinaison Worker + audio silencieux donne un comportement quasi identique à un onglet au premier plan.
