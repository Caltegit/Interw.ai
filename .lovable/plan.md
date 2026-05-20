## Lot 1 — Stopper la régression WebM immédiatement

Objectif : rendre **impossible** la livraison silencieuse d'un ZIP contenant du `.webm`. Si la conversion casse, l'utilisateur le voit, on ne fait pas semblant.

### Changements

**1. Self-host de `ffmpeg-core` (plus de CDN)**

- Ajouter `vite-plugin-static-copy` aux devDeps.
- Dans `vite.config.ts`, copier `node_modules/@ffmpeg/core/dist/esm/{ffmpeg-core.js,ffmpeg-core.wasm}` vers `public/ffmpeg/` au build.
- Dans `videoExport.worker.ts`, charger depuis `/ffmpeg/` en priorité, garder les CDN comme fallback ultime (mais en mode dégradé qui ne masque plus l'échec, cf. point 3).

**2. Vérification COOP/COEP au démarrage du worker**

- Vérifier `self.crossOriginIsolated`. Si `false`, lever immédiatement une erreur typée `COOP_COEP_MISSING` avec message clair.
- Dans `vite.config.ts`, verrouiller les en-têtes `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: require-corp` côté dev server + commentaire « NE PAS RETIRER : casse l'export MP4 ».
- Vérifier (et corriger si absent) la config d'hébergement de production pour ces mêmes en-têtes.

**3. Suppression du fallback silencieux**

Dans `videoExport.worker.ts` :
- Quand `convertToMp4` échoue pour un segment : **ne plus ajouter le `.webm` au ZIP**. À la place, enregistrer le segment dans une liste `conversionErrors` retournée au main thread.
- Quand ffmpeg ne charge pas du tout : **ne pas produire de ZIP**. Retourner un message d'erreur typé.
- Conserver le `looksLikeMp4(bytes)` après chaque conversion : si le buffer ne commence pas par `ftyp`, considérer ça comme un échec dur, pas un succès.

**4. UI fail-loud dans `SessionVideoExport.tsx`**

- Nouveaux états gérés : `coopMissing`, `ffmpegLoadFailed`, `partialFailure` (avec liste des segments échoués).
- Si `coopMissing` ou `ffmpegLoadFailed` : écran rouge « Conversion MP4 indisponible » + bouton « Réessayer » + bouton « Signaler le problème » (réutiliser `report-interview-issue`).
- Si `partialFailure` : écran orange listant les segments échoués, avec deux choix explicites :
  - « Réessayer » (relance le worker complet)
  - « Télécharger quand même les segments réussis (MP4 uniquement) » — jamais de WebM dans le ZIP.
- Si succès complet : comportement actuel inchangé.

**5. Garde-fou final dans le worker**

Juste avant `zip.generateAsync`, parcourir `fileEntries` : si **un seul** nom ne se termine pas par `.mp4`, refuser de générer le ZIP et remonter une erreur. Double sécurité au cas où un chemin d'échappement aurait été oublié.

### Fichiers touchés

- `vite.config.ts` — en-têtes COOP/COEP + `vite-plugin-static-copy`
- `package.json` — ajout devDep `vite-plugin-static-copy`
- `src/workers/videoExport.worker.ts` — load local, plus de fallback silencieux, garde-fou final
- `src/pages/SessionVideoExport.tsx` — UI fail-loud + nouveaux états d'erreur

### Hors périmètre (Lot 2/3)

- Transcodage côté serveur (Cloudflare Stream / Mux) → Lot 2
- Test E2E garde-fou format MP4 → Lot 3

### Vérification après implémentation

Avant de te rendre la main, je teste :
1. Build passe sans erreur.
2. Le dev server sert bien `/ffmpeg/ffmpeg-core.wasm` avec `Content-Type: application/wasm`.
3. `crossOriginIsolated` est `true` dans l'onglet de l'app.
4. Test manuel : ouvrir `SessionVideoExport` sur une session avec WebM, vérifier que le ZIP téléchargé contient **uniquement** des `.mp4` (signature `ftyp` au début de chaque fichier).
5. Test de panne : simuler échec ffmpeg (couper le réseau pendant le chargement) → vérifier que l'UI affiche bien l'écran rouge, pas de ZIP produit.

Approuve et j'enchaîne.