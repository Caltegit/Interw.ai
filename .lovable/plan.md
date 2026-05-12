## Problème constaté

Pour la session `bd82a2ff…`, le rapport a bien été régénéré (`generated_at` = 2026‑05‑12 07:02:31) et `analyze-paraverbal` a bien été déclenchée par `generate-report` (logs : `analyze-paraverbal triggered: 502`).

L'analyse a échoué côté Gemini :
```
[paraverbal] gemini error 503 — "This model is currently experiencing high demand…"
```

Trois faiblesses se cumulent :

1. **Aucun retry** dans `analyze-paraverbal` : un seul 503/429 transitoire suffit à perdre l'analyse, sans trace côté UI.
2. **Pas de `force: true`** lors du déclenchement par `generate-report` : si une analyse partielle existait déjà, elle ne serait pas relancée.
3. **Aucun statut d'analyse** stocké en base : impossible de distinguer « jamais lancée » de « échouée » → l'UI affiche toujours « Analyse vocale non disponible » sans indice.

## Plan

### 1. `supabase/functions/analyze-paraverbal/index.ts`
- Ajouter un retry avec backoff exponentiel (3 tentatives, 2 s → 5 s → 12 s) sur les statuts Gemini `429`, `500`, `502`, `503`, `504`.
- En cas d'échec final, écrire un objet de statut dans `reports.paraverbal_analysis` :
  ```json
  { "status": "failed", "error": "gemini_503", "failed_at": "…" }
  ```
  (sans `profile`, donc l'UI continue de proposer le bouton « Lancer l'analyse vocale »).
- En cas de succès, conserver le payload existant (`profile`, `summary`, …) — pas de changement de format pour l'UI.

### 2. `supabase/functions/generate-report/index.ts`
- Passer `{ session_id, force: true }` au déclenchement automatique pour réécraser un éventuel état `failed` ou ancien.

### 3. UI (`SessionDetail.tsx`)
- Si `report.paraverbal_analysis?.status === "failed"`, afficher un petit message « La dernière analyse vocale a échoué (Gemini surchargé). Réessayez. » au‑dessus du bouton « Lancer l'analyse vocale ».
- Aucun changement sur `SharedReport.tsx` (lecture seule).

### Détails techniques
- Le retry reste dans la même invocation (durée maximale ≈ 25 s ajoutées en pire cas, largement sous la limite 150 s d'edge function).
- Le payload `paraverbal_analysis` continue d'être un `jsonb` ; les composants existants testent `analysis?.profile`, donc un objet `{status:"failed"}` sera traité comme « non disponible » sans casser.
- Pas de migration SQL nécessaire.

## Fichiers modifiés
- `supabase/functions/analyze-paraverbal/index.ts`
- `supabase/functions/generate-report/index.ts`
- `src/pages/SessionDetail.tsx`
