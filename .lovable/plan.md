## Objectif

1. Supprimer le `Memory limit exceeded` de `finalize-abandoned-session` en assemblant la vidéo en streaming.
2. Éviter de finaliser à tort un candidat qui revient sur l'onglet : ne déclencher l'abandon que sur `pagehide`, plus sur `visibilitychange`.

## 1. Assemblage en streaming (`supabase/functions/finalize-abandoned-session/index.ts`)

Aujourd'hui `assembleQuestion()` télécharge tous les chunks en RAM (`buffers: Uint8Array[]`), puis alloue un `Uint8Array` de la taille totale. Sur une question longue (10+ min), ça peut dépasser la limite mémoire de l'edge function.

Remplacement : construire une `ReadableStream<Uint8Array>` qui, pour chaque chunk dans l'ordre, télécharge le fichier et pipe son contenu via `.stream().getReader()`. On passe ce stream directement à `supabase.storage.upload(path, stream, { contentType, upsert, duplex: "half" })`. Un seul chunk est en mémoire à la fois (~100-300 Ko).

Pseudo-code de remplacement de la boucle de download/merge :

```ts
const stream = new ReadableStream<Uint8Array>({
  async pull(controller) {
    // index courant tenu dans une closure
    if (i >= chunkFiles.length) { controller.close(); return; }
    const f = chunkFiles[i++];
    const { data, error } = await supabase.storage
      .from("media").download(`${folder}/${f.name}`);
    if (error || !data) return; // skip chunk corrompu, continue
    const reader = data.stream().getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      controller.enqueue(value);
    }
  },
});

const { error: upErr } = await supabase.storage
  .from("media")
  .upload(finalPath, stream, {
    contentType: "video/webm",
    upsert: true,
    duplex: "half",
  } as any);
```

Le manifest reste écrit comme avant. La détection `q{i}.webm` déjà présent reste pour l'idempotence.

## 2. Ne plus finaliser sur `visibilitychange` (`src/pages/InterviewStart.tsx`, lignes 463-468 et cleanup 489)

Retirer le listener `visibilitychange` et la fonction `onVisibility`. Garder uniquement `pagehide` (déclenché à la fermeture réelle de l'onglet, navigation, ou kill mobile, et non quand l'utilisateur change d'app puis revient).

Effet : un candidat qui passe en arrière-plan 30 s puis revient n'est plus marqué `completed` à tort. La récupération en cas de fermeture définitive reste assurée par `pagehide` + le filet de sécurité serveur (`cleanup-abandoned-sessions` toutes les heures).

## Risques

- **Streaming upload** : nécessite que la version `@supabase/supabase-js` utilisée (2.49.1) accepte un `ReadableStream` côté Deno. Si l'API rejette le stream, fallback : assembler par lots de N chunks (par ex. 20) et utiliser `upload` puis `update` avec `move`/concat — mais en pratique supabase-js v2 accepte les streams avec `duplex: "half"`. À valider au déploiement via les logs de la fonction.
- **Suppression de `visibilitychange`** : sur iOS, `pagehide` est bien déclenché à la fermeture d'onglet et au verrouillage prolongé. Pas de régression attendue sur la récupération réelle d'abandon.

## Fichiers modifiés

- `supabase/functions/finalize-abandoned-session/index.ts` (réécriture de `assembleQuestion`, ~30 lignes)
- `src/pages/InterviewStart.tsx` (suppression de 4 lignes : `onVisibility`, addEventListener, removeEventListener)

Aucune migration DB.