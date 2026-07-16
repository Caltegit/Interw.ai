Constat : le backend est sain, le droit d’exécution existe bien, mais l’appel `/rpc/admin_list_impacted_candidates` échoue en `statement timeout`. La cause probable est la fonction SQL actuelle : elle scanne environ 390k objets média dans le stockage et applique une regex/groupement global avant de filtrer les 76 sessions de la période. Donc ce n’est plus un problème de permission, c’est une requête trop lourde.

Plan de correction :

1. Optimiser la fonction de listing
   - Réécrire `admin_list_impacted_candidates()` pour partir d’abord des sessions candidates entre le 8 et le 16 juillet.
   - Pour chaque session candidate seulement, vérifier l’existence de fichiers média réels avec un `NOT EXISTS` ciblé sur le préfixe `interviews/<session_id>/`.
   - Éviter le scan global + regex sur tous les objets média.
   - Conserver la sécurité actuelle : fonction réservée aux super-admins via `has_role()`.

2. Ajouter les indexes nécessaires si manquants
   - Ajouter un index ciblé sur `session_messages(role, session_id)` pour accélérer la détection des réponses candidat.
   - Ajouter un index ciblé sur `sessions(created_at, is_demo)` pour accélérer la fenêtre du 8 au 16 juillet.
   - Réutiliser les indexes existants du stockage sur `(bucket_id, name)` pour les recherches par préfixe média.

3. Garder les permissions correctes
   - Reposer explicitement les droits d’exécution sur la fonction pour les utilisateurs authentifiés et le service backend.

4. Améliorer le message dans l’interface
   - Si le chargement échoue encore, afficher que c’est un timeout de listing, pas “aucun candidat”.
   - Garder le bouton refresh.

5. Vérifier après migration
   - Tester directement la fonction côté base.
   - Vérifier que l’API du dashboard retourne la liste sans timeout.
   - Confirmer ensuite le nombre réel de candidats affichés.