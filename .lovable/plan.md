

## Plan : Remplacer les 10 questions types par 50 nouvelles

### Objectif
Mettre à jour la fonction `seed_default_question_templates` pour insérer les 50 nouvelles questions (au lieu des 10 actuelles), et reseed les organisations existantes.

### Changements

**1. Migration SQL** :
- Remplacer le corps de `seed_default_question_templates(_org_id, _created_by)` avec les 50 nouvelles questions (titre, contenu, catégorie). Toutes en `type='written'`, `follow_up_enabled=false` (Relance IA = Non par défaut, contrairement à l'ancienne version qui était `true`), `max_follow_ups=0`.
- Garder le `WHERE NOT EXISTS` sur `(organization_id, title)` pour idempotence.

**2. Reseed des orgs existantes** :
- Pour chaque organisation existante : supprimer les 10 anciennes questions seed (matchées par leurs titres exacts d'origine : `Présentez-vous`, `Motivation entreprise`, `Qualités`, `Axe d'amélioration`, `Ambitions`, `Défi pro`, `Ancien poste`, `Salaire`, `Questions pour nous`, `Style de Management`) UNIQUEMENT si elles n'ont pas été modifiées (on supprime par titre, simple).
- Puis appeler `seed_default_question_templates` pour chaque org existante avec son `owner_id` (ou `created_by` du premier template existant si owner_id null).

⚠️ Risque : si un utilisateur a personnalisé une des 10 questions par défaut, la suppression la perdra. Sécurité : on supprime uniquement les rows dont `title` ET `content` correspondent EXACTEMENT à l'original (non modifié).

### Fichier(s)
- Nouvelle migration SQL (création via outil migration).

### Test
1. Vérifier `select count(*) from question_templates where organization_id = '<org>'` après migration.
2. Aller dans Bibliothèque de questions → voir les 50 nouvelles avec les bonnes catégories et Relance IA OFF.
3. Vérifier qu'une question personnalisée existante n'a pas été écrasée.

