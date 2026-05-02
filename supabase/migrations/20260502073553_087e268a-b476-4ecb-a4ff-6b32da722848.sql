-- Mise à jour de la fonction de seed pour inclure les énigmes (avec timer + sans relance)
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

  INSERT INTO public.question_templates (organization_id, created_by, title, content, category, type, follow_up_enabled, max_follow_ups, max_response_seconds)
  SELECT _org_id, _created_by, t.title, t.content, t.category, 'written', false, 0, t.max_response_seconds
  FROM (VALUES
    ('Introduction parcours', 'Pouvez-vous vous présenter en quelques minutes ? Dites-nous qui vous êtes, d''où vous venez professionnellement, et ce qui vous a amené jusqu''ici. Je vous écoute.', 'Expérience', NULL::int),
    ('Résumé CV', 'Si vous deviez résumer votre parcours en trois mots ou trois étapes clés, quels seraient-ils et pourquoi ? À vous.', 'Expérience', NULL),
    ('Dernier poste', 'Parlez-moi de votre dernier poste : vos responsabilités, vos missions du quotidien, et ce que vous y avez accompli concrètement. Je vous laisse la parole.', 'Expérience', NULL),
    ('Réalisation marquante', 'Quelle est la réalisation professionnelle dont vous êtes le plus fier ou la plus fière ? Décrivez-la-nous dans le détail. À vous de jouer.', 'Expérience', NULL),
    ('Raison de départ', 'Qu''est-ce qui vous a amené à quitter — ou à envisager de quitter — votre poste actuel ou précédent ? Expliquez-nous votre démarche.', 'Expérience', NULL),
    ('Évolution de carrière', 'Comment décririez-vous l''évolution de votre carrière jusqu''à aujourd''hui ? Était-elle planifiée ou plutôt le fruit des opportunités ? Dites-nous.', 'Expérience', NULL),
    ('Expérience de management', 'Avez-vous déjà managé une équipe ? Si oui, décrivez-nous cette expérience : la taille de l''équipe, votre style de management, et les défis que vous avez rencontrés. Je vous écoute.', 'Expérience', NULL),
    ('Situation de crise', 'Racontez-nous une situation difficile ou une crise que vous avez dû gérer dans votre carrière. Comment l''avez-vous abordée ? À vous.', 'Expérience', NULL),
    ('Erreur professionnelle', 'Parlez-nous d''une erreur que vous avez commise dans votre travail et ce que vous en avez appris. Soyez honnête, c''est ce qui nous intéresse. Je vous laisse.', 'Expérience', NULL),
    ('Contexte international', 'Avez-vous une expérience à l''international ou dans un environnement multiculturel ? Décrivez-nous cela. À vous.', 'Expérience', NULL),
    ('Motivation poste', 'Qu''est-ce qui vous attire dans ce poste en particulier ? Soyez précis, au-delà de la fiche de poste. Je vous écoute.', 'Motivation', NULL),
    ('Connaissance entreprise', 'Que savez-vous de notre entreprise, de nos activités et de notre positionnement sur le marché ? Dites-nous ce que vous avez retenu. À vous.', 'Motivation', NULL),
    ('Choix du secteur', 'Pourquoi ce secteur d''activité vous attire-t-il ? Qu''est-ce qui vous y a conduit ou vous y retient ? Je vous laisse la parole.', 'Motivation', NULL),
    ('Projet professionnel', 'Où vous voyez-vous dans cinq ans ? Quel est votre projet professionnel à moyen terme ? À vous de nous exposer votre vision.', 'Motivation', NULL),
    ('Ambitions long terme', 'Quelles sont vos ambitions à long terme, au-delà de ce poste ? Comment ce rôle s''inscrit-il dans votre trajectoire ? Je vous écoute.', 'Motivation', NULL),
    ('Valeur ajoutée', 'En quoi pensez-vous pouvoir apporter une vraie valeur ajoutée à notre équipe ou à notre entreprise ? Convainquez-nous. À vous.', 'Motivation', NULL),
    ('Démarche de recherche', 'Comment se passe votre recherche d''emploi en ce moment ? Avez-vous d''autres pistes ? Parlez-nous de votre démarche globale.', 'Motivation', NULL),
    ('Priorités du poste', 'Qu''est-ce que vous attendez avant tout de votre prochain poste ? Quelles sont vos priorités ? Je vous écoute.', 'Motivation', NULL),
    ('Compétences clés', 'Quelles sont selon vous vos trois compétences les plus solides, celles sur lesquelles vous vous appuyez au quotidien ? Illustrez-les avec des exemples. À vous.', 'Compétences', NULL),
    ('Compétences techniques', 'Quels sont vos outils, logiciels ou compétences techniques maîtrisés ? Comment les avez-vous acquis et dans quel contexte les utilisez-vous ? Je vous laisse.', 'Compétences', NULL),
    ('Axe de développement', 'Sur quels aspects de vos compétences travaillez-vous actuellement pour progresser ? Quelle est votre démarche concrète ? À vous.', 'Compétences', NULL),
    ('Gestion de projet', 'Décrivez-nous un projet complexe que vous avez piloté ou coordonné. Comment l''avez-vous organisé et quels résultats avez-vous obtenus ? Je vous écoute.', 'Compétences', NULL),
    ('Analyse et décision', 'Donnez-nous un exemple de décision importante que vous avez dû prendre avec peu d''informations. Comment avez-vous procédé ? À vous.', 'Compétences', NULL),
    ('Négociation', 'Avez-vous une expérience en négociation, que ce soit avec des clients, des fournisseurs ou en interne ? Racontez-nous une situation concrète. Je vous laisse la parole.', 'Compétences', NULL),
    ('Formation continue', 'Comment vous tenez-vous informé des évolutions de votre métier et de votre secteur ? Parlez-nous de votre veille et de votre formation continue. À vous.', 'Compétences', NULL),
    ('Langues', 'Quel est votre niveau dans les langues étrangères que vous pratiquez ? Dans quel contexte les avez-vous utilisées professionnellement ? Je vous écoute.', 'Compétences', NULL),
    ('Qualités principales', 'Comment vos collègues ou managers vous décriraient-ils en quelques mots ? Qu''est-ce qui ressort systématiquement ? À vous.', 'Personnalité', NULL),
    ('Points d''amélioration', 'Quels sont vos points d''amélioration ou vos axes de travail sur le plan personnel ? Comment les gérez-vous au quotidien ? Je vous laisse.', 'Personnalité', NULL),
    ('Travail en équipe', 'Préférez-vous travailler seul ou en équipe ? Donnez-nous un exemple qui illustre votre façon de collaborer. À vous.', 'Personnalité', NULL),
    ('Gestion du stress', 'Comment réagissez-vous face à la pression et aux délais serrés ? Parlez-nous d''une situation où vous avez dû gérer un fort niveau de stress. Je vous écoute.', 'Personnalité', NULL),
    ('Adaptabilité', 'Racontez-nous une situation où vous avez dû vous adapter rapidement à un changement important. Comment l''avez-vous vécu et géré ? À vous.', 'Personnalité', NULL),
    ('Conflits professionnels', 'Avez-vous déjà connu un désaccord important avec un collègue ou un supérieur ? Comment l''avez-vous abordé et résolu ? Je vous laisse la parole.', 'Personnalité', NULL),
    ('Prise d''initiative', 'Donnez-nous un exemple où vous avez pris une initiative sans qu''on vous le demande. Qu''est-ce qui vous y a poussé et quel en a été le résultat ? À vous.', 'Personnalité', NULL),
    ('Leadership', 'Vous considérez-vous comme un leader ? Qu''est-ce que cela signifie pour vous concrètement ? Illustrez avec un exemple. Je vous écoute.', 'Personnalité', NULL),
    ('Rigueur & organisation', 'Comment organisez-vous votre travail au quotidien pour rester efficace et rigoureux ? Décrivez-nous vos méthodes. À vous.', 'Personnalité', NULL),
    ('Curiosité & apprentissage', 'Quelle est la dernière chose que vous avez apprise ou découverte, dans votre domaine ou ailleurs, qui vous a vraiment marqué ? Partagez-la avec nous.', 'Personnalité', NULL),
    ('Feedback', 'Comment recevez-vous les critiques ou les retours négatifs sur votre travail ? Donnez-nous un exemple concret. Je vous laisse.', 'Personnalité', NULL),
    ('Autonomie vs cadre', 'Vous sentez-vous plus à l''aise avec beaucoup d''autonomie ou dans un cadre bien défini ? Qu''est-ce qui vous correspond le mieux ? À vous.', 'Personnalité', NULL),
    ('Disponibilité', 'Quand seriez-vous disponible pour prendre votre poste ? Y a-t-il des contraintes particulières à prendre en compte de votre côté ? Je vous écoute.', 'Autres', NULL),
    ('Préavis', 'Avez-vous un préavis à respecter ? Si oui, sa durée est-elle négociable avec votre employeur actuel ? Dites-nous. À vous.', 'Autres', NULL),
    ('Mobilité géographique', 'Êtes-vous mobile géographiquement ? Des déplacements réguliers seraient-ils envisageables pour vous ? Parlez-nous de vos contraintes ou de vos souhaits. Je vous laisse.', 'Autres', NULL),
    ('Prétentions salariales', 'Quelles sont vos prétentions salariales pour ce poste ? Sur quelle base les avez-vous construites ? À vous d''être transparent avec nous.', 'Autres', NULL),
    ('Avantages souhaités', 'Au-delà du salaire fixe, quels éléments du package sont importants pour vous ? Parlez-nous de vos attentes globales. Je vous écoute.', 'Autres', NULL),
    ('Situation actuelle', 'Êtes-vous actuellement en poste, en transition ou disponible immédiatement ? Pouvez-vous nous expliquer votre situation ? À vous.', 'Autres', NULL),
    ('Questions candidat', 'Avant que nous terminions, avez-vous des questions à nous poser sur le poste, l''équipe ou l''entreprise ? C''est le moment, nous vous écoutons.', 'Motivation', NULL),
    ('Argument final', 'Pour conclure, si vous ne deviez retenir qu''une seule raison de vous recruter plutôt qu''un autre candidat, quelle serait-elle ? Convainquez-nous. À vous.', 'Motivation', NULL),
    ('Premier mois', 'Si vous rejoignez l''équipe, quelles seraient vos priorités durant les 30 premiers jours ? Quelle serait votre approche d''intégration ? Je vous laisse.', 'Motivation', NULL),
    ('Vision du poste', 'Comment imaginez-vous ce poste dans deux ou trois ans, si vous avez la liberté de le faire évoluer ? Partagez votre vision avec nous. À vous.', 'Motivation', NULL),
    ('Adéquation culture', 'En quoi pensez-vous correspondre à notre culture d''entreprise, telle que vous la percevez ? Dites-nous ce qui résonne pour vous. Je vous écoute.', 'Culture', NULL),
    ('Synthèse candidature', 'Pour clore cet entretien, pouvez-vous nous faire une synthèse de votre candidature en deux ou trois minutes — qui vous êtes, ce que vous apportez, et pourquoi vous voulez ce poste ? La parole est à vous.', 'Motivation', NULL),

    -- Énigmes (timer 3 min, sans relance)
    ('Énigmes - Les 3 ampoules', 'Vous êtes au rez-de-chaussée d''une maison. Trois interrupteurs sont devant vous, chacun commande une des trois ampoules situées à l''étage. Au départ, toutes les ampoules sont éteintes. Vous ne pouvez monter à l''étage qu''une seule fois pour observer les ampoules. Comment faites-vous pour identifier avec certitude quel interrupteur commande quelle ampoule ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - Les 9 billes', 'Vous avez 9 billes d''apparence identique. L''une d''entre elles est légèrement plus lourde que les autres. Vous disposez d''une balance à deux plateaux, sans poids. Comment identifier la bille la plus lourde en seulement 2 pesées maximum ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - Les 2 cordes', 'Vous avez deux cordes. Chacune met exactement une heure à brûler entièrement, mais leur combustion n''est pas uniforme (certains tronçons brûlent plus vite que d''autres). Comment mesurer exactement 45 minutes en utilisant uniquement ces deux cordes et des allumettes ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - Le pont et la lampe', 'Quatre personnes doivent traverser un pont de nuit. Elles n''ont qu''une seule lampe et le pont ne peut supporter que deux personnes à la fois. Les temps de traversée sont : 1 min, 2 min, 5 min et 10 min. Quand deux personnes traversent ensemble, elles vont à la vitesse de la plus lente. Comment faire passer tout le monde de l''autre côté en 17 minutes maximum ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - Les 2 seaux', 'Vous avez deux seaux : un de 3 litres et un de 5 litres, et un robinet d''eau à volonté. Aucune graduation sur les seaux. Comment mesurer exactement 4 litres d''eau ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - Pourquoi les plaques d''égout sont rondes ?', 'On vous pose une question classique d''entretien : pourquoi les plaques d''égout sont-elles le plus souvent rondes plutôt que carrées ou rectangulaires ? Donnez le maximum de raisons possibles, et expliquez votre cheminement. Il n''y a pas une seule bonne réponse, ce qui nous intéresse, c''est votre façon de raisonner. À vous.', 'Énigmes', 180),
    ('Énigmes - Combien de balles de tennis dans un bus ?', 'Estimez combien de balles de tennis pourraient tenir dans un bus de ville classique. Aucune réponse exacte n''est attendue : ce qui compte, c''est la méthode d''estimation, les hypothèses que vous prenez et la cohérence du raisonnement. Réfléchissez à voix haute et exposez votre démarche pas à pas. À vous.', 'Énigmes', 180),
    ('Énigmes - Le chameau et les bananes', 'Un marchand possède 3000 bananes et veut les transporter sur 1000 km à dos de chameau. Le chameau ne peut porter que 1000 bananes à la fois et mange 1 banane par kilomètre parcouru (qu''il soit chargé ou non). Quel est le nombre maximum de bananes que le marchand peut livrer à destination ? Prenez le temps de réfléchir à voix haute et expliquez-nous votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180),
    ('Énigmes - L''horloge', 'Entre midi et 13 heures, à quel moment précis les aiguilles des heures et des minutes d''une horloge analogique se superposent-elles exactement ? Donnez votre raisonnement et, si possible, la valeur la plus précise. Réfléchissez à voix haute et expliquez votre démarche. À vous.', 'Énigmes', 180),
    ('Énigmes - Les 100 prisonniers', '100 prisonniers sont alignés et reçoivent chacun, sur la tête, un chapeau noir ou blanc (la répartition est aléatoire). Chaque prisonnier voit les chapeaux des personnes devant lui mais pas le sien ni ceux des personnes derrière. En commençant par celui de derrière, chacun à son tour doit annoncer "noir" ou "blanc". S''il devine la couleur de son propre chapeau, il est sauvé. Quelle stratégie peuvent-ils convenir à l''avance pour sauver le maximum de prisonniers à coup sûr ? Prenez le temps de réfléchir à voix haute et expliquez votre raisonnement, même si vous ne trouvez pas la réponse exacte. À vous.', 'Énigmes', 180)
  ) AS t(title, content, category, max_response_seconds)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.question_templates qt
    WHERE qt.organization_id = _org_id AND qt.title = t.title
  );
END;
$function$;

-- Backfill : ajouter les énigmes à toutes les organisations existantes
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
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