

## Bug : bibliothèques vides pour `c+3@bap.fr`

### Cause racine

Ce compte **n'a jamais accepté son invitation** dans l'organisation « TEST 3 » :

- `profiles.organization_id` = `NULL` pour cet utilisateur
- `user_roles` = vide
- L'organisation « TEST 3 » existe (créée le 22/04 à 20:56) mais `owner_id = NULL`
- Une invitation `pending` est bien présente, valable jusqu'au 29/04

Conséquence : `get_user_organization_id(auth.uid())` renvoie `NULL`, donc toutes les requêtes des bibliothèques (questions, critères, intros, sessions types, emails) renvoient zéro ligne — RLS fonctionne normalement, c'est juste qu'il n'y a aucune org rattachée.

De plus, comme `owner_id` est encore `NULL` sur l'organisation, **le seed des bibliothèques par défaut n'a jamais été déclenché** (le trigger `trg_seed_on_owner_set` ne s'exécute qu'au moment où `owner_id` passe de NULL à une vraie valeur, ce qui se produit dans `accept_invitation` pour le premier accepté).

### Correctif (3 étapes via une migration SQL ponctuelle)

#### 1. Rattacher manuellement l'utilisateur à l'organisation « TEST 3 »

- `UPDATE profiles SET organization_id = '3c370947…' WHERE user_id = 'fec21331…'`
- `UPDATE organizations SET owner_id = 'fec21331…' WHERE id = '3c370947…' AND owner_id IS NULL`
- Marquer l'invitation comme `accepted` pour éviter qu'il essaie de l'utiliser à nouveau.

#### 2. Lui assigner le rôle `admin` sur cette org

- `INSERT INTO user_roles (user_id, role, organization_id) VALUES (…, 'admin', …) ON CONFLICT DO NOTHING`

#### 3. Déclencher le seed complet des bibliothèques

Appeler les 4 fonctions de seed pour cette org + ce créateur :
- `seed_default_question_templates`
- `seed_default_criteria_templates`
- `seed_default_interview_templates`
- `seed_demo_project`

Après ça, à sa prochaine actualisation, il verra les ~50 questions, 10 critères, 6 sessions types et le projet de démo « Candidature spontanée - TEST - ».

### À confirmer

L'invitation a été envoyée **il y a ~2 h**. Deux scénarios possibles :

1. **Il n'a jamais cliqué sur le lien d'invitation reçu par email** → le bon réflexe est qu'il clique dessus pour passer normalement par `accept_invitation` (qui fait tout ce qui est ci-dessus automatiquement). Aucune migration requise.
2. **Le lien ne fonctionne pas / il l'a perdu** → on applique le correctif manuel ci-dessus.

Quelle option ?

