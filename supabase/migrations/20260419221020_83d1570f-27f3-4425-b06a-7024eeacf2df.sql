-- Table principale: modèles d'entretien
CREATE TABLE public.interview_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text,
  job_title text NOT NULL DEFAULT '',
  default_duration_minutes integer NOT NULL DEFAULT 30,
  default_language public.project_language NOT NULL DEFAULT 'fr',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view interview templates"
  ON public.interview_templates FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create interview templates"
  ON public.interview_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Org members can update interview templates"
  ON public.interview_templates FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete interview templates"
  ON public.interview_templates FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Questions du modèle
CREATE TABLE public.interview_template_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  content text NOT NULL,
  type text NOT NULL DEFAULT 'written',
  audio_url text,
  video_url text,
  category text,
  follow_up_enabled boolean NOT NULL DEFAULT true,
  max_follow_ups integer NOT NULL DEFAULT 2,
  relance_level text NOT NULL DEFAULT 'medium',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage template questions"
  ON public.interview_template_questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.interview_templates t
    WHERE t.id = interview_template_questions.template_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.interview_templates t
    WHERE t.id = interview_template_questions.template_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
  ));

-- Critères du modèle
CREATE TABLE public.interview_template_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  weight integer NOT NULL DEFAULT 10,
  scoring_scale public.scoring_scale_type NOT NULL DEFAULT '0-5',
  applies_to public.criteria_scope NOT NULL DEFAULT 'all_questions',
  anchors jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_template_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage template criteria"
  ON public.interview_template_criteria FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.interview_templates t
    WHERE t.id = interview_template_criteria.template_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.interview_templates t
    WHERE t.id = interview_template_criteria.template_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
  ));

CREATE INDEX idx_itq_template ON public.interview_template_questions(template_id, order_index);
CREATE INDEX idx_itc_template ON public.interview_template_criteria(template_id, order_index);
CREATE INDEX idx_it_org ON public.interview_templates(organization_id);

-- Fonction seed: 5 entretiens types par défaut
CREATE OR REPLACE FUNCTION public.seed_default_interview_templates(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tpl_id uuid;
  _seed RECORD;
  _q RECORD;
  _c RECORD;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  FOR _seed IN
    SELECT * FROM (VALUES
      ('Entretien Commercial', 'Modèle pour évaluer un profil commercial : motivation, expérience terrain, capacité à négocier.', 'Commercial', 'Commercial(e)', 30),
      ('Entretien Développeur', 'Modèle pour évaluer un développeur : parcours technique, projets, méthode de travail.', 'Tech', 'Développeur(se)', 40),
      ('Entretien Manager', 'Modèle pour évaluer un profil de manager : leadership, gestion d''équipe, vision.', 'Management', 'Manager', 35),
      ('Entretien Stage / Alternance', 'Modèle court pour étudiant : motivation, projet pro, soft skills.', 'RH', 'Stagiaire / Alternant(e)', 20),
      ('Entretien découverte générique', 'Modèle généraliste pour un premier échange découverte.', 'Général', '', 25)
    ) AS s(name, description, category, job_title, duration)
  LOOP
    -- Skip si déjà existant
    IF EXISTS (SELECT 1 FROM public.interview_templates WHERE organization_id = _org_id AND name = _seed.name) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.interview_templates (organization_id, created_by, name, description, category, job_title, default_duration_minutes, default_language)
    VALUES (_org_id, _created_by, _seed.name, _seed.description, _seed.category, _seed.job_title, _seed.duration, 'fr')
    RETURNING id INTO _tpl_id;

    -- Questions communes (présentation + parcours + motivation + conclusion)
    INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category)
    VALUES
      (_tpl_id, 0, 'Présentation', 'Pouvez-vous vous présenter en quelques minutes ? Dites-nous qui vous êtes et ce qui vous a amené jusqu''ici.', 'written', true, 2, 'medium', 'Expérience'),
      (_tpl_id, 1, 'Parcours', 'Parlez-nous de votre parcours professionnel et de vos expériences les plus marquantes.', 'written', true, 2, 'medium', 'Expérience'),
      (_tpl_id, 2, 'Motivation poste', 'Qu''est-ce qui vous attire dans ce poste en particulier ?', 'written', true, 2, 'deep', 'Motivation'),
      (_tpl_id, 3, 'Argument final', 'Pour conclure, pourquoi devrions-nous vous recruter plutôt qu''un autre candidat ?', 'written', true, 1, 'light', 'Motivation');

    -- Critères communs
    INSERT INTO public.interview_template_criteria (template_id, order_index, label, description, weight, scoring_scale, applies_to)
    VALUES
      (_tpl_id, 0, 'Clarté du discours', 'Capacité à structurer sa pensée et à s''exprimer clairement.', 10, '0-5', 'all_questions'),
      (_tpl_id, 1, 'Motivation & adhésion au poste', 'Démontre un intérêt sincère et documenté pour le poste.', 10, '0-5', 'all_questions'),
      (_tpl_id, 2, 'Cohérence du parcours', 'Les choix de carrière s''enchaînent de manière logique.', 10, '0-5', 'all_questions');
  END LOOP;
END;
$$;

-- Mettre à jour les triggers existants pour seeder aussi les modèles d'entretien
CREATE OR REPLACE FUNCTION public.trg_seed_on_owner_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (OLD.owner_id IS NULL OR OLD.owner_id <> NEW.owner_id) THEN
    PERFORM public.seed_default_question_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_default_criteria_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_default_interview_templates(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    PERFORM public.seed_default_question_templates(_org_id, _user_id);
    PERFORM public.seed_default_criteria_templates(_org_id, _user_id);
    PERFORM public.seed_default_interview_templates(_org_id, _user_id);
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, _assigned_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$$;