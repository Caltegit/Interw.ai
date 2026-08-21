# Migration vers Gemini 3.7 Flash (secours GPT-5.6 Terra)

Passage de toutes les fonctions IA de la génération 2.5 / 3-preview vers **Gemini 3.7 Flash**, avec **GPT-5.6 Terra** comme filet de sécurité sur le scoring.

## Ce qui change, fonction par fonction

| Fonction | Aujourd'hui | Après |
|---|---|---|
| Transcription des réponses | 2.5 Flash | 3.7 Flash |
| Matrice de fit | 2.5 Flash → 2.5 Pro | 3.7 Flash → GPT-5.6 Terra |
| Rapport d'entretien | 2.5 Pro ×2 → 2.5 Flash | 3.7 Flash ×2 → GPT-5.6 Terra |
| Sous-appels du rapport (résumé, relances, extras) | 2.5 Pro / 2.5 Flash | 3.7 Flash |
| Analyse non-verbale | 2.5 Pro | 3.7 Flash |
| Analyse para-verbale | 2.5 Flash | 3.7 Flash |
| Conversation d'entretien en direct | 2.5 Flash | 3.7 Flash |
| Copilote | 3 Flash Preview | 3.7 Flash |
| Import d'offre / de page publique | 2.5 Flash / 3 Flash Preview | 3.7 Flash |

Les synthèses vocales (voix des questions) ne bougent pas.

## Bénéfices attendus

- Transcription plus fidèle : moins d'hallucinations du type « mon petit chéri » à la place de « boire un café ».
- Latence réduite sur l'entretien en direct et le copilote.
- Coût par entretien stable, voire en baisse : on retire les appels 2.5 Pro, nettement plus chers, du chemin principal.
- Notation plus cohérente : la matrice tourne sur un modèle de dernière génération plutôt que sur un Flash d'ancienne génération.

## Détails techniques

1. **Centraliser les identifiants de modèle** dans `supabase/functions/_shared/ai-models.ts` (nouvelles constantes `MODEL_FAST`, `MODEL_SCORING`, `MODEL_FALLBACK`) et faire pointer chaque fonction dessus. Fini les chaînes en dur dispersées dans 9 fichiers : un futur changement de modèle devient une seule ligne.
2. **Chaînes de secours** : dans `generate-fit-matrix` et `generate-report`, la boucle d'essais devient `3.7-flash` → `3.7-flash` (nouvelle tentative) → `openai/gpt-5.6-terra`.
3. **Corps de requête adapté à GPT-5.6** sur la branche de secours uniquement, sinon la passerelle renvoie une erreur 400 :
   - `reasoning_effort: "none"` obligatoire (sans quoi les appels avec outils sont rejetés) ;
   - `max_completion_tokens` au lieu de `max_tokens` ;
   - aucun champ `temperature`.
   Un petit assistant construit le corps selon le fournisseur du modèle sélectionné, pour éviter de dupliquer la logique.
4. **Schémas d'outils** inchangés : ils sont déjà en `additionalProperties: false` avec tous les champs requis, donc compatibles avec les deux fournisseurs.
5. **Gestion d'erreurs** : les codes 402 (crédits épuisés) et 429 (trop de requêtes) restent traités comme aujourd'hui, et un échec sur le secours OpenAI ne doit pas empêcher le rapport de se terminer en mode dégradé.

## Vérification avant de conclure

- Un appel réel de transcription sur une session existante, puis lecture du texte produit.
- Une régénération complète de rapport sur une session témoin (matrice + rapport + analyses), pour confirmer que les notes restent cohérentes et que le chemin de secours GPT-5.6 répond sans erreur 400.
- Un tour de conversation d'entretien et une requête copilote.
