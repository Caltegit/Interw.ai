
-- 1. Function to seed default criteria templates
CREATE OR REPLACE FUNCTION public.seed_default_criteria_templates(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.criteria_templates (organization_id, created_by, label, description, weight, scoring_scale, applies_to, category)
  SELECT _org_id, _created_by, t.label, t.description, 10, '0-5'::scoring_scale_type, 'all_questions'::criteria_scope, NULL
  FROM (VALUES
    ('Clarté du discours', 'Capacité à structurer sa pensée et à s''exprimer de façon claire, concise et compréhensible. Le candidat va à l''essentiel sans se perdre dans les détails inutiles.'),
    ('Cohérence du parcours', 'Les choix de carrière s''enchaînent de manière logique et le candidat est capable de les expliquer et de les assumer, même si le parcours est atypique.'),
    ('Motivation & adhésion au poste', 'Le candidat démontre un intérêt sincère et documenté pour le poste et l''entreprise, au-delà des formules convenues.'),
    ('Compétences métier', 'Niveau de maîtrise technique ou fonctionnelle des compétences attendues pour le poste, évaluée à travers des exemples concrets tirés de son expérience.'),
    ('Soft skills & intelligence relationnelle', 'Qualités humaines observées pendant l''entretien : écoute, empathie, aisance relationnelle, capacité à collaborer et à gérer les relations professionnelles.'),
    ('Prise de recul & maturité', 'Capacité à analyser ses propres expériences avec objectivité, à reconnaître ses erreurs et à en tirer des enseignements. Indice de maturité professionnelle.'),
    ('Orientation résultats', 'Le candidat parle en termes d''impact, de résultats mesurables et de valeur créée, plutôt que de simples tâches effectuées.'),
    ('Adaptabilité & gestion du changement', 'Aptitude à évoluer dans un environnement incertain ou en transformation, à changer de méthode si nécessaire et à rester performant malgré les imprévus.'),
    ('Ambition & projection', 'Le candidat a une vision claire de son évolution et des ambitions réalistes et cohérentes avec le poste proposé.'),
    ('Adéquation culturelle', 'Alignement perçu entre les valeurs, le mode de fonctionnement et la personnalité du candidat avec la culture de l''entreprise et l''esprit de l''équipe.')
  ) AS t(label, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.criteria_templates ct
    WHERE ct.organization_id = _org_id AND ct.label = t.label
  );
END;
$function$;

-- 2. Update existing trigger functions to also seed criteria
CREATE OR REPLACE FUNCTION public.trg_seed_org_question_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _creator uuid;
BEGIN
  _creator := COALESCE(NEW.owner_id, auth.uid());
  IF _creator IS NOT NULL THEN
    PERFORM public.seed_default_question_templates(NEW.id, _creator);
    PERFORM public.seed_default_criteria_templates(NEW.id, _creator);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_seed_on_owner_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (OLD.owner_id IS NULL OR OLD.owner_id <> NEW.owner_id) THEN
    PERFORM public.seed_default_question_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_default_criteria_templates(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Update accept_invitation to also seed criteria for first member
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
  _current_owner uuid;
  _assigned_role app_role;
BEGIN
  SELECT id, organization_id INTO _invitation_id, _org_id
  FROM public.organization_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;

  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _assigned_role := 'admin'::app_role;
    PERFORM public.seed_default_question_templates(_org_id, _user_id);
    PERFORM public.seed_default_criteria_templates(_org_id, _user_id);
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, _assigned_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- 4. Reseed all existing organizations
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations LOOP
    _creator := _org.owner_id;
    IF _creator IS NULL THEN
      SELECT created_by INTO _creator FROM public.criteria_templates WHERE organization_id = _org.id LIMIT 1;
    END IF;
    IF _creator IS NULL THEN
      SELECT created_by INTO _creator FROM public.question_templates WHERE organization_id = _org.id LIMIT 1;
    END IF;
    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_criteria_templates(_org.id, _creator);
    END IF;
  END LOOP;
END $$;
