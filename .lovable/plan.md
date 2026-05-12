## Diagnostic

Sur les 125 rapports générés ces 7 derniers jours, **aucun n'a de `paraverbal_analysis`**, et la fonction `analyze-paraverbal` n'a **aucun log d'invocation**. La carte « Communication orale » affiche donc systématiquement l'état vide « Analyse vocale non disponible ». C'est anormal — l'analyse devrait tourner pour chaque rapport.

Cause : dans `generate-report`, l'appel à `analyze-paraverbal` est lancé en *fire-and-forget* (`fetch(...).catch(...)`) **juste avant** `return new Response(...)`. Sans `EdgeRuntime.waitUntil`, l'isolate Deno est terminé dès la réponse renvoyée et la requête sortante est tuée avant d'atteindre la fonction.

De plus, les 125 rapports existants ne seront jamais analysés rétroactivement — il faut un moyen de relancer l'analyse à la demande.

## Changements

### 1. `supabase/functions/generate-report/index.ts` — déclenchement fiable
Envelopper l'appel `fetch("/functions/v1/analyze-paraverbal")` dans `EdgeRuntime.waitUntil(...)` pour garantir que la requête part bien avant la fin de l'isolate. Aucune autre modification de logique.

### 2. `supabase/functions/analyze-paraverbal/index.ts` — autoriser la relance
Retirer le court-circuit `if (report.paraverbal_analysis) return skipped` (ou le passer derrière un paramètre `force`) pour qu'on puisse relancer une analyse depuis le front si besoin.

### 3. `src/components/session/ParaverbalProfileCard.tsx` (et état vide dans `SessionDetail.tsx`)
- Quand `analysis?.profile` est absent : afficher un message clair + un bouton **« Lancer l'analyse vocale »** (visible uniquement côté RH, pas dans `SharedReport`).
- Le bouton invoque `supabase.functions.invoke("analyze-paraverbal", { body: { session_id } })`, montre un état « Analyse en cours (1–2 min)… » puis recharge le rapport.
- État erreur : toast + possibilité de réessayer.

### 4. Hors périmètre
- Pas de batch rétroactif automatique : chaque rapport ancien sera relancé à la demande via le bouton.
- Pas de changement à `SharedReport.tsx` (les liens publics gardent l'état vide actuel — pas d'action).
- Pas de migration DB.

## Détails techniques

```text
generate-report ──(EdgeRuntime.waitUntil)──▶ analyze-paraverbal
                                                    │
                                                    ├─ fetch audio segments
                                                    ├─ upload Gemini Files API
                                                    ├─ Gemini 2.5 Pro multimodal
                                                    └─ UPDATE reports.paraverbal_analysis
```

Le bouton de relance suit le même chemin mais est déclenché par l'utilisateur via `supabase.functions.invoke`.
