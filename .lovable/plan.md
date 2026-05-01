## Diagnostic

Le code de conversion est bien en place dans `handleDownloadFullVideo` (SessionDetail.tsx) et appelle `convertToMp4()` pour chaque segment. Mais la conversion échoue silencieusement et tombe dans le fallback `catch` → écrit le WebM original. C'est pourquoi tu reçois toujours des `.webm`.

**Cause racine** : `videoConvert.ts` charge le core ffmpeg.wasm depuis le CDN `unpkg.com` via `toBlobURL`. Deux problèmes courants empêchent ce chargement :

1. **`toBlobURL` fait un `fetch()` cross-origin** vers unpkg. En production sur `interw.ai`, la CSP ou un blocage réseau peut faire échouer ce fetch.
2. **Le worker ffmpeg lui-même** (`814.ffmpeg.js`) est aussi chargé depuis le bundle et peut échouer si non bundlé correctement par Vite.
3. **Aucun log visible** côté utilisateur : l'erreur tombe dans `console.warn` puis silencieusement en fallback `.webm`. L'utilisateur ne sait pas pourquoi.

## Correctifs

### 1. Auto-héberger le core ffmpeg (fiable)
Au lieu de pointer vers unpkg, copier `ffmpeg-core.js` + `ffmpeg-core.wasm` depuis `node_modules/@ffmpeg/core/dist/umd/` vers `public/ffmpeg/` et y pointer en URL relative. Plus de cross-origin, plus de dépendance CDN.

```ts
// videoConvert.ts
const CORE_BASE = "/ffmpeg";
await ffmpeg.load({
  coreURL: `${CORE_BASE}/ffmpeg-core.js`,
  wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
});
```

Ajouter `@ffmpeg/core` aux dépendances (il n'est probablement pas installé, ce qui est aussi une cause possible — le `toBlobURL` actuel évitait l'install mais introduisait la fragilité CDN).

### 2. Remonter l'erreur à l'utilisateur
Dans `SessionDetail.tsx`, en cas d'échec de conversion, afficher un toast d'avertissement explicite (pas seulement console.warn) pour que l'utilisateur comprenne que des `.webm` sont inclus. Déjà partiellement fait via le README mais invisible pendant le téléchargement.

### 3. Pré-vérifier que ffmpeg charge avant de lancer le ZIP
Appeler `await preloadFFmpeg()` (au lieu de fire-and-forget) au tout début de `handleDownloadFullVideo`. Si le chargement plante, afficher une erreur claire et proposer le téléchargement WebM en fallback explicite plutôt que de lancer la conversion segment par segment qui échouera 9 fois.

### 4. Vérifier la console au prochain run
Une fois corrigé, si ça échoue encore, les logs pointeront la vraie cause (ex. SharedArrayBuffer manquant — auquel cas il faudrait ajouter les en-têtes COOP/COEP, mais le build mono-thread `@ffmpeg/core` ne devrait pas en avoir besoin).

## Fichiers modifiés

- `package.json` — ajouter `@ffmpeg/core@0.12.6`
- `public/ffmpeg/ffmpeg-core.js` (copié depuis node_modules)
- `public/ffmpeg/ffmpeg-core.wasm` (copié depuis node_modules)
- `src/lib/videoConvert.ts` — pointer vers `/ffmpeg/` au lieu d'unpkg, supprimer `toBlobURL`
- `src/pages/SessionDetail.tsx` — `await preloadFFmpeg()` avec gestion d'erreur, toast explicite si fallback WebM

## Résultat attendu

Après correction, l'archive ZIP contient bien des fichiers `.mp4` lisibles directement dans QuickTime, VLC, PowerPoint, etc. Si jamais ffmpeg ne charge pas (cas extrême), un toast d'avertissement s'affiche et le ZIP contient des `.webm` avec une note explicite dans le README.