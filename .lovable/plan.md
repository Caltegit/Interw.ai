## Bug identifié

Aujourd'hui, la décision « relance » vs « question suivante » est prise par l'IA dans l'edge function `ai-conversation-turn`. Le serveur empêche bien les **excès** de relance, mais ne force **jamais** une relance même quand le paramétrage de la question l'exige (`follow_up_enabled = true` et `relances_posées < max_follow_ups`).

Conséquence : sur une question configurée pour 2 relances, l'IA peut décider « la réponse est claire » et passer directement à la question suivante — ce qui contredit l'intention du recruteur.

## Correctif

### 1. Edge function `supabase/functions/ai-conversation-turn/index.ts`

Ajouter une règle déterministe **avant** l'appel IA :

- Si `relanceLevel !== "light"` ET `follow_up_enabled !== false` ET `followUpsAsked < maxFollowUps` ET pas d'override réseau désactivant les relances → on **force** `action = "follow_up"`. L'IA n'est appelée que pour générer le **texte** de la relance (question courte qui creuse la réponse), pas pour décider de l'action.
- Si toutes les relances configurées sont consommées → `action = "next"` (ou `"end"` si dernière question), comme aujourd'hui.
- Conserver le garde-fou actuel : si l'IA renvoyait quand même `next` alors que `canFollowUp` est vrai et qu'on est en mode forcé, on remplace par `follow_up`.

Renforcer aussi le prompt système pour refléter cette règle (la relance est obligatoire tant qu'on n'a pas atteint `max_follow_ups`).

### 2. Client `src/pages/InterviewStart.tsx`

- Envoyer explicitement `followUpEnabled` (champ `follow_up_enabled` de la question) dans `projectContext.questions[]` (actuellement non transmis ; le serveur suppose `true`).
- Garde-fou client miroir : à la réception de la réponse IA, si `action === "next"` alors que la question courante a encore des relances disponibles et `follow_up_enabled = true`, on ne bascule pas et on rappelle la fonction edge avec un flag `forceFollowUp = true` pour récupérer un texte de relance — évite tout risque de désynchronisation si l'edge function tombe en erreur.
- Vérifier que pendant la branche `follow_up` (lignes ~1868-1928) on **n'écrit jamais** `setCurrentQuestionIndex` ni de message portant `mediaType`/`mediaUrl` de la question suivante. C'est déjà le cas, on ajoute juste un commentaire défensif.

### 3. Cas particuliers respectés

- `relanceLevel === "light"` → aucune relance (inchangé).
- Question Énigmes (catégorie ajoutée précédemment) avec `follow_up_enabled = false` et `max_follow_ups = 0` → pas de relance forcée (inchangé).
- Override réseau (`forceMaxFollowUps = 0`) → désactive les relances même si configurées (inchangé, message déjà affiché au candidat).
- Dernière question : si encore des relances dispo → on relance ; sinon → `end`.

## Fichiers modifiés

- `supabase/functions/ai-conversation-turn/index.ts` — règle déterministe + prompt durci.
- `src/pages/InterviewStart.tsx` — transmission de `follow_up_enabled` + garde-fou client.

## Validation

- Cas A : question avec `max_follow_ups = 2`, réponse longue et claire → 2 relances posées avant passage à la suivante.
- Cas B : question avec `max_follow_ups = 0` ou `follow_up_enabled = false` → pas de relance, transition directe.
- Cas C : `relanceLevel = "light"` → pas de relance.
- Cas D : réseau dégradé (`forceMaxFollowUps = 0`) → pas de relance, message « Session simplifiée » affiché.
