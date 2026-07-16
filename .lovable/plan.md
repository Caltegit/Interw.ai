## Problème

Dans la matrice, quand l'IA n'a aucun élément pour noter un couple (question, critère), elle met parfois 40, parfois 60, au lieu du 50 neutre convenu.

Le prompt actuel demande « mets un score neutre 50 » mais le modèle ne s'y tient pas — il continue à poser des scores légèrement dessous ou dessus quand la réponse est hors sujet.

## Correction (`supabase/functions/generate-fit-matrix/index.ts`)

Rendre la neutralité **déterministe côté code** au lieu de la déléguer au modèle, avec un champ à 2 états uniquement.

1. **Ajouter un champ `evidence` au schéma de cellule**, requis, avec 2 valeurs :
   - `none` : aucun élément dans la réponse pour évaluer ce critère → score forcé à 50 côté code.
   - `clear` : la réponse contient un élément pour évaluer ce critère → score libre entre 0 et 100 selon l'interprétation de l'IA.

2. **Mettre à jour le prompt** :
   - Règle 2 réécrite : « Pour chaque couple (question, critère), choisis `evidence` :
     - `none` si la réponse ne contient aucun élément pour évaluer ce critère. Le score sera automatiquement fixé à 50 (neutre). Ne cherche pas à deviner.
     - `clear` si la réponse contient un élément pour évaluer ce critère. Donne alors un score de 0 à 100 selon ton interprétation. »
   - Ajouter : « Avec `clear`, tu dois pouvoir citer une phrase précise du candidat dans `quote`. »

3. **Post-traitement** dans la boucle de normalisation :
   - Si `evidence === "none"` → forcer `score = 50`, `justification = "Aucun élément dans la réponse pour évaluer ce critère."`, ignorer `quote` et `message_id`.
   - Si `evidence === "clear"` → garder le score du modèle (clampé 0-100 comme aujourd'hui) et sa justification/quote.
   - Si `evidence` absent ou invalide → traiter comme `none` (fallback sûr).

4. **Moyennes et fit score** : inchangés — les 50 neutres continuent d'être comptés dans les moyennes de colonnes et le fit score, comme aujourd'hui.

## Hors périmètre

- Pas de changement UI : la matrice affiche déjà la note telle quelle. Un 50 neutre s'affichera simplement comme 50.
- Pas de rejeu automatique des rapports existants. L'utilisateur peut cliquer « Régénérer le rapport » sur les sessions concernées.
- Pas de changement du calcul du fit score global.

## Vérification

Régénérer le rapport de la session `0979b322…` et vérifier que les cellules Q1 « Comment ça va ? » et Q2 « Quel poste ? » — qui ne contiennent aucun élément pour la plupart des critères — passent bien à 50 partout au lieu de 40/60.