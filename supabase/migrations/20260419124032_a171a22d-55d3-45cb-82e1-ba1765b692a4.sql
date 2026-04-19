-- Replace seed_default_question_templates with 50 new questions
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
  SELECT _org_id, _created_by, t.title, t.content, t.category, 'written', false, 0
  FROM (VALUES
    ('Introduction parcours', 'Pouvez-vous vous présenter en quelques minutes ? Dites-nous qui vous êtes, d''où vous venez professionnellement, et ce qui vous a amené jusqu''ici. Je vous écoute.', 'Parcours & Expérience'),
    ('Résumé CV', 'Si vous deviez résumer votre parcours en trois mots ou trois étapes clés, quels seraient-ils et pourquoi ? À vous.', 'Parcours & Expérience'),
    ('Dernier poste', 'Parlez-moi de votre dernier poste : vos responsabilités, vos missions du quotidien, et ce que vous y avez accompli concrètement. Je vous laisse la parole.', 'Parcours & Expérience'),
    ('Réalisation marquante', 'Quelle est la réalisation professionnelle dont vous êtes le plus fier ou la plus fière ? Décrivez-la-nous dans le détail. À vous de jouer.', 'Parcours & Expérience'),
    ('Raison de départ', 'Qu''est-ce qui vous a amené à quitter — ou à envisager de quitter — votre poste actuel ou précédent ? Expliquez-nous votre démarche.', 'Parcours & Expérience'),
    ('Évolution de carrière', 'Comment décririez-vous l''évolution de votre carrière jusqu''à aujourd''hui ? Était-elle planifiée ou plutôt le fruit des opportunités ? Dites-nous.', 'Parcours & Expérience'),
    ('Expérience de management', 'Avez-vous déjà managé une équipe ? Si oui, décrivez-nous cette expérience : la taille de l''équipe, votre style de management, et les défis que vous avez rencontrés. Je vous écoute.', 'Parcours & Expérience'),
    ('Situation de crise', 'Racontez-nous une situation difficile ou une crise que vous avez dû gérer dans votre carrière. Comment l''avez-vous abordée ? À vous.', 'Parcours & Expérience'),
    ('Erreur professionnelle', 'Parlez-nous d''une erreur que vous avez commise dans votre travail et ce que vous en avez appris. Soyez honnête, c''est ce qui nous intéresse. Je vous laisse.', 'Parcours & Expérience'),
    ('Contexte international', 'Avez-vous une expérience à l''international ou dans un environnement multiculturel ? Décrivez-nous cela. À vous.', 'Parcours & Expérience'),
    ('Motivation poste', 'Qu''est-ce qui vous attire dans ce poste en particulier ? Soyez précis, au-delà de la fiche de poste. Je vous écoute.', 'Motivation & Projet'),
    ('Connaissance entreprise', 'Que savez-vous de notre entreprise, de nos activités et de notre positionnement sur le marché ? Dites-nous ce que vous avez retenu. À vous.', 'Motivation & Projet'),
    ('Choix du secteur', 'Pourquoi ce secteur d''activité vous attire-t-il ? Qu''est-ce qui vous y a conduit ou vous y retient ? Je vous laisse la parole.', 'Motivation & Projet'),
    ('Projet professionnel', 'Où vous voyez-vous dans cinq ans ? Quel est votre projet professionnel à moyen terme ? À vous de nous exposer votre vision.', 'Motivation & Projet'),
    ('Ambitions long terme', 'Quelles sont vos ambitions à long terme, au-delà de ce poste ? Comment ce rôle s''inscrit-il dans votre trajectoire ? Je vous écoute.', 'Motivation & Projet'),
    ('Valeur ajoutée', 'En quoi pensez-vous pouvoir apporter une vraie valeur ajoutée à notre équipe ou à notre entreprise ? Convainquez-nous. À vous.', 'Motivation & Projet'),
    ('Démarche de recherche', 'Comment se passe votre recherche d''emploi en ce moment ? Avez-vous d''autres pistes ? Parlez-nous de votre démarche globale.', 'Motivation & Projet'),
    ('Priorités du poste', 'Qu''est-ce que vous attendez avant tout de votre prochain poste ? Quelles sont vos priorités ? Je vous écoute.', 'Motivation & Projet'),
    ('Compétences clés', 'Quelles sont selon vous vos trois compétences les plus solides, celles sur lesquelles vous vous appuyez au quotidien ? Illustrez-les avec des exemples. À vous.', 'Compétences & Savoir-faire'),
    ('Compétences techniques', 'Quels sont vos outils, logiciels ou compétences techniques maîtrisés ? Comment les avez-vous acquis et dans quel contexte les utilisez-vous ? Je vous laisse.', 'Compétences & Savoir-faire'),
    ('Axe de développement', 'Sur quels aspects de vos compétences travaillez-vous actuellement pour progresser ? Quelle est votre démarche concrète ? À vous.', 'Compétences & Savoir-faire'),
    ('Gestion de projet', 'Décrivez-nous un projet complexe que vous avez piloté ou coordonné. Comment l''avez-vous organisé et quels résultats avez-vous obtenus ? Je vous écoute.', 'Compétences & Savoir-faire'),
    ('Analyse et décision', 'Donnez-nous un exemple de décision importante que vous avez dû prendre avec peu d''informations. Comment avez-vous procédé ? À vous.', 'Compétences & Savoir-faire'),
    ('Négociation', 'Avez-vous une expérience en négociation, que ce soit avec des clients, des fournisseurs ou en interne ? Racontez-nous une situation concrète. Je vous laisse la parole.', 'Compétences & Savoir-faire'),
    ('Formation continue', 'Comment vous tenez-vous informé des évolutions de votre métier et de votre secteur ? Parlez-nous de votre veille et de votre formation continue. À vous.', 'Compétences & Savoir-faire'),
    ('Langues', 'Quel est votre niveau dans les langues étrangères que vous pratiquez ? Dans quel contexte les avez-vous utilisées professionnellement ? Je vous écoute.', 'Compétences & Savoir-faire'),
    ('Qualités principales', 'Comment vos collègues ou managers vous décriraient-ils en quelques mots ? Qu''est-ce qui ressort systématiquement ? À vous.', 'Personnalité & Soft Skills'),
    ('Points d''amélioration', 'Quels sont vos points d''amélioration ou vos axes de travail sur le plan personnel ? Comment les gérez-vous au quotidien ? Je vous laisse.', 'Personnalité & Soft Skills'),
    ('Travail en équipe', 'Préférez-vous travailler seul ou en équipe ? Donnez-nous un exemple qui illustre votre façon de collaborer. À vous.', 'Personnalité & Soft Skills'),
    ('Gestion du stress', 'Comment réagissez-vous face à la pression et aux délais serrés ? Parlez-nous d''une situation où vous avez dû gérer un fort niveau de stress. Je vous écoute.', 'Personnalité & Soft Skills'),
    ('Adaptabilité', 'Racontez-nous une situation où vous avez dû vous adapter rapidement à un changement important. Comment l''avez-vous vécu et géré ? À vous.', 'Personnalité & Soft Skills'),
    ('Conflits professionnels', 'Avez-vous déjà connu un désaccord important avec un collègue ou un supérieur ? Comment l''avez-vous abordé et résolu ? Je vous laisse la parole.', 'Personnalité & Soft Skills'),
    ('Prise d''initiative', 'Donnez-nous un exemple où vous avez pris une initiative sans qu''on vous le demande. Qu''est-ce qui vous y a poussé et quel en a été le résultat ? À vous.', 'Personnalité & Soft Skills'),
    ('Leadership', 'Vous considérez-vous comme un leader ? Qu''est-ce que cela signifie pour vous concrètement ? Illustrez avec un exemple. Je vous écoute.', 'Personnalité & Soft Skills'),
    ('Rigueur & organisation', 'Comment organisez-vous votre travail au quotidien pour rester efficace et rigoureux ? Décrivez-nous vos méthodes. À vous.', 'Personnalité & Soft Skills'),
    ('Curiosité & apprentissage', 'Quelle est la dernière chose que vous avez apprise ou découverte, dans votre domaine ou ailleurs, qui vous a vraiment marqué ? Partagez-la avec nous.', 'Personnalité & Soft Skills'),
    ('Feedback', 'Comment recevez-vous les critiques ou les retours négatifs sur votre travail ? Donnez-nous un exemple concret. Je vous laisse.', 'Personnalité & Soft Skills'),
    ('Autonomie vs cadre', 'Vous sentez-vous plus à l''aise avec beaucoup d''autonomie ou dans un cadre bien défini ? Qu''est-ce qui vous correspond le mieux ? À vous.', 'Personnalité & Soft Skills'),
    ('Disponibilité', 'Quand seriez-vous disponible pour prendre votre poste ? Y a-t-il des contraintes particulières à prendre en compte de votre côté ? Je vous écoute.', 'Situation & Disponibilité'),
    ('Préavis', 'Avez-vous un préavis à respecter ? Si oui, sa durée est-elle négociable avec votre employeur actuel ? Dites-nous. À vous.', 'Situation & Disponibilité'),
    ('Mobilité géographique', 'Êtes-vous mobile géographiquement ? Des déplacements réguliers seraient-ils envisageables pour vous ? Parlez-nous de vos contraintes ou de vos souhaits. Je vous laisse.', 'Situation & Disponibilité'),
    ('Prétentions salariales', 'Quelles sont vos prétentions salariales pour ce poste ? Sur quelle base les avez-vous construites ? À vous d''être transparent avec nous.', 'Situation & Disponibilité'),
    ('Avantages souhaités', 'Au-delà du salaire fixe, quels éléments du package sont importants pour vous ? Parlez-nous de vos attentes globales. Je vous écoute.', 'Situation & Disponibilité'),
    ('Situation actuelle', 'Êtes-vous actuellement en poste, en transition ou disponible immédiatement ? Pouvez-vous nous expliquer votre situation ? À vous.', 'Situation & Disponibilité'),
    ('Questions candidat', 'Avant que nous terminions, avez-vous des questions à nous poser sur le poste, l''équipe ou l''entreprise ? C''est le moment, nous vous écoutons.', 'Closing & Projection'),
    ('Argument final', 'Pour conclure, si vous ne deviez retenir qu''une seule raison de vous recruter plutôt qu''un autre candidat, quelle serait-elle ? Convainquez-nous. À vous.', 'Closing & Projection'),
    ('Premier mois', 'Si vous rejoignez l''équipe, quelles seraient vos priorités durant les 30 premiers jours ? Quelle serait votre approche d''intégration ? Je vous laisse.', 'Closing & Projection'),
    ('Vision du poste', 'Comment imaginez-vous ce poste dans deux ou trois ans, si vous avez la liberté de le faire évoluer ? Partagez votre vision avec nous. À vous.', 'Closing & Projection'),
    ('Adéquation culture', 'En quoi pensez-vous correspondre à notre culture d''entreprise, telle que vous la percevez ? Dites-nous ce qui résonne pour vous. Je vous écoute.', 'Closing & Projection'),
    ('Synthèse candidature', 'Pour clore cet entretien, pouvez-vous nous faire une synthèse de votre candidature en deux ou trois minutes — qui vous êtes, ce que vous apportez, et pourquoi vous voulez ce poste ? La parole est à vous.', 'Closing & Projection')
  ) AS t(title, content, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.question_templates qt
    WHERE qt.organization_id = _org_id AND qt.title = t.title
  );
END;
$function$;

-- Delete old seed templates (only if unmodified) for all existing orgs, then reseed
DELETE FROM public.question_templates qt
WHERE (qt.title, qt.content) IN (
  ('Présentez-vous', 'Parlez-moi de votre parcours professionnel et de ce qui vous a amené à postuler. C''est à vous !'),
  ('Motivation entreprise', 'Pourquoi notre entreprise ? Qu''est-ce qui vous attire spécifiquement chez nous plutôt qu''ailleurs ?'),
  ('Qualités', 'Vos principales qualités ? Citez 2 à 3 qualités en lien avec le poste et illustrez avec un exemple concret.'),
  ('Axe d''amélioration', 'Avez-vous des zones d''inconforts ? Quel est votre plus grand axe de progression et que faites-vous pour vous améliorer ?'),
  ('Ambitions', 'Vos ambitions à 3 ans ? Où vous voyez-vous professionnellement dans 3 ans et comment ce poste s''y inscrit-il ?'),
  ('Défi pro', 'Une situation difficile ? Décrivez un défi professionnel, les actions que vous avez menées et le résultat obtenu. C''est à vous !'),
  ('Ancien poste', 'Parlez-nous de votre ancien poste, quelles sont les raisons qui vous poussent à chercher un nouveau challenge aujourd''hui ?'),
  ('Salaire', 'Avez-vous des prétentions salariales ? Quelle fourchette de rémunération envisagez-vous pour ce poste ?'),
  ('Questions pour nous', 'Avez-vous des questions ? Sur le poste, l''équipe ou la culture de l''entreprise ?'),
  ('Style de Management', 'Quel est votre style de management ? Comment animez-vous une équipe et pouvez-vous me donner un exemple concret ?')
);

-- Reseed all existing orgs with the new 50 questions
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations LOOP
    _creator := _org.owner_id;
    IF _creator IS NULL THEN
      SELECT created_by INTO _creator FROM public.question_templates
        WHERE organization_id = _org.id LIMIT 1;
    END IF;
    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_question_templates(_org.id, _creator);
    END IF;
  END LOOP;
END $$;
