

## Bug : nouvelle organisation = pas de projet seedé ni de bibliothèques accessibles

### Cause racine

À la création d'une organisation depuis SuperAdmin :
1. L'org est insérée **sans `owner_id`** (le futur admin n'existe pas encore).
2. Une invitation email est envoyée.
3. **Tant que l'admin invité n'a pas accepté l'invitation**, `owner_id` reste vide.

Le seed complet (projet « Candidature spontanée - TEST - », 6 modèles d'entretien, 10 critères) est déclenché par `trg_seed_on_owner_set`, qui ne s'exécute que **lorsque `owner_id` passe de NULL à une valeur**. Donc tant que personne n'a cliqué sur l'email d'invitation, l'org est vide côté projet et modèles, et **personne n'a accès** (l'admin invité n'a ni profil rattaché, ni rôle).

C'est pour ça que ta nouvelle org « TEST 3 » montre 0 projet, 0 modèle d'entretien et que tu ne vois rien dans les bibliothèques : tu regardes probablement depuis ton compte super-admin, qui n'est rattaché à **aucune** organisation, donc `get_user_organization_id()` te renvoie autre chose (ton org « UBIQ »).

### Vérification

État réel des 5 dernières orgs en base :

| Org | owner_id | Projets | Questions | Critères | Modèles d'entretien |
|---|---|---|---|---|---|
| TEST 3 (créée aujourd'hui) | **vide** | 0 | 50 | 10 | **0** |
| UBIQ | rempli | 1 | 50 | 10 | 6 |
| With Gardner | **vide** | 0 | 51 | 10 | **0** |
| ALBO INC | **vide** | 0 | 0 | 0 | 0 |

Confirmation : sans `owner_id` → pas de projet démo, pas de modèles d'entretien.

### Solution proposée

**Déclencher le seed complet dès la création de l'org**, sans attendre l'acceptation, en utilisant le super-admin appelant comme `_created_by` technique pour les seeds.

#### Changements

1. **Nouvelle migration SQL** : remplacer le trigger AFTER INSERT actuel (qui ne seed que les questions) par un trigger qui appelle aussi les 3 autres seeds (critères, modèles d'entretien, projet démo). Le `_created_by` utilisé sera `auth.uid()` (le super-admin qui crée l'org).

2. **Garde-fou idempotence** : `seed_demo_project` vérifie déjà l'existence avant insertion → rejouer ne crée pas de doublon. Idem pour les 3 autres seeds (filtrent par titre/label).

3. **Backfill optionnel** : un bloc `DO $$` qui parcourt les orgs existantes sans projet démo et sans modèles d'entretien et qui seed pour le compte du super-admin (premier user avec rôle `super_admin`). Cela rattrape « TEST 3 » et « With Gardner » qui sont actuellement bloquées.

4. **Ce qui reste inchangé** :
   - `accept_invitation` continue de seeder (idempotent, donc sans effet si déjà fait).
   - Le rôle admin de l'utilisateur invité est toujours assigné lors de l'acceptation (c'est un cas distinct, on n'y touche pas).
   - Aucun changement côté UI ni côté front.

### Conséquences attendues

- Toute nouvelle org créée depuis SuperAdmin aura immédiatement : 1 projet « Candidature spontanée - TEST - » avec ses 5 questions, 50 modèles de questions, 10 modèles de critères, 6 modèles d'entretien.
- Les orgs existantes vides (TEST 3, With Gardner) seront rattrapées par le backfill.
- L'admin invité, quand il acceptera, héritera d'une org déjà prête.

### Hors champ

- Le fait que l'admin invité n'apparaisse pas tant qu'il n'a pas accepté l'invitation n'est pas un bug et ne change pas. Si tu veux pouvoir « voir » le contenu d'une org en tant que super-admin sans en faire partie, c'est un autre sujet (RLS super-admin déjà partielle, à ouvrir séparément si besoin).
- Pas de changement sur le seed E2E ni sur la fonction `seed-e2e-user`.

### Fichier touché

- Une nouvelle migration SQL : remplacement du trigger `seed_default_question_templates_trigger` (ou ajout d'un nouveau trigger AFTER INSERT plus complet) + bloc de backfill pour les orgs existantes vides.

