## Pourquoi le rapport de Raphaëlle ne revient pas

Dans les logs `generate-report` (il y a ~10 min) :

```
Failed to parse AI tool arguments: Error: No tool call returned
... "error":{"code":502,"message":"Upstream idle timeout exceeded","metadata":{"error_type":"provider_unavailable"}}
```

Ce qui s'est passé :

1. `useRegenerateReport` supprime l'ancien rapport, puis appelle `generate-report`.
2. `generate-report` interroge `google/gemini-2.5-pro` via la passerelle Lovable AI.
3. Gemini 2.5 Pro est resté en mode "reasoning" trop longtemps → la passerelle a renvoyé un HTTP 200 contenant un `error` 502 inline, sans `tool_calls`.
4. L'edge function attrape "No tool call returned" et renvoie 500.
5. Côté UI, la mutation a échoué, mais comme on a déjà `DELETE`-é l'ancien rapport, l'écran reste vide et tourne en boucle sur le `refetchInterval` (5 s) qui ne trouve jamais de nouveau rapport.

Ce n'est donc **pas normal** : la génération a échoué silencieusement. Il faut rendre l'edge function résiliente à ce cas (qui revient régulièrement avec Gemini Pro sur les longs entretiens) et éviter de perdre l'ancien rapport quand la regénération échoue.

## Changements

### 1. `supabase/functions/generate-report/index.ts`
- Détecter le cas "HTTP 200 mais pas de `tool_calls`" (souvent un 502 inline `provider_unavailable` / `Upstream idle timeout`).
- Sur ce cas **et** sur HTTP 5xx / 502 / 504, **retry automatique** :
  - 1ᵉʳ retry : même modèle (`gemini-2.5-pro`), 1 essai.
  - 2ᵉ retry : fallback `google/gemini-2.5-flash` (plus rapide, supporte aussi le tool calling).
- Garder le 429 / 402 inchangés (pas de retry, message clair).
- Logger explicitement le motif (`upstream_timeout`, `no_tool_call`, `5xx`) pour faciliter le debug.

### 2. `src/hooks/queries/useSessionDetail.ts` — `useRegenerateReport`
- Ne **plus** supprimer l'ancien rapport avant l'appel. À la place :
  - Appeler `generate-report` qui se chargera d'`upsert` (le code de génération écrit déjà via `insert` ; on l'ajuste pour faire un `upsert` sur `session_id`).
  - Si la regénération échoue, l'ancien rapport reste visible → l'utilisateur n'a pas un écran vide qui tourne dans le vide.

### 3. `supabase/functions/generate-report/index.ts` — persistance
- Remplacer le `insert` final par `upsert({ ... }, { onConflict: "session_id" })` pour supporter le scénario "regénérer sans supprimer".

## Aucune migration DB nécessaire

`reports.session_id` est déjà unique (ou doit l'être — on vérifiera vite avant l'`upsert` et ajoutera une contrainte unique via migration si manquante).

## Pour Raphaëlle dans l'immédiat

Une fois le patch déployé, je relancerai sa génération depuis l'UI — le retry/fallback devrait passer en < 30 s avec Flash si Pro re-time-out.
