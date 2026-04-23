

## Mise à jour du projet démo « Candidature spontanée - TEST »

### Ce qui change

Modifications appliquées à la fonction de seed `seed_demo_project` (utilisée à chaque création d'organisation) **et** rétroactivement à tous les projets démo existants en base.

**1. Pause autorisée par défaut**
`allow_pause` passe de `false` à `true`.

**2. Message d'intro mis à jour**
Nouveau texte :
> Bienvenue dans cette session de test. Voici le message de bienvenue que vous pouvez modifier. Suivrons 5 questions pour le candidat.

**3. Trois critères d'évaluation préremplis** (au lieu d'aucun aujourd'hui)
- Clarté du discours
- Motivation & adhésion au poste
- Adéquation culturelle

Chaque critère reprend la description et le scoring de la bibliothèque par défaut (`seed_default_criteria_templates`), avec un poids de 33-34 % et un scoring `0-5`, applicable à toutes les questions.

### Détails techniques

**Migration SQL** (un seul fichier) :

1. `CREATE OR REPLACE FUNCTION public.seed_demo_project(...)` — version mise à jour :
   - `allow_pause = true` dans l'`INSERT` du projet.
   - `intro_text` = nouveau message.
   - Après l'`INSERT` des questions, ajout d'un `INSERT INTO public.evaluation_criteria` avec les 3 critères (label, description, weight, scoring_scale, applies_to, order_index).

2. **Rétroactif** sur les projets existants nommés `'Candidature spontanée - TEST -'` :
   - `UPDATE projects SET allow_pause = true, intro_text = '<nouveau texte>'`.
   - Pour chaque projet démo existant qui n'a pas encore de critères : `INSERT INTO evaluation_criteria` les 3 critères. Idempotent via `WHERE NOT EXISTS`.

**Aucun changement front.** Les nouveaux projets démo créés via `accept_invitation` ou `trg_seed_org_question_templates` utiliseront automatiquement la nouvelle version de `seed_demo_project`.

### Hors champ

- Le titre du projet, les questions, l'avatar, la voix et la durée restent inchangés.
- Les projets démo déjà personnalisés par un recruteur (critères ajoutés ou message modifié) : le `UPDATE` écrase `allow_pause` et `intro_text`. Si vous voulez préserver les éventuelles personnalisations existantes, dites-le et on conditionne l'update aux valeurs par défaut d'origine.

