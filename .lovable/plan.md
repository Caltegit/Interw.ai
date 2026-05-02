1. Revenir à une logique de relance non forcée
- Dans `supabase/functions/ai-conversation-turn/index.ts`, retirer la règle qui force `action = "follow_up"` dès qu'il reste des relances possibles.
- Conserver seulement les garde-fous métier :
  - pas de relance si elles sont désactivées,
  - pas de relance au-delà du maximum,
  - sur la dernière question, `next` devient `end`.
- Laisser Gemini décider entre `follow_up`, `next` et `end` quand une relance est encore possible.

2. Réécrire l'instruction envoyée à Gemini
- Modifier le prompt pour qu'il dise clairement :
  - `follow_up` uniquement si la réponse mérite réellement d'être creusée,
  - `next` si la réponse est suffisante,
  - `end` seulement en fin d'entretien.
- Interdire dans le prompt toute formulation ambiguë où le message de relance pourrait déjà annoncer la question suivante.

3. Supprimer le forçage côté client
- Dans `src/pages/InterviewStart.tsx`, enlever le garde-fou local qui remplace `next` par `follow_up` quand il reste des relances disponibles.
- Le client doit respecter la décision retournée par la fonction :
  - `follow_up` => on reste strictement sur la question actuelle,
  - `next` => on passe à la suivante,
  - `end` => on termine.

4. Solidifier l'affichage pour éviter tout mélange entre relance et question suivante
- Vérifier et renforcer la séparation des branches `follow_up` / `next` dans `handleSendResponse`.
- Garantir que tant que l'action est `follow_up` :
  - `currentQuestionIndex` ne bouge pas,
  - aucun média de la question suivante n'est attaché,
  - aucune transition du type « question suivante » n'est injectée,
  - la reprise micro/enregistrement repart bien sur la même question.
- Ajouter une normalisation défensive du message si Gemini renvoie une relance avec un texte de transition incohérent.

5. Vérification ciblée du flux
- Contrôler les cas suivants :
  - question avec relances activées + réponse incomplète => relance, sans affichage de la suivante,
  - question avec relances activées + réponse suffisante => passage direct à la suivante,
  - question avec plusieurs relances possibles => rester sur la même question tant que Gemini choisit `follow_up`, puis seulement ensuite passer,
  - dernière question => jamais de « question suivante ».

Détails techniques
- Fichiers concernés :
  - `supabase/functions/ai-conversation-turn/index.ts`
  - `src/pages/InterviewStart.tsx`
- Le but n'est plus de consommer automatiquement toutes les relances disponibles.
- Le vrai contrat devient : Gemini décide s'il faut relancer ; l'interface ne montre la question suivante qu'au moment où l'action est réellement `next` ou `end`. 