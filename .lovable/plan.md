## Problème observé

Session `7a1c7299` (Manon Micellis, projet Morning) :
- L'IA a produit un résumé exécutif cohérent, un `verdict_headline` correct, et un `ai_score = 76`
- MAIS tous les champs structurés sont vides : `fit_breakdown` (4 critères à 0), `personality_profile` Big Five (5 traits à 0, confidence "low", evidences vides), `strengths`, `areas_for_improvement`, `decision_drivers`, `signals`
- Conséquence sur le rapport :
  - **Fit Poste = 0** (moyenne pondérée des critères à 0)
  - **Big Five = 0**
  - Score global affiché = 38 (mélange hybride `(76 + 0) / 2`)

C'est un classique de **réponse LLM tronquée ou partiellement valide** : Gemini 2.5 Pro a écrit les blocs texte au début, puis a été coupé (max output tokens, reasoning budget, ou tool-call partiel) avant de remplir les tableaux. Le parseur prend le JSON tel quel et stocke 0/[] partout.

Dans `supabase/functions/generate-report/index.ts` lignes 549-565, on lit `tool_calls[0].function.arguments` sans vérifier :
- `finish_reason` (`length`, `content_filter`...)
- la cohérence du payload (arrays non-vides, traits Big Five remplis)

Aucun `max_tokens` n'est défini → on hérite du défaut du gateway, qui peut être trop bas pour un entretien de 15 réponses.

## Plan

### 1. Garde-fou côté `generate-report`

Dans la boucle de retry (lignes 518-571), après `JSON.parse(argsStr)` :

- Inspecter `aiData.choices[0].finish_reason`. Si différent de `stop`/`tool_calls`, logger et **considérer la tentative comme un échec** (`continue` vers le retry suivant).
- Ajouter une validation minimale du payload :
  - `parsed.fit_breakdown` doit être un tableau non vide ET au moins une entrée doit avoir `score > 0` OU `statement` non vide
  - `parsed.personality_profile` doit avoir au moins un trait avec `score > 0` OU `confidence !== "low"` avec evidences
  - Si check KO → marquer la tentative comme `invalid_payload` et passer au modèle suivant
- Augmenter explicitement la marge de tokens dans `buildBody` : ajouter `max_tokens: 8000` (ou la limite supportée par le gateway pour Gemini Pro) pour éviter la troncature sur les entretiens longs.

### 2. Logger pour traçabilité

Ajouter dans la table existante (ou via `console.log` structurés déjà branchés) la valeur de `finish_reason` et la taille du payload, pour pouvoir détecter ce cas en monitoring sans re-déboguer en SQL.

### 3. Régénérer ce rapport

Enqueue un `report_job` pour la session `7a1c7299-cac9-4051-927c-7a35e1f6a864` une fois le correctif déployé, et vérifier en base que `fit_breakdown` et `personality_profile` sont remplis avec des scores > 0.

### Non-objectifs

- Pas de refonte du prompt ni de la pondération `score_breakdown`
- Pas de migration DB (tout se passe dans l'edge function)
- Pas de changement d'UI

### Risques

- Si le payload reste invalide après les 3 tentatives, on renvoie 502 → le job sera retenté par le worker (déjà géré, `max_attempts=6`). Acceptable.
- L'augmentation de `max_tokens` consomme plus de crédits IA par rapport long. Marginal sur volume actuel.
