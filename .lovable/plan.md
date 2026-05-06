## Problème

Sur `https://interw.ai`, le `navigator.sendBeacon(url, blob)` envoie un `Blob` de type `application/json`. Ce content-type déclenche un **preflight CORS** (OPTIONS), et comme `sendBeacon` envoie automatiquement les cookies (credentials mode = include), le navigateur refuse la réponse `Access-Control-Allow-Origin: *` renvoyée par l'edge function. Résultat : la finalisation côté serveur n'est jamais déclenchée quand un candidat ferme l'onglet, ce qui fait apparaître `interview_stuck_after_transition` et perd des chunks.

Les erreurs `STT onerror: network` viennent de l'API Web Speech du navigateur (dépend de Google) et ne sont pas liées à CORS — on a déjà un fallback Whisper côté serveur via les chunks vidéo.

## Correctif

### 1. `src/pages/InterviewStart.tsx` — éviter le preflight

Remplacer le `Blob` JSON par un `Blob` `text/plain`. C'est une requête CORS "simple" : pas de preflight, pas de problème de wildcard.

```ts
const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
navigator.sendBeacon?.(url, blob);
```

### 2. `supabase/functions/finalize-abandoned-session/index.ts` — accepter text/plain

Lire le body brut puis `JSON.parse`, au lieu de `req.json()` :

```ts
const raw = await req.text();
const body = raw ? JSON.parse(raw) : {};
```

Garder le handler `OPTIONS` actuel (utile si un autre client fait un preflight).

### 3. Bonus durcissement CORS (toutes les edge functions sensibles appelées avec credentials)

Pour les futurs cas où le client enverrait un header custom (et donc déclencherait un preflight), refléter l'Origin de la requête dans `Access-Control-Allow-Origin` au lieu de `*`, sur `finalize-abandoned-session` uniquement (les autres fonctions n'utilisent pas `sendBeacon`) :

```ts
const origin = req.headers.get("origin") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": origin,
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

### 4. Note sur la mémoire

Les logs montrent aussi `Memory limit exceeded` dans `finalize-abandoned-session` quand beaucoup de chunks sont concaténés en mémoire. **Hors scope de cette correction CORS**, à traiter séparément si tu veux (assemblage en streaming au lieu de tout charger).

## Fichiers modifiés

- `src/pages/InterviewStart.tsx` (1 ligne — type du Blob)
- `supabase/functions/finalize-abandoned-session/index.ts` (parsing body + CORS reflète Origin)

Aucune migration DB.
