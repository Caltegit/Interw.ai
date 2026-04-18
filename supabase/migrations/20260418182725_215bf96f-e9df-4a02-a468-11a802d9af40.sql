-- 1. Modifier seed pour qu'il n'abandonne plus si déjà des templates (insère seulement les manquants par titre)
CREATE OR REPLACE FUNCTION public.seed_default_question_templates(_org_id uuid, _created_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.question_templates (organization_id, created_by, title, content, category, type, follow_up_enabled, max_follow_ups)
  SELECT _org_id, _created_by, t.title, t.content, t.category, 'written', true, 2
  FROM (VALUES
    ('Présentez-vous', 'Parlez-moi de votre parcours professionnel et de ce qui vous a amené à postuler. C''est à vous !', 'Soft skills'),
    ('Motivation entreprise', 'Pourquoi notre entreprise ? Qu''est-ce qui vous attire spécifiquement chez nous plutôt qu''ailleurs ?', 'Motivation'),
    ('Qualités', 'Vos principales qualités ? Citez 2 à 3 qualités en lien avec le poste et illustrez avec un exemple concret.', 'Soft skills'),
    ('Axe d''amélioration', 'Avez-vous des zones d''inconforts ? Quel est votre plus grand axe de progression et que faites-vous pour vous améliorer ?', 'Soft skills'),
    ('Ambitions', 'Vos ambitions à 3 ans ? Où vous voyez-vous professionnellement dans 3 ans et comment ce poste s''y inscrit-il ?', 'Motivation'),
    ('Défi pro', 'Une situation difficile ? Décrivez un défi professionnel, les actions que vous avez menées et le résultat obtenu. C''est à vous !', 'Situationnel'),
    ('Ancien poste', 'Parlez-nous de votre ancien poste, quelles sont les raisons qui vous poussent à chercher un nouveau challenge aujourd''hui ?', 'Motivation'),
    ('Salaire', 'Avez-vous des prétentions salariales ? Quelle fourchette de rémunération envisagez-vous pour ce poste ?', 'Culture fit'),
    ('Questions pour nous', 'Avez-vous des questions ? Sur le poste, l''équipe ou la culture de l''entreprise ?', 'Culture fit'),
    ('Style de Management', 'Quel est votre style de management ? Comment animez-vous une équipe et pouvez-vous me donner un exemple concret ?', 'Leadership')
  ) AS t(title, content, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.question_templates qt
    WHERE qt.organization_id = _org_id AND qt.title = t.title
  );
END;
$function$;

-- 2. Trigger sur organizations pour seeder à la création (utilise owner_id si présent, sinon premier admin via accept_invitation)
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
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS seed_question_templates_on_org_create ON public.organizations;
CREATE TRIGGER seed_question_templates_on_org_create
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_org_question_templates();

-- 3. Trigger UPDATE: quand owner_id passe de NULL à une valeur, seeder aussi
CREATE OR REPLACE FUNCTION public.trg_seed_on_owner_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (OLD.owner_id IS NULL OR OLD.owner_id <> NEW.owner_id) THEN
    PERFORM public.seed_default_question_templates(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS seed_question_templates_on_owner_set ON public.organizations;
CREATE TRIGGER seed_question_templates_on_owner_set
AFTER UPDATE OF owner_id ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_on_owner_set();

-- 4. Backfill: forcer les 10 par défaut sur toutes les orgs existantes
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations LOOP
    _creator := _org.owner_id;
    IF _creator IS NULL THEN
      SELECT user_id INTO _creator FROM public.user_roles
      WHERE organization_id = _org.id AND role = 'admin'
      LIMIT 1;
    END IF;
    IF _creator IS NULL THEN
      SELECT user_id INTO _creator FROM public.profiles
      WHERE organization_id = _org.id
      LIMIT 1;
    END IF;
    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_question_templates(_org.id, _creator);
    END IF;
  END LOOP;
END $$;