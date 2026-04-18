
-- 1. Add title column to question_templates
ALTER TABLE public.question_templates
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

-- 2. Seed function
CREATE OR REPLACE FUNCTION public.seed_default_question_templates(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.question_templates WHERE organization_id = _org_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.question_templates (organization_id, created_by, title, content, category, type, follow_up_enabled, max_follow_ups)
  VALUES
    (_org_id, _created_by, 'Présentez-vous', 'Parlez-moi de votre parcours professionnel et de ce qui vous a amené à postuler. C''est à vous !', 'Soft skills', 'written', true, 2),
    (_org_id, _created_by, 'Motivation entreprise', 'Pourquoi notre entreprise ? Qu''est-ce qui vous attire spécifiquement chez nous plutôt qu''ailleurs ?', 'Motivation', 'written', true, 2),
    (_org_id, _created_by, 'Qualités', 'Vos principales qualités ? Citez 2 à 3 qualités en lien avec le poste et illustrez avec un exemple concret.', 'Soft skills', 'written', true, 2),
    (_org_id, _created_by, 'Axe d''amélioration', 'Avez-vous des zones d''inconforts ? Quel est votre plus grand axe de progression et que faites-vous pour vous améliorer ?', 'Soft skills', 'written', true, 2),
    (_org_id, _created_by, 'Ambitions', 'Vos ambitions à 3 ans ? Où vous voyez-vous professionnellement dans 3 ans et comment ce poste s''y inscrit-il ?', 'Motivation', 'written', true, 2),
    (_org_id, _created_by, 'Défi pro', 'Une situation difficile ? Décrivez un défi professionnel, les actions que vous avez menées et le résultat obtenu. C''est à vous !', 'Situationnel', 'written', true, 2),
    (_org_id, _created_by, 'Ancien poste', 'Parlez-vous de votre ancien poste, quelles sont les raisons qui vous poussent à chercher un nouveau challenge aujourd''hui ?', 'Motivation', 'written', true, 2),
    (_org_id, _created_by, 'Salaire', 'Avez-vous des prétentions salariales ? Quelle fourchette de rémunération envisagez-vous pour ce poste ?', 'Culture fit', 'written', true, 2),
    (_org_id, _created_by, 'Questions pour nous', 'Avez-vous des questions ? Sur le poste, l''équipe ou la culture de l''entreprise ?', 'Culture fit', 'written', true, 2),
    (_org_id, _created_by, 'Style de Management', 'Quel est votre style de management ? Comment animez-vous une équipe et pouvez-vous me donner un exemple concret ?', 'Leadership', 'written', true, 2);
END;
$$;

-- 3. Trigger on organizations insert
CREATE OR REPLACE FUNCTION public.trg_seed_default_question_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator uuid;
BEGIN
  _creator := COALESCE(NEW.owner_id, auth.uid());
  IF _creator IS NOT NULL THEN
    PERFORM public.seed_default_question_templates(NEW.id, _creator);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_question_templates_trigger ON public.organizations;
CREATE TRIGGER seed_default_question_templates_trigger
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_default_question_templates();

-- 4. Update accept_invitation to seed when first owner is set
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Seed default templates if missing
    PERFORM public.seed_default_question_templates(_org_id, _user_id);
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, _assigned_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 5. Backfill existing organizations
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
BEGIN
  FOR _org IN
    SELECT o.id, o.owner_id
    FROM public.organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.question_templates qt WHERE qt.organization_id = o.id
    )
  LOOP
    _creator := _org.owner_id;
    IF _creator IS NULL THEN
      SELECT user_id INTO _creator
      FROM public.user_roles
      WHERE organization_id = _org.id AND role = 'admin'
      LIMIT 1;
    END IF;
    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_question_templates(_org.id, _creator);
    END IF;
  END LOOP;
END$$;
