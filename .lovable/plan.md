## Objectif

Ajouter 10 questions de type "énigme" dans la bibliothèque de questions, présentes dans **toutes les organisations** (existantes + futures).

## Spécifications par énigme
- **Titre** : `Énigmes - {Nom de l'énigme}`
- **Catégorie** : `Énigmes` (nouvelle catégorie)
- **Contenu** : énoncé clair de l'énigme + invite à expliquer son raisonnement à voix haute
- **Timer (max_response_seconds)** : 180 (3 minutes)
- **Relance** : désactivée (`follow_up_enabled = false`, `max_follow_ups = 0`)
- **Type** : `written`

## Liste des 10 énigmes proposées

Mix logique / latéral / quantitatif (classiques d'entretien type cabinet conseil, FAANG) :

1. **Énigmes - Les 3 ampoules** — 3 interrupteurs au rez-de-chaussée, 3 ampoules à l'étage. Identifier en une seule montée.
2. **Énigmes - Les 9 billes** — Trouver la bille plus lourde parmi 9 en 2 pesées max.
3. **Énigmes - Les 2 cordes** — Mesurer 45 minutes avec 2 cordes brûlant en 1h chacune (combustion non uniforme).
4. **Énigmes - Le pont et la lampe** — 4 personnes, 1 lampe, traversée d'un pont en 17 min max.
5. **Énigmes - Les 100 prisonniers et le chapeau** — Stratégie collective pour maximiser les survivants.
6. **Énigmes - Pourquoi les plaques d'égout sont rondes ?** — Question de raisonnement ouvert.
7. **Énigmes - Combien de balles de tennis dans un bus ?** — Estimation Fermi.
8. **Énigmes - Les 2 seaux** — Mesurer exactement 4 L avec un seau de 3 L et un de 5 L.
9. **Énigmes - Le chameau et les bananes** — Transport optimal de 3000 bananes sur 1000 km.
10. **Énigmes - L'horloge cassée** — À quel moment précis aiguilles superposées entre midi et 13h ?

Chaque contenu se termine par : *"Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous."*

## Implémentation technique

### 1. Migration SQL
Mettre à jour la fonction `seed_default_question_templates(_org_id, _created_by)` (définie dans `supabase/migrations/20260419211115_…sql`) :
- Ajouter les 10 lignes énigmes au `VALUES`, en étendant le tuple pour inclure aussi `max_response_seconds`.
- Modifier l'`INSERT` pour mapper `max_response_seconds` (180 pour les énigmes, NULL pour les autres) tout en gardant `follow_up_enabled = false` et `max_follow_ups = 0`.

```text
VALUES
  (titre, contenu, catégorie, max_response_seconds)
  ('Introduction parcours', '...', 'Expérience', NULL),
  ...
  ('Énigmes - Les 3 ampoules', '...', 'Énigmes', 180),
  ...
```

Le `WHERE NOT EXISTS` existant (déduplication par `title + organization_id`) garantit qu'aucun doublon n'est créé si la fonction est rejouée.

### 2. Backfill toutes les organisations existantes
Dans la même migration, après la redéfinition de la fonction :

```sql
DO $$
DECLARE _org RECORD; _creator uuid;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations LOOP
    _creator := _org.owner_id;
    IF _creator IS NULL THEN
      SELECT user_id INTO _creator FROM public.user_roles
      WHERE organization_id = _org.id AND role = 'admin'::app_role
      ORDER BY id LIMIT 1;
    END IF;
    IF _creator IS NULL THEN
      SELECT user_id INTO _creator FROM public.user_roles
      WHERE role = 'super_admin'::app_role ORDER BY id LIMIT 1;
    END IF;
    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_question_templates(_org.id, _creator);
    END IF;
  END LOOP;
END $$;
```

Le `NOT EXISTS` dans la fonction empêche de toucher aux questions existantes — seules les 10 énigmes seront ajoutées aux orgs déjà créées.

### 3. Futures organisations
Aucun changement nécessaire : le trigger `trg_seed_org_question_templates` appelle déjà `seed_default_question_templates` à chaque création d'organisation, qui inclura désormais les énigmes.

## Fichiers touchés
- **Créé** : nouvelle migration `supabase/migrations/<timestamp>_add_enigma_question_templates.sql`

## Hors périmètre
- Pas de changement UI (les énigmes apparaîtront automatiquement dans `QuestionLibraryDialog` et dans la page "Bibliothèque > Questions").
- Pas de catégorie figée côté code : la catégorie est un simple `text` libre, donc "Énigmes" sera proposée dynamiquement via le filtre de catégorie existant.
