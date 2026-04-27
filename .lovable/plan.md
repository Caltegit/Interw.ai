## Problème

Sur la dernière question, après que le candidat ait terminé sa réponse, l'IA prononce parfois « Regardez la question suivante » ou « Écoutez la question suivante » au lieu d'un vrai remerciement de fin.

### Cause

Dans `supabase/functions/ai-conversation-turn/index.ts` :
- Le prompt indique à l'IA que c'est la dernière question et qu'elle doit générer un remerciement.
- Mais le modèle se trompe parfois et génère quand même une phrase de transition (« Écoutez/Regardez la question suivante »).
- Le code force ensuite `action = "end"` (ligne 152-156) **mais conserve le `message` original** de l'IA — donc le mauvais texte passe au front.

Dans `src/pages/InterviewStart.tsx` (ligne 1903-1924) :
- La branche END utilise directement `aiMessage` reçu, sans le valider.
- Le fallback « Merci pour vos réponses… » n'est utilisé que si `aiMessage` est vide.

## Solution

Forcer côté serveur **et** côté client un message de clôture propre quand on est sur la dernière question, indépendamment de ce que l'IA a généré.

### 1. Edge function — `supabase/functions/ai-conversation-turn/index.ts`

Quand `action === "end"` (forcé ou non), remplacer le `message` par un texte de clôture déterministe :

- Si le `message` généré par l'IA contient des marqueurs de transition (« question suivante », « écoutez », « regardez », « passons à »), le rejeter.
- Construire un message de clôture par défaut : « Merci pour vos réponses, la session est terminée. À bientôt. »
- Optionnel : permettre au prompt projet de fournir un texte de clôture personnalisé via `projectContext.aiClosingMessage`. Si présent, l'utiliser tel quel.

### 2. Frontend — `src/pages/InterviewStart.tsx` (branche END, ligne 1903-1924)

- Ajouter une garde : si `aiMessage` contient « question suivante », « écoutez », « regardez », ou est vide → utiliser le fallback « Merci pour vos réponses, la session est terminée. À bientôt. »
- Garder l'overlay « Finalisation de la session… » pendant le TTS (déjà en place).

## Détails techniques

**Fichiers modifiés :**
- `supabase/functions/ai-conversation-turn/index.ts` : sanitiser `parsed.message` quand `parsed.action === "end"`.
- `src/pages/InterviewStart.tsx` : valider `aiMessage` à la ligne 1905 avant de l'utiliser.

**Texte de clôture par défaut :** « Merci pour cette session, à bientôt. » (cohérent avec le souhait utilisateur).

## Hors périmètre

- Pas de modification du `completion_message` (écran final post-redirection, déjà OK).
- Pas de changement de la logique de relance (`follow_up`) ni de la branche `next`.
- Pas de nouveau champ en base — le message de clôture TTS reste un constant côté code (peut être rendu configurable plus tard si besoin).
