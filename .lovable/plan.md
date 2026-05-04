## Cause du bug

Quand tu crées une organisation depuis le panneau super admin, l'edge function `superadmin-create-org` insère la ligne `organizations` **sans `owner_id`** (l'owner sera défini plus tard quand le 1er utilisateur acceptera l'invitation).

Or, le trigger `trg_seed_org_question_templates` qui s'exécute à l'INSERT contient un fallback :

```sql
_creator := COALESCE(NEW.owner_id, auth.uid());
IF _creator IS NULL THEN
  -- prend le 1er super_admin trouvé
  SELECT user_id INTO _creator FROM user_roles WHERE role='super_admin' ...
END IF;

...
IF NEW.owner_id IS NULL OR _creator = NEW.owner_id THEN
  PERFORM seed_demo_project(NEW.id, _creator);  -- ⚠️ created_by = TOI
END IF;
```

Résultat : le **projet "Candidature spontanée - TEST -"** est créé avec `created_by = ton user_id` de super admin. Comme la RLS de `projects` autorise la vue dès que `created_by = auth.uid()`, ce projet apparaît dans **ta** liste de projets, en plus d'être dans la nouvelle org.

Bonus : il y a aussi **deux triggers identiques** (`seed_question_templates_on_org_create` et `trg_seed_org_after_insert`) qui appellent la même fonction → doublon historique.

## Correctif (1 migration SQL)

1. **Supprimer le trigger doublon** `trg_seed_org_after_insert`.
2. **Modifier `trg_seed_org_question_templates`** :
   - Garder le seed des bibliothèques (questions, critères, modèles, intros) avec le fallback super admin — ces tables sont scopées par `organization_id`, pas de fuite.
   - **Ne plus créer le projet démo dans ce trigger.** Le projet démo doit uniquement être créé via `trg_seed_on_owner_set`, c'est-à-dire au moment où un véritable owner (le 1er utilisateur de l'org) est attaché. C'est déjà ce que dit le commentaire de l'edge function.
3. **Nettoyage des données existantes** : supprimer les projets démo `"Candidature spontanée - TEST -"` dont le `created_by` est un super admin **et** dont l'organisation appartient à quelqu'un d'autre (ou n'a pas encore d'owner). Aucune session candidat ne peut exister sur ces démos fraîchement créés, donc la suppression est sûre — mais je listerai d'abord les lignes concernées avant de les supprimer pour validation.

## Détail technique

```sql
-- 1. Supprimer doublon
DROP TRIGGER IF EXISTS trg_seed_org_after_insert ON public.organizations;

-- 2. Réécrire la fonction sans appel à seed_demo_project
CREATE OR REPLACE FUNCTION public.trg_seed_org_question_templates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE _creator uuid;
BEGIN
  _creator := COALESCE(NEW.owner_id, auth.uid());
  IF _creator IS NULL THEN
    SELECT user_id INTO _creator FROM public.user_roles
    WHERE role='super_admin'::app_role ORDER BY id LIMIT 1;
  END IF;

  IF _creator IS NOT NULL THEN
    PERFORM public.seed_default_question_templates(NEW.id, _creator);
    PERFORM public.seed_default_criteria_templates(NEW.id, _creator);
    PERFORM public.seed_default_interview_templates(NEW.id, _creator);
    PERFORM public.seed_default_intro_templates(NEW.id, _creator);
    -- Le projet de démo est désormais créé uniquement par trg_seed_on_owner_set
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Cleanup (après inspection)
DELETE FROM public.projects p
USING public.user_roles ur
WHERE p.title = 'Candidature spontanée - TEST -'
  AND p.created_by = ur.user_id
  AND ur.role = 'super_admin'
  AND NOT EXISTS (SELECT 1 FROM public.sessions s WHERE s.project_id = p.id);
```

Après ça : les nouvelles orgs créées sans owner ne pollueront plus ton compte, et le projet démo sera créé proprement, attribué au 1er utilisateur qui rejoint l'org.
