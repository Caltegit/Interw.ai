## Objectif

Faire en sorte que le projet `3519629b-8906-477f-91e7-fc6f12ffa0d2` (« Votre premier entretien en digital ! ») soit automatiquement présent — et indépendamment modifiable — dans chaque organisation existante et dans toutes celles à venir.

Chaque organisation reçoit sa propre copie : nouvelle ligne `projects` + copies indépendantes de toutes les `questions` et `evaluation_criteria`. Aucune référence vers la source : modifier ou supprimer la copie n'affecte ni l'original ni les autres organisations.

## Ce qui change

### 1. Nouvelle fonction SQL `clone_template_project_into_org(_org_id, _created_by)`

Remplace `seed_demo_project`. Elle :
- Vérifie qu'aucun projet avec ce `slug`/titre exact n'existe déjà dans l'organisation (idempotente : ré-exécutable sans créer de doublons).
- Insère une nouvelle ligne dans `projects` en copiant tous les champs métier du projet source, sauf :
  - `id` (généré), `organization_id` (= org cible), `created_by` (= owner de l'org), `created_at` (= now), `slug` (nouveau slug unique), `expires_at` (= NULL), `report_recipient_user_ids` / `visible_to_user_ids` (= NULL pour repartir propre).
- Copie toutes les `questions` du projet source vers le nouveau projet (avec nouveaux `id`, `project_id` remappé, `created_at` réinitialisé). Les éventuels `scoring_criteria_ids` sont remappés vers les nouveaux IDs de critères.
- Copie toutes les `evaluation_criteria` (nouveaux `id`, `project_id` remappé) — fait avant les questions pour pouvoir remapper les références.

### 2. Trigger sur création d'organisation

Le trigger existant `trg_seed_on_owner_set` (qui s'exécute déjà quand `owner_id` est défini sur une organisation) appellera la nouvelle fonction `clone_template_project_into_org` à la place de `seed_demo_project`. Tout le flux existant `superadmin-create-org` continuera donc de fonctionner sans modification de code applicatif.

### 3. Backfill des organisations existantes

Exécuter une fois, dans la même migration :

```sql
SELECT public.clone_template_project_into_org(o.id, o.owner_id)
FROM organizations o
WHERE o.owner_id IS NOT NULL;
```

Grâce au check d'idempotence, les organisations qui auraient déjà une copie ne sont pas dupliquées.

### 4. Ancienne fonction `seed_demo_project`

Conservée mais plus appelée (au cas où il faudrait y revenir). Elle pourra être supprimée plus tard si tout est OK.

## Détails techniques

- L'ID du projet source est codé en dur dans la fonction : `3519629b-8906-477f-91e7-fc6f12ffa0d2`. Si ce projet est un jour supprimé, la fonction ne fait rien (early return) — pas d'erreur bloquante sur la création d'organisation.
- `slug` final dans chaque org : `votre-premier-entretien-en-digital-<8 chars md5>` pour garantir l'unicité globale.
- Aucune session ni rapport n'est copié : seules les définitions (projet + questions + critères).
- Fonction `SECURITY DEFINER` + `search_path = public`, comme les autres seeds.
- Aucun changement frontend nécessaire.

## Vérification après déploiement

1. Vérifier qu'une copie existe dans chaque organisation :
   ```sql
   SELECT o.name, p.id FROM organizations o
   LEFT JOIN projects p ON p.organization_id = o.id AND p.title = 'Votre premier entretien en digital !'
   ORDER BY o.created_at;
   ```
2. Créer une organisation de test via le superadmin et confirmer que le projet est présent avec ses 15 questions et 4 critères, et qu'il est librement modifiable.
