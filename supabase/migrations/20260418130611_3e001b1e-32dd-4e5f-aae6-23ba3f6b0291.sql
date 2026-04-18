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
    (_org_id, _created_by, 'Ancien poste', 'Parlez-nous de votre ancien poste, quelles sont les raisons qui vous poussent à chercher un nouveau challenge aujourd''hui ?', 'Motivation', 'written', true, 2),
    (_org_id, _created_by, 'Salaire', 'Avez-vous des prétentions salariales ? Quelle fourchette de rémunération envisagez-vous pour ce poste ?', 'Culture fit', 'written', true, 2),
    (_org_id, _created_by, 'Questions pour nous', 'Avez-vous des questions ? Sur le poste, l''équipe ou la culture de l''entreprise ?', 'Culture fit', 'written', true, 2),
    (_org_id, _created_by, 'Style de Management', 'Quel est votre style de management ? Comment animez-vous une équipe et pouvez-vous me donner un exemple concret ?', 'Leadership', 'written', true, 2);
END;
$function$;