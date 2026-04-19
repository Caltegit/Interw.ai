CREATE OR REPLACE FUNCTION public.seed_default_interview_templates(_org_id uuid, _created_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tpl_id uuid;
  _seed RECORD;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  FOR _seed IN
    SELECT * FROM (VALUES
      ('Office Manager', 'Modèle d''entretien pour un poste d''Office Manager : organisation, polyvalence, gestion des priorités et confidentialité.', 'Support', 'Office Manager', 30),
      ('Commercial', 'Modèle d''entretien pour un profil commercial : méthode de vente, gestion des objections, performance chiffrée et résilience.', 'Commercial', 'Commercial(e)', 30),
      ('Développeur', 'Modèle d''entretien pour un développeur : stack, architecture, débogage, code review et veille technologique.', 'Tech', 'Développeur(se)', 40),
      ('Comptable', 'Modèle d''entretien pour un comptable : clôtures, fiabilité des données, fiscalité, outils et collaboration avec les auditeurs.', 'Finance', 'Comptable', 30),
      ('RH Manager', 'Modèle d''entretien pour un RH Manager : vision RH, recrutement, relations sociales, conduite du changement et marque employeur.', 'RH', 'RH Manager', 35),
      ('Chef de Produit', 'Modèle d''entretien pour un Product Manager : vision produit, discovery, priorisation, collaboration tech et mesure d''impact.', 'Produit', 'Chef de produit', 35)
    ) AS s(name, description, category, job_title, duration)
  LOOP
    IF EXISTS (SELECT 1 FROM public.interview_templates WHERE organization_id = _org_id AND name = _seed.name) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.interview_templates (organization_id, created_by, name, description, category, job_title, default_duration_minutes, default_language)
    VALUES (_org_id, _created_by, _seed.name, _seed.description, _seed.category, _seed.job_title, _seed.duration, 'fr')
    RETURNING id INTO _tpl_id;

    INSERT INTO public.interview_template_criteria (template_id, order_index, label, description, weight, scoring_scale, applies_to)
    VALUES
      (_tpl_id, 0, 'Clarté du discours', 'Capacité à structurer sa pensée et à s''exprimer clairement.', 35, '0-5', 'all_questions'),
      (_tpl_id, 1, 'Motivation & adhésion au poste', 'Démontre un intérêt sincère et documenté pour le poste.', 35, '0-5', 'all_questions'),
      (_tpl_id, 2, 'Cohérence du parcours', 'Les choix de carrière s''enchaînent de manière logique.', 30, '0-5', 'all_questions');

    IF _seed.name = 'Office Manager' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer de façon détendue : si vous deviez décrire votre métier d''Office Manager à quelqu''un qui n''en a jamais entendu parler, vous lui diriez quoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Gestion des priorités', 'Une réunion de direction à organiser en urgence, une panne informatique, et trois managers qui vous réclament en même temps. Comment vous en sortez-vous ? À vous.', 'written', true, 2, 'medium', 'Organisation'),
        (_tpl_id, 2, 'Relation fournisseurs', 'Avez-vous déjà renégocié un contrat fournisseur ou changé de prestataire ? Qu''est-ce qui vous a guidé dans cette décision ? Je vous laisse la parole.', 'written', true, 2, 'medium', 'Gestion'),
        (_tpl_id, 3, 'Outils & digitalisation', 'Quels outils utilisez-vous pour piloter votre quotidien ? Y en a-t-il un que vous avez vous-même introduit dans une équipe ? À vous.', 'written', true, 1, 'medium', 'Compétences techniques'),
        (_tpl_id, 4, 'Confidentialité', 'En tant qu''Office Manager, vous accédez souvent à des informations très sensibles. Comment abordez-vous cette responsabilité ? Je vous écoute.', 'written', true, 2, 'deep', 'Soft skills'),
        (_tpl_id, 5, 'Amélioration de process', 'Avez-vous déjà identifié quelque chose qui fonctionnait mal et pris l''initiative de l''améliorer ? Qu''avez-vous fait concrètement ? À vous.', 'written', true, 2, 'medium', 'Initiative'),
        (_tpl_id, 6, 'Relation avec la direction', 'Comment gérez-vous une situation où les attentes de la direction sont floues ou changeantes ? Donnez-nous un exemple vécu. Je vous laisse.', 'written', true, 2, 'medium', 'Relationnel'),
        (_tpl_id, 7, 'Gestion d''un imprévu majeur', 'Racontez-nous un imprévu important que vous avez dû gérer seul(e). Comment avez-vous réagi ? À vous.', 'written', true, 2, 'deep', 'Gestion de crise'),
        (_tpl_id, 8, 'Polyvalence', 'Ce poste touche à tout. Dans quel domaine êtes-vous le plus dans votre élément, et sur lequel aimeriez-vous progresser ? Je vous écoute.', 'written', true, 1, 'medium', 'Développement'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous deviez nous donner une seule raison concrète et sincère pour laquelle vous seriez un(e) excellent(e) Office Manager chez nous, ce serait laquelle ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Commercial' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer sur une note légère : quel est le pitch de vente dont vous êtes le plus fier, celui que vous pourriez faire les yeux fermés ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Méthode commerciale', 'Décrivez-nous votre façon d''approcher un prospect froid de la première prise de contact jusqu''à la signature. Quelle est votre recette ? À vous.', 'written', true, 2, 'medium', 'Méthode'),
        (_tpl_id, 2, 'Gestion des objections', 'Un prospect vous dit : "C''est trop cher et votre concurrent fait la même chose." Vous répondez quoi ? Montrez-nous comment vous gérez ça. Je vous laisse.', 'written', true, 2, 'deep', 'Technique de vente'),
        (_tpl_id, 3, 'Performance chiffrée', 'Parlez-nous de vos résultats sur les deux dernières années : objectifs fixés, taux d''atteinte, taille du portefeuille. Soyez précis(e). À vous.', 'written', true, 2, 'medium', 'Résultats'),
        (_tpl_id, 4, 'Client perdu & récupéré', 'Avez-vous déjà perdu un client puis réussi à le récupérer ? Qu''est-ce qui s''était passé et comment avez-vous retourné la situation ? Je vous écoute.', 'written', true, 2, 'medium', 'Relation client'),
        (_tpl_id, 5, 'Prospection autonome', 'Quelle est votre approche pour générer vos propres leads sans dépendre du marketing ? Quels canaux vous donnent les meilleurs résultats ? À vous.', 'written', true, 2, 'medium', 'Prospection'),
        (_tpl_id, 6, 'Cycle de vente complexe', 'Racontez-nous un deal long et complexe avec plusieurs décideurs. Comment avez-vous emporté la décision ? Je vous laisse la parole.', 'written', true, 2, 'deep', 'Stratégie'),
        (_tpl_id, 7, 'Traverser une mauvaise période', 'Comment avez-vous traversé votre creux de vague le plus difficile ? Qu''est-ce qui vous a aidé à rebondir ? À vous.', 'written', true, 2, 'medium', 'Résilience'),
        (_tpl_id, 8, 'Collaboration interne', 'Comment travaillez-vous avec le marketing, les équipes techniques ou le delivery pour maximiser vos chances de signer ? Je vous écoute.', 'written', true, 1, 'medium', 'Collaboration'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Dernier exercice — et vous allez adorer : vendez-vous à nous en deux minutes chrono. Convainquez-nous que vous êtes le ou la commerciale qu''il nous faut. La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Développeur' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : quel est le projet sur lequel vous avez codé avec le plus de plaisir ces derniers temps ? Ce qui compte c''est la passion. Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Stack & spécialités', 'Présentez-nous votre stack technique et dites-nous sur quoi vous vous sentez vraiment expert(e), et ce que vous souhaitez encore approfondir. À vous.', 'written', true, 2, 'medium', 'Compétences techniques'),
        (_tpl_id, 2, 'Choix d''architecture', 'Racontez-nous un projet où vous avez eu à faire des choix d''architecture importants. Quelles ont été vos décisions et pourquoi ? Je vous laisse.', 'written', true, 2, 'deep', 'Architecture'),
        (_tpl_id, 3, 'Débogage complexe', 'Décrivez-nous le bug le plus coriace que vous ayez rencontré. Comment avez-vous procédé pour en trouver la source ? À vous.', 'written', true, 2, 'deep', 'Résolution de problèmes'),
        (_tpl_id, 4, 'Dette technique', 'Avez-vous déjà travaillé dans une base de code très dégradée ? Comment avez-vous abordé la dette technique ? Je vous écoute.', 'written', true, 2, 'medium', 'Qualité'),
        (_tpl_id, 5, 'Code review & collaboration', 'Comment pratiquez-vous la code review ? Qu''est-ce qui fait une bonne culture de revue de code dans une équipe ? À vous.', 'written', true, 1, 'medium', 'Collaboration'),
        (_tpl_id, 6, 'Gestion des délais', 'Avez-vous déjà dû annoncer un retard technique à des parties prenantes non techniques ? Comment l''avez-vous communiqué ? Je vous laisse la parole.', 'written', true, 2, 'medium', 'Communication'),
        (_tpl_id, 7, 'Travail en agile', 'Décrivez votre expérience des méthodes agiles. Qu''est-ce qui fonctionne bien, et qu''est-ce qui peut devenir contre-productif ? À vous.', 'written', true, 1, 'medium', 'Méthodes'),
        (_tpl_id, 8, 'Veille & apprentissage', 'Comment restez-vous à jour technologiquement ? Qu''avez-vous découvert récemment qui vous a enthousiasmé(e) ? Je vous écoute.', 'written', true, 1, 'medium', 'Apprentissage'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'S''il y avait un problème technique ou un défi que vous rêveriez de résoudre chez nous si vous rejoignez l''équipe, ce serait lequel ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Comptable' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer tranquillement : qu''est-ce qui vous a donné envie de faire de la comptabilité votre métier ? Il y a souvent une bonne histoire derrière. Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Clôtures & reporting', 'Décrivez-nous votre rôle dans les clôtures mensuelles et annuelles. Quelles étaient vos responsabilités et comment organisiez-vous ce travail sous pression ? À vous.', 'written', true, 2, 'medium', 'Technique'),
        (_tpl_id, 2, 'Fiabilité des données', 'Comment vous assurez-vous que les chiffres que vous produisez sont fiables et cohérents ? Quelle est votre méthode de contrôle ? Je vous laisse.', 'written', true, 2, 'deep', 'Rigueur'),
        (_tpl_id, 3, 'Détection d''une anomalie', 'Avez-vous déjà détecté une erreur significative dans les comptes ? Comment l''avez-vous traitée et communiquée ? À vous.', 'written', true, 2, 'medium', 'Gestion des erreurs'),
        (_tpl_id, 4, 'Logiciels & outils', 'Quels logiciels comptables avez-vous pratiqués — SAP, Sage, Cegid ? Lequel maîtrisez-vous le mieux ? Je vous écoute.', 'written', true, 1, 'medium', 'Outils'),
        (_tpl_id, 5, 'Fiscalité', 'Quel est votre niveau de maîtrise sur les sujets fiscaux — TVA, IS, liasses ? Sur quels points êtes-vous le plus à l''aise ? À vous.', 'written', true, 2, 'medium', 'Fiscalité'),
        (_tpl_id, 6, 'Relation avec les auditeurs', 'Avez-vous travaillé avec des commissaires aux comptes ou des auditeurs externes ? Comment se déroulaient ces échanges ? Je vous laisse la parole.', 'written', true, 1, 'medium', 'Audit'),
        (_tpl_id, 7, 'Collaboration avec les opérationnels', 'Comment travaillez-vous avec des équipes non financières pour collecter les données dont vous avez besoin ? À vous.', 'written', true, 1, 'medium', 'Collaboration'),
        (_tpl_id, 8, 'Amélioration de process', 'Avez-vous déjà proposé ou mis en place une amélioration dans un process comptable ? Je vous écoute.', 'written', true, 2, 'medium', 'Initiative'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'En dehors des compétences techniques, qu''est-ce que vous pensez apporter à notre équipe que personne d''autre ne peut apporter ? À vous de nous surprendre.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'RH Manager' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer de façon détendue : si vous deviez expliquer en une phrase pourquoi les RH sont un métier stratégique et pas juste administratif, vous diriez quoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Vision & posture RH', 'Comment définissez-vous le rôle idéal d''un RH Manager ? Quel équilibre trouvez-vous entre le soutien aux managers et la défense des collaborateurs ? À vous.', 'written', true, 2, 'deep', 'Vision'),
        (_tpl_id, 2, 'Recrutement', 'Décrivez-nous votre processus de recrutement de bout en bout. Comment attirez-vous, évaluez-vous et intégrez-vous un candidat ? Je vous laisse.', 'written', true, 2, 'medium', 'Recrutement'),
        (_tpl_id, 3, 'Gestion d''un cas difficile', 'Racontez-nous une situation RH délicate — conflit, inaptitude, licenciement complexe. Quelle a été votre approche ? À vous.', 'written', true, 2, 'deep', 'Gestion des cas'),
        (_tpl_id, 4, 'Relations sociales', 'Avez-vous eu à gérer des situations sociales tendues — IRP, NAO, plan social ? Comment avez-vous navigué dans ces contextes ? Je vous écoute.', 'written', true, 2, 'medium', 'Relations sociales'),
        (_tpl_id, 5, 'Développement des compétences', 'Comment construisez-vous un plan de formation qui soit vraiment utile et pas juste une formalité ? À vous.', 'written', true, 1, 'medium', 'Formation'),
        (_tpl_id, 6, 'Accompagnement du changement', 'Avez-vous accompagné une transformation d''entreprise ? Quel a été votre rôle RH concret dans ce projet ? Je vous laisse la parole.', 'written', true, 2, 'medium', 'Conduite du changement'),
        (_tpl_id, 7, 'Pilotage par les données', 'Quels indicateurs RH suivez-vous et comment les utilisez-vous pour convaincre la direction d''agir ? À vous.', 'written', true, 2, 'medium', 'Pilotage'),
        (_tpl_id, 8, 'Marque employeur', 'Avez-vous travaillé sur l''expérience collaborateur ou la marque employeur ? Qu''avez-vous mis en place et quels effets avez-vous observés ? Je vous écoute.', 'written', true, 1, 'medium', 'Attractivité'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la conviction RH la plus forte que vous portez, celle qui guide vraiment votre façon de travailler au quotidien ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chef de Produit' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer sur une note sympa : quel est le produit que vous admirez le plus pour sa conception ou son expérience utilisateur, et pourquoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Vision produit', 'Comment construisez-vous une vision produit ? Donnez-nous un exemple concret d''une vision que vous avez définie et comment vous l''avez fait vivre. À vous.', 'written', true, 2, 'deep', 'Vision'),
        (_tpl_id, 2, 'Discovery utilisateur', 'Comment menez-vous la phase de discovery ? Quelles méthodes utilisez-vous pour comprendre vraiment les besoins des utilisateurs ? Je vous laisse.', 'written', true, 2, 'medium', 'Méthode'),
        (_tpl_id, 3, 'Priorisation difficile', 'Racontez-nous une situation où vous avez dû arbitrer entre plusieurs demandes importantes. Comment avez-vous décidé et communiqué ce choix ? À vous.', 'written', true, 2, 'deep', 'Priorisation'),
        (_tpl_id, 4, 'Collaboration avec les devs', 'Comment travaillez-vous au quotidien avec votre équipe tech ? Comment gérez-vous les tensions entre ambition produit et contraintes techniques ? Je vous écoute.', 'written', true, 2, 'medium', 'Collaboration'),
        (_tpl_id, 5, 'Mesure de l''impact', 'Comment définissez-vous le succès d''une fonctionnalité ? Quels indicateurs utilisez-vous et comment les suivez-vous ? À vous.', 'written', true, 2, 'medium', 'Analytics'),
        (_tpl_id, 6, 'Produit ou feature raté(e)', 'Parlez-nous d''une fonctionnalité qui n''a pas fonctionné comme prévu. Qu''est-ce qui s''est passé et qu''avez-vous retenu ? Je vous laisse la parole.', 'written', true, 2, 'medium', 'Retour d''expérience'),
        (_tpl_id, 7, 'Gestion des parties prenantes', 'Comment gérez-vous des parties prenantes internes avec des attentes contradictoires sur la roadmap ? À vous.', 'written', true, 2, 'medium', 'Stakeholders'),
        (_tpl_id, 8, 'Lancement produit', 'Décrivez-nous un lancement produit que vous avez piloté. Comment avez-vous coordonné les équipes ? Je vous écoute.', 'written', true, 1, 'medium', 'GTM'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous pouviez construire un produit from scratch chez nous demain matin, quel problème aimeriez-vous résoudre en premier et pourquoi ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');
    END IF;
  END LOOP;
END;
$function$;