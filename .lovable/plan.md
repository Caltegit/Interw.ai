

## Plan : Seed automatique des 10 critères de base

### Objectif
Comme pour les questions, créer une fonction SQL `seed_default_criteria_templates(_org_id, _created_by)` qui insère 10 critères par défaut dans `criteria_templates` lors de la création d'une organisation, et reseed les orgs existantes.

### Migration SQL

**1. Créer la fonction `seed_default_criteria_templates`** :
- Insère les 10 critères (label + description) dans `criteria_templates`.
- Valeurs par défaut : `weight=10`, `scoring_scale='0-5'`, `applies_to='all_questions'`, `category=NULL`.
- Idempotent : `WHERE NOT EXISTS` sur `(organization_id, label)`.

**2. Modifier les triggers existants** :
- `trg_seed_org_question_templates` et `trg_seed_on_owner_set` appellent déjà `seed_default_question_templates`. Les étendre pour appeler aussi `seed_default_criteria_templates`.
- Idem dans `accept_invitation` (premier membre = owner).

**3. Reseed des orgs existantes** :
- Boucler sur toutes les organizations et appeler `seed_default_criteria_templates` (idempotent grâce au `NOT EXISTS`).

### Test
1. La bibliothèque de critères affiche les 10 nouveaux critères.
2. Créer une nouvelle org → critères auto-créés.

