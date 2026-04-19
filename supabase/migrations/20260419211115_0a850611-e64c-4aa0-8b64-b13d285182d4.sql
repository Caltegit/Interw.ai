
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
    ('Introduction parcours', 'Pouvez-vous vous présenter en quelques minutes ? Dites-nous qui vous êtes, d''où vous venez professionnellement, et ce qui vous a amené jusqu''ici. Je vous écoute.', 'Expérience'),
    ('Résumé CV', 'Si vous deviez résumer votre parcours en trois mots ou trois étapes clés, quels seraient-ils et pourquoi ? À vous.', 'Expérience'),
    ('Dernier poste', 'Parlez-moi de votre dernier poste : vos responsabilités, vos missions du quotidien, et ce que vous y avez accompli concrètement. Je vous laisse la parole.', 'Expérience'),
    ('Réalisation marquante', 'Quelle est la réalisation professionnelle dont vous êtes le plus fier ou la plus fière ? Décrivez-la-nous dans le détail. À vous de jouer.', 'Expérience'),
    ('Raison de départ', 'Qu''est-ce qui vous a amené à quitter — ou à envisager de quitter — votre poste actuel ou précédent ? Expliquez-nous votre démarche.', 'Expérience'),
    ('Évolution de carrière', 'Comment décririez-vous l''évolution de votre carrière jusqu''à aujourd''hui ? Était-elle planifiée ou plutôt le fruit des opportunités ? Dites-nous.', 'Expérience'),
    ('Expérience de management', 'Avez-vous déjà managé une équipe ? Si oui, décrivez-nous cette expérience : la taille de l''équipe, votre style de management, et les défis que vous avez rencontrés. Je vous écoute.', 'Expérience'),
    ('Situation de crise', 'Racontez-nous une situation difficile ou une crise que vous avez dû gérer dans votre carrière. Comment l''avez-vous abordée ? À vous.', 'Expérience'),
    ('Erreur professionnelle', 'Parlez-nous d''une erreur que vous avez commise dans votre travail et ce que vous en avez appris. Soyez honnête, c''est ce qui nous intéresse. Je vous laisse.', 'Expérience'),
    ('Contexte international', 'Avez-vous une expérience à l''international ou dans un environnement multiculturel ? Décrivez-nous cela. À vous.', 'Expérience'),
    ('Motivation poste', 'Qu''est-ce qui vous attire dans ce poste en particulier ? Soyez précis, au-delà de la fiche de poste. Je vous écoute.', 'Motivation'),
    ('Connaissance entreprise', 'Que savez-vous de notre entreprise, de nos activités et de notre positionnement sur le marché ? Dites-nous ce que vous avez retenu. À vous.', 'Motivation'),
    ('Choix du secteur', 'Pourquoi ce secteur d''activité vous attire-t-il ? Qu''est-ce qui vous y a conduit ou vous y retient ? Je vous laisse la parole.', 'Motivation'),
    ('Projet professionnel', 'Où vous voyez-vous dans cinq ans ? Quel est votre projet professionnel à moyen terme ? À vous de nous exposer votre vision.', 'Motivation'),
    ('Ambitions long terme', 'Quelles sont vos ambitions à long terme, au-delà de ce poste ? Comment ce rôle s''inscrit-il dans votre trajectoire ? Je vous écoute.', 'Motivation'),
    ('Valeur ajoutée', 'En quoi pensez-vous pouvoir apporter une vraie valeur ajoutée à notre équipe ou à notre entreprise ? Convainquez-nous. À vous.', 'Motivation'),
    ('Démarche de recherche', 'Comment se passe votre recherche d''emploi en ce moment ? Avez-vous d''autres pistes ? Parlez-nous de votre démarche globale.', 'Motivation'),
    ('Priorités du poste', 'Qu''est-ce que vous attendez avant tout de votre prochain poste ? Quelles sont vos priorités ? Je vous écoute.', 'Motivation'),
    ('Compétences clés', 'Quelles sont selon vous vos trois compétences les plus solides, celles sur lesquelles vous vous appuyez au quotidien ? Illustrez-les avec des exemples. À vous.', 'Compétences'),
    ('Compétences techniques', 'Quels sont vos outils, logiciels ou compétences techniques maîtrisés ? Comment les avez-vous acquis et dans quel contexte les utilisez-vous ? Je vous laisse.', 'Compétences'),
    ('Axe de développement', 'Sur quels aspects de vos compétences travaillez-vous actuellement pour progresser ? Quelle est votre démarche concrète ? À vous.', 'Compétences'),
    ('Gestion de projet', 'Décrivez-nous un projet complexe que vous avez piloté ou coordonné. Comment l''avez-vous organisé et quels résultats avez-vous obtenus ? Je vous écoute.', 'Compétences'),
    ('Analyse et décision', 'Donnez-nous un exemple de décision importante que vous avez dû prendre avec peu d''informations. Comment avez-vous procédé ? À vous.', 'Compétences'),
    ('Négociation', 'Avez-vous une expérience en négociation, que ce soit avec des clients, des fournisseurs ou en interne ? Racontez-nous une situation concrète. Je vous laisse la parole.', 'Compétences'),
    ('Formation continue', 'Comment vous tenez-vous informé des évolutions de votre métier et de votre secteur ? Parlez-nous de votre veille et de votre formation continue. À vous.', 'Compétences'),
    ('Langues', 'Quel est votre niveau dans les langues étrangères que vous pratiquez ? Dans quel contexte les avez-vous utilisées professionnellement ? Je vous écoute.', 'Compétences'),
    ('Qualités principales', 'Comment vos collègues ou managers vous décriraient-ils en quelques mots ? Qu''est-ce qui ressort systématiquement ? À vous.', 'Personnalité'),
    ('Points d''amélioration', 'Quels sont vos points d''amélioration ou vos axes de travail sur le plan personnel ? Comment les gérez-vous au quotidien ? Je vous laisse.', 'Personnalité'),
    ('Travail en équipe', 'Préférez-vous travailler seul ou en équipe ? Donnez-nous un exemple qui illustre votre façon de collaborer. À vous.', 'Personnalité'),
    ('Gestion du stress', 'Comment réagissez-vous face à la pression et aux délais serrés ? Parlez-nous d''une situation où vous avez dû gérer un fort niveau de stress. Je vous écoute.', 'Personnalité'),
    ('Adaptabilité', 'Racontez-nous une situation où vous avez dû vous adapter rapidement à un changement important. Comment l''avez-vous vécu et géré ? À vous.', 'Personnalité'),
    ('Conflits professionnels', 'Avez-vous déjà connu un désaccord important avec un collègue ou un supérieur ? Comment l''avez-vous abordé et résolu ? Je vous laisse la parole.', 'Personnalité'),
    ('Prise d''initiative', 'Donnez-nous un exemple où vous avez pris une initiative sans qu''on vous le demande. Qu''est-ce qui vous y a poussé et quel en a été le résultat ? À vous.', 'Personnalité'),
    ('Leadership', 'Vous considérez-vous comme un leader ? Qu''est-ce que cela signifie pour vous concrètement ? Illustrez avec un exemple. Je vous écoute.', 'Personnalité'),
    ('Rigueur & organisation', 'Comment organisez-vous votre travail au quotidien pour rester efficace et rigoureux ? Décrivez-nous vos méthodes. À vous.', 'Personnalité'),
    ('Curiosité & apprentissage', 'Quelle est la dernière chose que vous avez apprise ou découverte, dans votre domaine ou ailleurs, qui vous a vraiment marqué ? Partagez-la avec nous.', 'Personnalité'),
    ('Feedback', 'Comment recevez-vous les critiques ou les retours négatifs sur votre travail ? Donnez-nous un exemple concret. Je vous laisse.', 'Personnalité'),
    ('Autonomie vs cadre', 'Vous sentez-vous plus à l''aise avec beaucoup d''autonomie ou dans un cadre bien défini ? Qu''est-ce qui vous correspond le mieux ? À vous.', 'Personnalité'),
    ('Disponibilité', 'Quand seriez-vous disponible pour prendre votre poste ? Y a-t-il des contraintes particulières à prendre en compte de votre côté ? Je vous écoute.', 'Autres'),
    ('Préavis', 'Avez-vous un préavis à respecter ? Si oui, sa durée est-elle négociable avec votre employeur actuel ? Dites-nous. À vous.', 'Autres'),
    ('Mobilité géographique', 'Êtes-vous mobile géographiquement ? Des déplacements réguliers seraient-ils envisageables pour vous ? Parlez-nous de vos contraintes ou de vos souhaits. Je vous laisse.', 'Autres'),
    ('Prétentions salariales', 'Quelles sont vos prétentions salariales pour ce poste ? Sur quelle base les avez-vous construites ? À vous d''être transparent avec nous.', 'Autres'),
    ('Avantages souhaités', 'Au-delà du salaire fixe, quels éléments du package sont importants pour vous ? Parlez-nous de vos attentes globales. Je vous écoute.', 'Autres'),
    ('Situation actuelle', 'Êtes-vous actuellement en poste, en transition ou disponible immédiatement ? Pouvez-vous nous expliquer votre situation ? À vous.', 'Autres'),
    ('Questions candidat', 'Avant que nous terminions, avez-vous des questions à nous poser sur le poste, l''équipe ou l''entreprise ? C''est le moment, nous vous écoutons.', 'Motivation'),
    ('Argument final', 'Pour conclure, si vous ne deviez retenir qu''une seule raison de vous recruter plutôt qu''un autre candidat, quelle serait-elle ? Convainquez-nous. À vous.', 'Motivation'),
    ('Premier mois', 'Si vous rejoignez l''équipe, quelles seraient vos priorités durant les 30 premiers jours ? Quelle serait votre approche d''intégration ? Je vous laisse.', 'Motivation'),
    ('Vision du poste', 'Comment imaginez-vous ce poste dans deux ou trois ans, si vous avez la liberté de le faire évoluer ? Partagez votre vision avec nous. À vous.', 'Motivation'),
    ('Adéquation culture', 'En quoi pensez-vous correspondre à notre culture d''entreprise, telle que vous la percevez ? Dites-nous ce qui résonne pour vous. Je vous écoute.', 'Culture'),
    ('Synthèse candidature', 'Pour clore cet entretien, pouvez-vous nous faire une synthèse de votre candidature en deux ou trois minutes — qui vous êtes, ce que vous apportez, et pourquoi vous voulez ce poste ? La parole est à vous.', 'Motivation')
  ) AS t(title, content, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.question_templates qt
    WHERE qt.organization_id = _org_id AND qt.title = t.title
  );
END;
$function$;
