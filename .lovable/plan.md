## Objectif

Permettre aux utilisateurs invités sur un projet via `projects.visible_to_user_ids` de créer un fil de discussion et d'envoyer des messages dans le copilot, sans déclencher d'erreur RLS.

## Changements prévus

1. **Mettre à jour les politiques RLS sur `copilot_threads`**
   - Utiliser `public.has_project_access(auth.uid(), copilot_threads.project_id)` pour vérifier l'accès au projet.
   - Conserver `created_by = auth.uid()` sur UPDATE/DELETE (seul le créateur modifie ou supprime son fil).
   - Conserver `created_by = auth.uid()` sur INSERT (le thread est créé au nom de l'utilisateur connecté).

2. **Mettre à jour les politiques RLS sur `copilot_messages`**
   - Remplacer la vérification `copilot_threads.created_by = auth.uid()` par `public.has_project_access(auth.uid(), t.project_id)`.
   - Permet à tout utilisateur ayant accès au projet de lire et d'envoyer des messages dans le fil.

3. **Vérifier le comportement**
   - Tester qu'un utilisateur présent dans `visible_to_user_ids` peut créer un thread et envoyer un message.
   - Vérifier qu'un utilisateur sans accès au projet reste bloqué.

## Détails techniques

Migration SQL : suppression/recréation des politiques concernées sur `copilot_threads` et `copilot_messages`, en s'appuyant sur la fonction `public.has_project_access(_user uuid, _project uuid)` déjà disponible.

Aucune modification du frontend ou de l'Edge Function `copilot-chat` n'est nécessaire.