## Diagnostic

J'ai testé `report-interview-issue` directement avec une vraie session : la fonction répond **200** et crée bien le fil de feedback pour le super admin. Donc côté serveur la logique marche.

Le « non-2xx » que tu as vu dans le toast est donc soit transitoire, soit lié à un cas que je n'arrive pas à reproduire (par exemple : session déjà supprimée, ou un transient réseau côté edge). Et surtout : on n'a **aucun détail** dans le toast ni dans les logs serveur pour diagnostiquer. C'est ça qu'on va corriger.

## Plan

### 1) Texte de la pop-up — corriger la promesse erronée
Aujourd'hui : « le recruteur sera prévenu par email ».
Comme la fonction n'envoie pas d'email (et qu'on ne veut pas en envoyer), on remplace par un texte aligné sur le vrai comportement :
> « Votre entretien est mis en pause. Décrivez ce qui ne va pas, notre équipe sera prévenue. »

Fichier : `src/pages/InterviewStart.tsx` (modification du `DialogDescription` du dialog « Signaler un problème »).

### 2) Edge function — logs et messages d'erreur explicites
Dans `supabase/functions/report-interview-issue/index.ts` :
- Ajouter des `console.log`/`console.error` étiquetés à chaque étape (`[report-issue] session lookup`, `[report-issue] superadmin lookup`, `[report-issue] thread insert`, `[report-issue] message insert`) pour qu'on voie dans les logs ce qui a raté la prochaine fois.
- Renvoyer un champ `error` explicite et stable dans chaque branche (404 session, 500 super admin manquant, 500 insert KO).
- Garder le comportement métier identique : **uniquement** création d'un thread `feedback_threads` + un `feedback_messages` pour le super admin. Aucun email.

### 3) Côté client — afficher la vraie cause dans le toast
Dans `InterviewStart.tsx` (bloc `catch` du dialog) :
- Quand `supabase.functions.invoke` renvoie une erreur, lire `error.context.text()` pour récupérer le JSON `{ error: "..." }` retourné par la fonction et afficher ce message dans le toast au lieu du générique « Edge Function returned a non-2xx status code ».
- Loguer aussi en `console.error` côté navigateur pour faciliter le debug.

## Fichiers touchés

- `supabase/functions/report-interview-issue/index.ts` (logs + messages d'erreur)
- `src/pages/InterviewStart.tsx` (texte du dialog + toast d'erreur enrichi)

Aucune table DB modifiée, aucun template email touché, aucun email envoyé.
