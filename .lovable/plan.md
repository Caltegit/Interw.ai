## Objectif

Garantir qu'aucun rapport publié ne contienne de note aberrante (score < 20 sur un critère Fit Poste ou un trait Big Five) due à une réponse IA partielle. Aujourd'hui `isPayloadValid` ne détecte que les payloads totalement vides : un rapport où **un seul** critère sort à 0/15 passe en production (cas Manon Micellis).

## 1. Validation renforcée dans `generate-report`

Dans `isPayloadValid` (lignes 508-521 de `supabase/functions/generate-report/index.ts`), ajouter :

- **Plancher Fit Poste** : pour chaque entrée de `fit_breakdown`, si `score < 20` ET `statement` vide ou < 20 caractères → invalide (raison `low_fit_score:<criterion>`).
- **Plancher Big Five** : pour chaque trait, si `score < 20` ET `confidence !== "low"` → invalide (raison `low_big_five:<trait>`). On garde la tolérance pour transcriptions courtes via `confidence:"low"` neutre ~50 (imposé par le prompt ligne 348).

Conséquence directe : la boucle existante (pro-1 → pro-2 → flash) repasse automatiquement. Coût zéro à ajouter, on capitalise sur l'infra de retry déjà en place.

## 2. Régénération ciblée (section-level repair)

Plutôt que de tout relancer si le 3e essai foire sur **un seul** critère, mode "repair" :

- Nouvelle fonction interne `repairSection(parsed, sessionId, kind, target)` dans `generate-report/index.ts` où `kind ∈ {"fit_criterion", "big_five_trait"}`.
- Elle rappelle Gemini 2.5 Pro avec un prompt restreint : seulement le critère/trait suspect, la transcription complète, et un tool schema réduit à cet objet.
- Si la repair-call renvoie un score ≥ 20 cohérent (ou `confidence:"low"` + score neutre ~50 pour Big Five), on patche `parsed` à cet endroit et le pipeline continue normalement.
- Si la repair échoue 2× sur le même champ, on garde le score initial mais on marque `stats.report_anomalies = [{kind, target, kept_score, attempts}]` pour traçabilité.

Avantages : pas de surcoût IA quand tout est correct, et on n'écrase pas un rapport globalement bon à cause d'un seul champ aberrant.

## Détails techniques

### Seuils
- Critère : `score < 20` considéré anormal.
- Trait : `score < 20` sans `confidence:"low"`.
- Plafond repair : 2 tentatives par section, puis on conserve.

### Fichiers touchés
- `supabase/functions/generate-report/index.ts` uniquement : enrichir `isPayloadValid`, ajouter `repairSection`, écrire `stats.report_anomalies` si fallback.

### Non-objectifs
- Pas de sweep périodique (sera réévalué plus tard si nécessaire).
- Pas de changement UI/admin.
- Pas de refonte du prompt ni du `score_breakdown`.
- Pas de migration de schéma (anomalies tiennent dans `reports.stats` JSONB).

### Risques
- Surcoût IA marginal : repair = ~10× moins de tokens qu'une régénération complète.
- Risque "yo-yo" si Gemini renvoie systématiquement un score bas légitime → mitigé par le plafond 2 tentatives par section.

## Étapes d'implémentation

1. Patch `isPayloadValid` avec les nouveaux planchers.
2. Implémenter `repairSection` + intégration dans le flux après validation.
3. Régénérer le rapport `7a1c7299` (Manon Micellis) en mode `force` pour vérifier que la repair patche bien les champs.
4. Vérifier en base que `stats.fit_breakdown` et `personality_profile` n'ont plus de scores < 20 injustifiés.
