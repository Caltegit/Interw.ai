# Correction du décalage matrice Fit — option (a)

## Cause (rappel court)

Dans `supabase/functions/generate-fit-matrix/index.ts`, les questions sont envoyées à l'IA numérotées « Q1, Q2… » mais le schéma attend un `question_index` 0-based. L'IA renvoie donc `question_index=1` pour Q1, `2` pour Q2, etc. À la relecture, `find(r => Number(r.question_index) === i)` avec `i` commençant à 0 apparie **Q2 avec les cellules de Q1, Q3 avec celles de Q2**, etc. D'où pop-up et `message_id` décalés d'une question.

## Changements

### 1. `supabase/functions/generate-fit-matrix/index.ts` (edge function, seul fichier modifié)

- Dans le prompt utilisateur : préfixer chaque bloc question par `[question_index=<i>]` (0-based) et ajouter une règle explicite : « `question_index` doit reprendre exactement la valeur du bloc, en commençant à 0. »
- Dans la normalisation (autour de la ligne 249) : appariement strict par `question_index` **sans fallback positionnel** `parsed.rows[i]`. Ajouter un filet : si aucune ligne n'a `question_index === 0` mais qu'il en existe une à `questions.length`, décaler tout de −1 avant appariement (compat rétro si un modèle re-régresse). Les questions sans ligne IA correspondante retombent sur des cellules neutres (score 50, "aucun élément…"), comportement déjà en place pour `evidence: "none"`.

### 2. `src/components/session/FitMatrixCard.tsx` (front, ajout mineur)

- Ajouter un bouton discret « Régénérer la matrice » dans l'en-tête de la carte (visible uniquement si `!readOnly && sessionId`). Il appelle `generate-fit-matrix` avec `{ session_id, force: true }`, exactement comme le bouton « Voir les détails » existant mais avec `force`. Confirmation via `AlertDialog` (« Recalculer va remplacer la matrice actuelle et peut modifier le score global »).
- Le paramètre `force` est déjà géré côté edge function (ligne 25), rien à changer sur le backend.

## Impact build & risques

**Build TypeScript / Vite** : aucun risque. Le seul changement front est un bouton + dialog utilisant des composants shadcn déjà importés ailleurs (`Button`, `AlertDialog`). Pas de nouvelle dépendance, pas de changement de types, pas de changement de contrat `FitMatrixData`. `tsgo` passera.

**Edge function** : Deno, redéployée isolément via `supabase--deploy_edge_functions`. Une erreur de déploiement n'affecte que cette fonction, jamais le build de l'app. La signature d'entrée/sortie reste identique (`session_id`, `force`, `update_report`) — aucun autre appelant (`generate-report`, bouton « Voir les détails ») n'est impacté.

**Tests** : aucun test e2e ne cible la matrice Fit (`tests/e2e/*` couvre login, candidate-journey, project, media). Rien à mettre à jour. Le test `report-generation.spec.ts` vérifie juste qu'un score/critère apparaît — non affecté.

**Données existantes** : les matrices déjà en base gardent le décalage tant que l'utilisateur ne clique pas « Régénérer ». Pas de migration SQL, pas de backfill automatique. Coût IA nul tant que personne ne régénère.

**Effet de bord côté score** : régénérer une matrice recalcule `overall_score`, `recommendation`, `criteria_scores`, `fit_breakdown` (lignes 394-422 de l'edge function). C'est déjà le cas aujourd'hui pour toute (re)génération — le dialog de confirmation prévient l'utilisateur.

**Ce qui ne bouge pas** : `FitBreakdownCard`, `FitScoreBadge`, `SessionReportView`, `useSessionDetail`, le rendu vidéo, les partages de rapport, la génération initiale de rapport. Zéro effet sur les autres surfaces.

## Vérification post-déploiement

1. Déployer la fonction, ouvrir une session complétée avec matrice existante, cliquer « Régénérer ».
2. Vérifier qu'une pop-up ouverte sur Q4 cite bien la réponse à Q4 (comparer avec la transcription à côté).
3. Vérifier que le bouton « Aller à l'extrait » saute au message de Q4 et non Q3.
