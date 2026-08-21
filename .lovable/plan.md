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

## Comment mesurer la différence

Aucun de ces gains n'est chiffrable à l'avance de façon honnête : les écarts entre modèles dépendent de nos prompts et de nos audios réels. On les mesure donc sur nos propres sessions, avec un protocole simple exécuté avant puis après la bascule.

**Le banc d'essai** : 8 à 10 sessions déjà terminées, choisies pour être représentatives — 2 avec un audio dégradé ou très court (là où 2.5 Flash hallucinait), 2 entretiens longs, 4 à 6 entretiens normaux. Ces sessions ne sont pas modifiées : on relance les traitements dans un mode « à blanc » qui écrit les résultats dans une table de comparaison au lieu d'écraser les rapports existants.

**Les quatre indicateurs suivis** :

| Indicateur | Comment on le mesure | Ce qu'on veut voir |
|---|---|---|
| Fidélité de transcription | Relecture humaine de la transcription face à la vidéo, sur les segments courts et bruités. Comptage des passages inventés ou faux. | Zéro invention sur les segments courts, qui sont le point faible actuel |
| Stabilité de la notation | Chaque session est notée 3 fois de suite. On regarde l'écart entre la note la plus haute et la plus basse, par critère. | Un écart plus faible qu'aujourd'hui, et jamais plus de quelques points |
| Latence | Durée mesurée de chaque appel, déjà enregistrée dans les journaux des fonctions. | Baisse nette sur le rapport (on retire 2.5 Pro) et sur la conversation en direct |
| Coût | Crédits consommés par session complète, relevés dans les journaux de la passerelle IA. | Baisse, ou au pire stabilité |

**Le point subjectif, qui compte autant** : sur 3 sessions, tu compares côte à côte l'ancien rapport et le nouveau, et tu dis si les justifications de la matrice sont mieux ancrées dans ce que le candidat a réellement dit. C'est le seul juge valable de la qualité de notation.

**Livrable** : un tableau récapitulatif avant/après sur ces quatre indicateurs, que je te présente avant de basculer la production. Si un indicateur se dégrade, on garde l'ancien modèle sur la fonction concernée uniquement — la centralisation des identifiants rend ce retour arrière immédiat.


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
