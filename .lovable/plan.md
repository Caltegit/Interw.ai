

## Plan: 10 questions par défaut auto-créées pour chaque organisation

### Objectif
À la création d'une nouvelle organisation, insérer automatiquement 10 `question_templates` de base dans sa bibliothèque, avec format **Titre - Question**.

### Approche technique

**1. Migration DB** — créer un trigger sur `organizations`
- Fonction `seed_default_question_templates(_org_id uuid, _created_by uuid)` (SECURITY DEFINER) qui insère les 10 questions.
- Trigger `AFTER INSERT ON organizations` qui appelle cette fonction avec `NEW.id` et `COALESCE(NEW.owner_id, auth.uid())`.
- Edge case : si `owner_id` est NULL au moment de l'insert (cas de l'invitation où owner est défini après via `accept_invitation`), on utilise `auth.uid()`. Si les deux sont NULL (insert via service role), on skip le seed et on délègue à `accept_invitation`.

**2. Mise à jour de `accept_invitation`**
- Quand l'invité devient le premier owner (cas `_current_owner IS NULL`), vérifier si l'org a déjà des templates. Si non → seed des 10 questions avec `_user_id` comme `created_by`.

**3. Backfill organisations existantes**
- Pour chaque org existante qui n'a aucun `question_template`, insérer les 10 questions avec `created_by = owner_id` (ou un fallback si owner null).

### Format des 10 questions
Stockées avec :
- `content` = `"Titre - Question complète"` (ex: `"Présentez-vous - Parlez-moi de votre parcours..."`)
- `type` = `'written'`
- `category` = mapping logique (Motivation, Soft skills, Situationnel, Culture fit, Leadership) — voir tableau ci-dessous
- `follow_up_enabled` = `true`, `max_follow_ups` = `2`

| # | Titre | Catégorie |
|---|-------|-----------|
| 1 | Présentez-vous | Soft skills |
| 2 | Motivation entreprise | Motivation |
| 3 | Qualités | Soft skills |
| 4 | Axe d'amélioration | Soft skills |
| 5 | Ambitions | Motivation |
| 6 | Défi pro | Situationnel |
| 7 | Ancien poste | Motivation |
| 8 | Salaire | Culture fit |
| 9 | Questions pour nous | Culture fit |
| 10 | Style de Management | Leadership |

### Question rapide

**Format de stockage du `content`** :
- **A.** Une seule chaîne `"Titre - Question"` (simple, pas de changement de schéma)
- **B.** Ajouter une colonne `title text` à `question_templates` et stocker titre + question séparément (plus propre, permet d'afficher le titre en gras dans l'UI plus tard)

Je recommande **B** — c'est 5 min de plus, ça évite un parsing fragile par tiret, et ça ouvre la porte à un meilleur affichage. Mais si tu veux aller au plus simple, **A** marche aussi.

