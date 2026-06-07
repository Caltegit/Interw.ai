# Plan — Brancher le seed étoilé sur la création d'organisation

## Diagnostic
Le seed étoilé `seed_starred_templates_into_org` existe et fonctionne, mais il est uniquement branché sur le trigger **`trg_seed_on_owner_set`** (déclenché sur `UPDATE OF owner_id`).

Or l'edge function `superadmin-create-org` insère l'organisation avec `owner_id` déjà renseigné. C'est donc le trigger **`trg_seed_org_question_templates`** (`AFTER INSERT`) qui s'exécute — et celui-ci appelle `seed_demo_project` (qui crée le projet "Candidature spontanée - TEST -") et **n'appelle pas** `seed_starred_templates_into_org`.

Conséquence observée sur "Test 31" : un seul projet, le démo hardcodé, et aucun clone des sessions étoilées.

## Changement (migration unique)

Modifier la fonction `public.trg_seed_org_question_templates` :
- Remplacer l'appel `PERFORM public.seed_demo_project(NEW.id, _creator);` par `PERFORM public.seed_starred_templates_into_org(NEW.id, _creator);`
- Conserver le reste (seed des bibliothèques par défaut question/criteria/intros/sessions types).

Symétriquement, dans `public.trg_seed_on_owner_set` (cas legacy où l'orga est créée sans owner puis owner ajouté ensuite), garder déjà l'appel `seed_starred_templates_into_org` qui est en place — rien à modifier.

`seed_demo_project` reste défini dans la base (non supprimée) au cas où un script externe l'utiliserait, mais n'est plus jamais appelé automatiquement.

## Hors-scope
- Aucune modification frontend.
- Aucune modification des organisations existantes (le clonage reste limité à la création).
- Aucune suppression de `seed_demo_project` ni de `clone_template_project_into_org`.

## Test après application
1. Étoiler 1+ session type dans Ressources › Sessions.
2. Créer une nouvelle organisation via le super-admin.
3. Vérifier que la nouvelle orga contient les projets clonés (un par template étoilé) au statut actif, et **pas** "Candidature spontanée - TEST -".
