## Diagnostic

- La fonction edge `candidate-self-delete` est correcte (`verify_jwt = false`, supprime storage + `session_messages` + `transcripts` + `reports` + `sessions`, log dans `data_purge_log`).
- Test direct avec votre token : succès, la session `553dea72-…` (c@bap.fr) vient d'être supprimée.
- Aucun log d'invocation pour le clic précédent ⇒ la requête n'a jamais quitté le navigateur, ou a été rejetée avant la fonction.

Causes probables côté client (`src/pages/InterviewPrivacy.tsx`) :
1. La gestion d'erreur affiche `e.message` mais `supabase.functions.invoke` retourne souvent un objet `FunctionsHttpError` dont `.message` est générique (« Edge Function returned a non-2xx status code »). Le candidat n'a donc aucune information utile, et un échec silencieux (extension navigateur, blocage CORS, version publiée obsolète) passe inaperçu.
2. Aucun `console.error` ni reporting → impossible de tracer.
3. Pas de vérification du retour `data?.success` : si la fonction renvoie `200 { error: "…" }` (cas d'erreur métier), le code passe en succès et masque l'échec.

## Correctifs proposés

### 1. `src/pages/InterviewPrivacy.tsx` — handleDelete robuste
- Lire le vrai message d'erreur via `error.context?.text()` (comme déjà fait dans `CreateUserInOrgDialog`) avant de tomber sur le message générique.
- Vérifier `data?.success === true` et sinon afficher `data?.error`.
- Ajouter `console.error("[candidate-self-delete] failed", …)` pour laisser une trace exploitable.
- Sur succès, recharger silencieusement l'état (`setProject(null)`) pour qu'un re-clic n'envoie pas une 2e requête sur une session déjà disparue.

### 2. `supabase/functions/candidate-self-delete/index.ts` — idempotence + diagnostic
- Toujours répondre `200 { success: true, alreadyDeleted: true }` quand la session n'existe plus (au lieu de `404`), pour qu'un double-clic ou un retry navigateur ne génère pas une fausse erreur côté candidat.
- Logger systématiquement l'IP/`user-agent` (header) en début de requête pour faciliter le debug futur.

### 3. Vérification de déploiement
- Redeployer `candidate-self-delete` après la modif.
- Confirmer via `curl` que la production renvoie bien la nouvelle version.

## Hors périmètre

- Pas de migration BDD.
- Pas de changement de RLS (le service role bypass déjà tout).
- Pas de modification du flow d'email (le lien dans l'email est déjà correct).
