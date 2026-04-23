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
      ('Chef de Produit', 'Modèle d''entretien pour un Product Manager : vision produit, discovery, priorisation, collaboration tech et mesure d''impact.', 'Produit', 'Chef de produit', 35),
      ('Gestionnaire de paie', 'Modèle d''entretien pour un gestionnaire de paie : maîtrise du cycle de paie, conformité légale, rigueur et relation salariés.', 'Finance', 'Gestionnaire de paie', 30),
      ('Contrôleur de gestion', 'Modèle d''entretien pour un contrôleur de gestion : pilotage de la performance, reporting, business partnering et maîtrise des outils.', 'Finance', 'Contrôleur de gestion', 35),
      ('Analyste financier', 'Modèle d''entretien pour un analyste financier : modélisation, analyse de performance, valorisation et restitution.', 'Finance', 'Analyste financier', 35),
      ('Chargé de recouvrement', 'Modèle d''entretien pour un chargé de recouvrement : techniques de relance, négociation, maintien de la relation client et procédures contentieuses.', 'Finance', 'Chargé de recouvrement', 30),
      ('Trésorier', 'Modèle d''entretien pour un trésorier : gestion des liquidités, prévisions, financement et relations bancaires.', 'Finance', 'Trésorier', 35),
      ('Responsable budgétaire', 'Modèle d''entretien pour un responsable budgétaire : pilotage du process budgétaire, animation, dialogue de gestion et arbitrages.', 'Finance', 'Responsable budgétaire', 35),
      ('Juriste', 'Modèle d''entretien pour un juriste d''entreprise : conseil aux opérationnels, rédaction, négociation et gestion du risque.', 'Juridique', 'Juriste', 35),
      ('Compliance Officer', 'Modèle d''entretien pour un compliance officer : programme de conformité, anti-corruption, KYC, formation et culture éthique.', 'Juridique', 'Compliance Officer', 35),
      ('Assistant juridique', 'Modèle d''entretien pour un assistant juridique : organisation, suivi de dossiers, relation cabinets et fiabilité administrative.', 'Juridique', 'Assistant juridique', 30),
      ('Responsable contrats', 'Modèle d''entretien pour un responsable contrats : rédaction, négociation, contract management et pilotage du cycle de vie.', 'Juridique', 'Responsable contrats', 35),
      ('Account Manager', 'Modèle d''entretien pour un Account Manager : développement de portefeuille, fidélisation, upsell et relation de confiance.', 'Commercial', 'Account Manager', 30),
      ('Chargé d''affaires', 'Modèle d''entretien pour un chargé d''affaires : développement business, pilotage de projet, négociation et rentabilité.', 'Commercial', 'Chargé d''affaires', 35),
      ('Customer Success', 'Modèle d''entretien pour un Customer Success Manager : adoption produit, retention, expansion et voix du client.', 'Commercial', 'Customer Success Manager', 30),
      ('Administration des ventes', 'Modèle d''entretien pour un ADV : gestion des commandes, facturation, rigueur, relation clients et coordination interne.', 'Commercial', 'Administration des ventes', 30),
      ('Responsable grands comptes', 'Modèle d''entretien pour un Key Account Manager : stratégie de compte, multi-interlocuteurs, négociation à haut niveau et plan stratégique.', 'Commercial', 'Responsable grands comptes', 35),
      ('Chargé de développement', 'Modèle d''entretien pour un chargé de développement commercial : prospection, ouverture de marchés, networking et création de pipeline.', 'Commercial', 'Chargé de développement', 30),
      ('Chef de projet marketing', 'Modèle d''entretien pour un chef de projet marketing : pilotage de campagnes, coordination, analyse de performance et créativité.', 'Marketing', 'Chef de projet marketing', 35),
      ('Chargé de communication', 'Modèle d''entretien pour un chargé de communication : stratégie éditoriale, canaux, prise de parole et image.', 'Marketing', 'Chargé de communication', 30),
      ('Traffic Manager', 'Modèle d''entretien pour un traffic manager : pilotage de campagnes payantes, optimisation, ROI et reporting.', 'Marketing', 'Traffic Manager', 35),
      ('Brand Content', 'Modèle d''entretien pour un responsable brand content : storytelling, ligne éditoriale, formats et incarnation de la marque.', 'Marketing', 'Brand Content Manager', 30),
      ('Chargé de mission', 'Modèle d''entretien pour un chargé de mission : transversalité, conduite de projet, capacité d''analyse et autonomie.', 'Support', 'Chargé de mission', 30),
      ('Coordinateur de projets', 'Modèle d''entretien pour un coordinateur de projets : planification, suivi, communication transverse et résolution de blocages.', 'Support', 'Coordinateur de projets', 30),
      ('Assistant de direction', 'Modèle d''entretien pour un assistant de direction : organisation, anticipation, confidentialité et bras droit du dirigeant.', 'Support', 'Assistant de direction', 30),
      ('Responsable planning', 'Modèle d''entretien pour un responsable planning : ordonnancement, optimisation des ressources, gestion des aléas et communication terrain.', 'Support', 'Responsable planning', 30)
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

    ELSIF _seed.name = 'Gestionnaire de paie' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer en douceur : qu''est-ce qui vous plaît le plus dans le métier de gestionnaire de paie, malgré son côté parfois ingrat ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Cycle de paie', 'Décrivez-nous votre cycle de paie type, du recueil des éléments variables jusqu''à la DSN. Quelles sont vos étapes clés ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Volume géré', 'Combien de bulletins traitiez-vous par mois, sur combien de conventions collectives ? Comment vous organisiez-vous ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Erreur de paie', 'Avez-vous déjà détecté ou commis une erreur significative sur un bulletin ? Comment l''avez-vous traitée et communiquée au salarié ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Veille juridique', 'Comment restez-vous à jour sur les évolutions légales et conventionnelles ? Donnez-nous un exemple récent qui vous a impacté(e). Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Logiciels de paie', 'Quels logiciels de paie maîtrisez-vous (Silae, Sage, ADP, Cegid…) ? Sur lequel êtes-vous le plus à l''aise et pourquoi ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Cas complexe', 'Racontez-nous le dossier de paie le plus complexe que vous ayez géré : maladie, IJSS, saisie sur salaire, prud''hommes... Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Relation salariés', 'Comment gérez-vous un salarié mécontent qui conteste son bulletin ? Donnez-nous un exemple concret. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Confidentialité', 'La paie, c''est sensible. Comment vivez-vous cette responsabilité de confidentialité au quotidien ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Qu''est-ce qui ferait, selon vous, que nous serions ravis de vous avoir recruté(e) dans six mois ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Contrôleur de gestion' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer simplement : si vous deviez résumer le rôle d''un contrôleur de gestion en une phrase à un opérationnel, vous lui diriez quoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Périmètre actuel', 'Décrivez-nous le périmètre que vous pilotez aujourd''hui : chiffre d''affaires, BU, type de reportings produits. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Construction budgétaire', 'Comment construisez-vous un budget annuel ? Décrivez votre process et votre interaction avec les opérationnels. Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Analyse d''écart', 'Donnez-nous un exemple d''écart budgétaire significatif que vous avez analysé. Quelle était la cause et qu''avez-vous proposé ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Outils & ERP', 'Quels outils utilisez-vous (Excel avancé, SAP, Power BI, Anaplan…) ? Quel est votre niveau réel sur Excel ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Business partnering', 'Comment développez-vous votre rôle de business partner avec les opérationnels qui voient parfois le contrôle de gestion comme une contrainte ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Reporting direction', 'Quels sont les indicateurs clés que vous présentez à un comité de direction et comment structurez-vous votre reporting ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Recommandation impactante', 'Avez-vous déjà fait une recommandation qui a vraiment changé une décision business ? Racontez-nous. À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Automatisation', 'Avez-vous déjà automatisé ou amélioré significativement un process de reporting ? Qu''avez-vous mis en place ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous rejoignez l''équipe, quelle est la première analyse que vous aimeriez creuser pour mieux comprendre notre business ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Analyste financier' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : quelle est l''entreprise cotée que vous suivez avec le plus d''intérêt en ce moment, et pourquoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type d''analyse', 'Quel type d''analyse financière pratiquez-vous : crédit, equity, M&A, FP&A ? Décrivez vos missions concrètes. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Modélisation', 'Décrivez-nous le modèle financier le plus complexe que vous ayez construit. Sur quoi portait-il et comment l''avez-vous structuré ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Méthodes de valorisation', 'Quelles méthodes de valorisation maîtrisez-vous ? Quand utiliseriez-vous un DCF plutôt qu''une approche par les multiples ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Excel & outils', 'Quel est votre niveau réel en Excel et VBA ? Utilisez-vous d''autres outils comme Python, SQL ou Bloomberg ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Analyse d''une dégradation', 'Donnez-nous un exemple d''analyse où vous avez identifié une dégradation de performance avant les autres. Comment ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Restitution', 'Comment adaptez-vous vos analyses selon le destinataire (CFO, manager opérationnel, comité de direction) ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Veille marché', 'Comment restez-vous informé(e) des évolutions de votre secteur ou des marchés financiers ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Pression & deadlines', 'Le métier d''analyste, c''est des deadlines serrées. Comment gérez-vous la pression sur les pics d''activité ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel sujet financier aimeriez-vous explorer en profondeur si vous rejoignez notre équipe ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chargé de recouvrement' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui vous plaît dans le recouvrement, alors que beaucoup voient ça comme un métier difficile ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Volume & encours', 'Quel volume de dossiers et quel encours gériez-vous ? Sur quel type de clientèle (BtoB, BtoC) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Méthode de relance', 'Décrivez-nous votre stratégie de relance : à quel moment, par quel canal, avec quel ton ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Client difficile', 'Racontez-nous une négociation tendue avec un client de mauvaise foi. Comment avez-vous obtenu un résultat ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Préservation de la relation', 'Comment recouvrez-vous une créance sans détériorer la relation commerciale, surtout sur un client stratégique ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Procédure contentieuse', 'Connaissez-vous les étapes de la procédure contentieuse : mise en demeure, injonction de payer, huissier ? Comment travaillez-vous avec les avocats ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Outils & reporting', 'Quels outils de recouvrement utilisez-vous et quels indicateurs suivez-vous (DSO, taux de recouvrement…) ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Collaboration commerciale', 'Comment gérez-vous la relation avec les commerciaux qui veulent préserver leurs clients ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Résultats chiffrés', 'Quels résultats chiffrés avez-vous obtenus sur votre dernier poste : amélioration du DSO, taux de recouvrement, montants traités ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est votre conviction la plus forte sur ce métier, celle qui guide votre quotidien ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Trésorier' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui vous a attiré vers la trésorerie plutôt qu''une autre fonction finance ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Périmètre géré', 'Décrivez le périmètre de trésorerie que vous gérez : nombre d''entités, devises, volumes quotidiens. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Prévisions de trésorerie', 'Comment construisez-vous vos prévisions à court et moyen terme ? Quelle fiabilité atteignez-vous ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Relations bancaires', 'Comment pilotez-vous vos relations bancaires : nombre de banques, négociation de conditions, RFP ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Couverture de risques', 'Avez-vous mis en place des couvertures de change ou de taux ? Décrivez une situation concrète. Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Financement', 'Avez-vous participé à la mise en place de financements : crédit syndiqué, affacturage, RCF ? Quel a été votre rôle ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'TMS & outils', 'Quel TMS ou outil de trésorerie utilisez-vous ? Quel est votre niveau d''autonomie sur le paramétrage ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Crise de liquidité', 'Avez-vous traversé une période de tension de liquidité ? Comment l''avez-vous gérée ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Cash management', 'Comment optimisez-vous le cash au sein du groupe : cash pooling, netting, conditions de paiement ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous rejoignez la fonction, quel premier chantier vous donnerait envie de vous lever le matin ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Responsable budgétaire' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : qu''est-ce que vous aimez dans le pilotage budgétaire, au-delà des chiffres ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Process budgétaire', 'Décrivez le process budgétaire complet que vous pilotiez : calendrier, étapes, parties prenantes. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Animation des opérationnels', 'Comment animez-vous le dialogue de gestion avec des opérationnels qui n''ont pas toujours envie de jouer le jeu ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Arbitrage difficile', 'Racontez-nous un arbitrage budgétaire difficile : trop de demandes, pas assez de moyens. Comment avez-vous procédé ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Reforecast', 'À quelle fréquence reforecastiez-vous et comment communiquiez-vous les écarts à la direction ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Outils & process', 'Quels outils utilisez-vous : Anaplan, Hyperion, Excel avancé ? Avez-vous déjà fait évoluer un process budgétaire ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Plan stratégique', 'Avez-vous participé à la construction d''un plan stratégique à 3 ou 5 ans ? Quel a été votre rôle ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Pédagogie', 'Comment expliquez-vous la lecture d''un budget à un manager qui n''est pas familier avec les chiffres ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Performance d''équipe', 'Avez-vous managé une équipe budget ? Combien de personnes et quelle a été votre approche ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la qualité que vous pensez apporter à notre fonction finance que d''autres candidats n''auraient pas forcément ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Juriste' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : qu''est-ce qui vous a fait choisir le juridique en entreprise plutôt qu''en cabinet ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Spécialités', 'Quelles sont vos domaines de prédilection : droit des contrats, social, IP, conformité… ? Sur quoi êtes-vous le plus à l''aise ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Conseil aux opérationnels', 'Comment vulgarisez-vous le droit pour des opérationnels qui veulent une réponse claire et rapide ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Dossier complexe', 'Racontez-nous le dossier le plus complexe que vous ayez géré. Quelle a été votre démarche ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Négociation contractuelle', 'Comment menez-vous une négociation contractuelle face à des avocats externes ? Donnez-nous un exemple. Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Gestion du risque', 'Comment évaluez-vous et hiérarchisez-vous les risques juridiques pour la direction ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Veille', 'Comment organisez-vous votre veille juridique pour rester à jour ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Contentieux', 'Avez-vous géré un contentieux significatif ? Quel a été votre rôle et celui des avocats externes ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Dire non', 'Comment vous y prenez-vous quand vous devez dire non à une direction métier qui veut absolument avancer ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la posture que vous aimeriez incarner dans notre direction juridique ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Compliance Officer' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui vous a amené(e) vers la compliance, qui reste un métier assez récent en France ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Programme de conformité', 'Décrivez-nous le programme de conformité que vous avez piloté ou contribué à mettre en place. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Cartographie des risques', 'Comment construisez-vous une cartographie des risques de corruption ou de non-conformité ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Sapin II / FCPA', 'Quelle est votre maîtrise des réglementations clés (Sapin II, FCPA, RGPD, LCB-FT) ? Sur lesquelles êtes-vous le plus à l''aise ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Cas concret', 'Racontez-nous une alerte ou un cas de non-conformité que vous avez géré. Comment avez-vous procédé ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'KYC & due diligence', 'Comment menez-vous une due diligence sur un tiers à risque ? Quels sont vos critères ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Formation & culture', 'Comment créez-vous une vraie culture éthique au-delà du simple e-learning annuel ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Indépendance', 'Comment préservez-vous votre indépendance face à des opérationnels qui voient parfois la compliance comme un frein ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Reporting au comité', 'Comment structurez-vous le reporting compliance vers le comité d''audit ou la direction générale ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est votre conviction profonde sur le rôle de la compliance dans une entreprise comme la nôtre ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Assistant juridique' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : qu''est-ce qui vous plaît dans le fait de travailler dans un environnement juridique ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type d''environnement', 'Avez-vous travaillé en cabinet, en entreprise ou les deux ? Décrivez votre périmètre. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Suivi de dossiers', 'Comment organisez-vous le suivi de plusieurs dizaines de dossiers en parallèle, avec des échéances variées ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Outils', 'Quels outils utilisez-vous : logiciels juridiques (Diligent, Septeo…), GED, Microsoft Office ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Confidentialité', 'Le juridique manipule des informations sensibles. Comment abordez-vous cette responsabilité ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Imprévu', 'Racontez-nous une situation où vous avez sauvé un dossier en gérant un imprévu de dernière minute. À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Relation avocats', 'Comment travaillez-vous avec les avocats externes ? Comment vous adaptez-vous à leur niveau d''exigence ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Rédaction', 'Quel niveau d''autonomie avez-vous sur la rédaction de courriers, contrats simples ou actes ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Polyvalence', 'Vous arrive-t-il de gérer aussi de l''organisationnel, du voyage ou de l''administratif au-delà du juridique ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Qu''est-ce qui ferait, selon vous, que vous seriez un vrai bras droit pour notre équipe ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Responsable contrats' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : pour vous, qu''est-ce qui distingue un bon contrat d''un mauvais contrat, en une phrase ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type de contrats', 'Quels types de contrats avez-vous traités : prestations, achats IT, marchés publics, contrats internationaux ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Négociation', 'Décrivez-nous une négociation contractuelle musclée que vous avez menée. Comment vous y êtes-vous pris(e) ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Clauses sensibles', 'Sur quelles clauses portez-vous le plus d''attention : limitation de responsabilité, propriété intellectuelle, RGPD, garanties ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Contract management', 'Comment pilotez-vous l''exécution d''un contrat dans le temps : revues, avenants, contentieux ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Outils CLM', 'Avez-vous déjà utilisé un outil de Contract Lifecycle Management ? Lequel et avec quel bénéfice ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Templates', 'Avez-vous mis en place ou amélioré des templates contractuels dans une entreprise ? Quel a été l''impact ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Risque & arbitrage', 'Comment arbitrez-vous entre la sécurité juridique et la nécessité commerciale d''avancer vite ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Anglais juridique', 'Quel est votre niveau d''anglais juridique ? Avez-vous négocié en anglais ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel est, selon vous, le piège classique à éviter en contract management dans une entreprise en croissance ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Account Manager' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer en douceur : c''est quoi pour vous un client vraiment fidèle, par opposition à un client juste satisfait ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Portefeuille', 'Décrivez votre portefeuille actuel : nombre de comptes, taille, secteur, ARR ou CA géré. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Onboarding client', 'Comment réussissez-vous les premiers mois d''un nouveau client pour poser une relation durable ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Cas de churn évité', 'Racontez-nous un compte que vous avez sauvé alors qu''il était sur le départ. Qu''avez-vous fait ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Upsell / cross-sell', 'Comment identifiez-vous les opportunités d''upsell sans donner l''impression de pousser à la vente ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Multi-interlocuteurs', 'Comment cartographiez-vous et gérez-vous les multiples interlocuteurs chez un grand compte ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Indicateurs clés', 'Quels indicateurs suivez-vous pour piloter la santé de votre portefeuille (NRR, NPS, satisfaction…) ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Conflit interne', 'Comment gérez-vous un conflit entre les attentes d''un client important et les contraintes internes (produit, support) ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Outils CRM', 'Quels CRM utilisez-vous (Salesforce, HubSpot, Gainsight) et quel niveau d''autonomie avez-vous ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Qu''est-ce que vos meilleurs clients diraient de vous si on les appelait ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chargé d''affaires' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui vous plaît dans le métier de chargé d''affaires, à mi-chemin entre commerce et gestion de projet ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Périmètre & secteur', 'Décrivez votre périmètre actuel : type de clientèle, taille des affaires, secteur (BTP, industrie, services). À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Cycle de vente', 'Décrivez votre cycle de vente type, de la détection à la signature, sur une affaire récente. Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Réponse à appel d''offres', 'Comment construisez-vous une réponse à appel d''offres compétitive ? Quel est votre rôle dans le chiffrage ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Pilotage de marge', 'Comment pilotez-vous la marge sur une affaire de A à Z ? Avez-vous déjà sauvé une affaire qui partait en perte ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Relation technique', 'Comment travaillez-vous avec les équipes techniques ou de production qui doivent livrer ce que vous vendez ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Négociation client', 'Racontez-nous une négociation où vous avez tenu vos prix face à un client qui poussait fort. Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Affaire perdue', 'Parlez-nous d''une affaire importante perdue. Qu''avez-vous compris et changé ensuite ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Résultats', 'Quels résultats chiffrés sur les deux dernières années : CA généré, taux de transformation, marge ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle affaire rêveriez-vous de signer pour nous dans votre première année ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Customer Success' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : c''est quoi un succès client réussi pour vous, en une phrase ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Définition du rôle', 'Comment définiriez-vous le rôle d''un Customer Success, par rapport à un account manager ou un support ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Onboarding', 'Décrivez votre process d''onboarding pour amener rapidement un client à la valeur. Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Métriques de santé', 'Comment construisez-vous un health score et qu''en faites-vous concrètement ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Cas de save', 'Racontez-nous un compte que vous avez sauvé d''un churn certain. Quels signaux avez-vous détectés ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Expansion', 'Comment générez-vous de l''expansion sans empiéter sur le rôle des sales ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Voix du client', 'Comment remontez-vous la voix du client en interne, notamment vers le produit ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'QBR', 'Comment préparez-vous et animez-vous une Quarterly Business Review avec un client stratégique ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Outils', 'Quels outils CS utilisez-vous (Gainsight, Planhat, ChurnZero, HubSpot) ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la conviction qui guide votre approche du customer success au quotidien ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Administration des ventes' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui vous plaît dans l''ADV, qui est souvent le maillon invisible mais essentiel ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Volume', 'Quel volume de commandes ou de factures traitiez-vous, sur quel type de clientèle ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Process commande-facture', 'Décrivez le cycle complet, de la prise de commande à l''encaissement. Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Outils ERP', 'Quels ERP avez-vous pratiqués (SAP, Sage, Oracle) ? Quel est votre niveau d''autonomie ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Litige client', 'Racontez-nous un litige client important que vous avez résolu. Comment ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Rigueur & contrôle', 'Comment vous assurez-vous de la fiabilité de vos saisies dans un contexte de gros volumes ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Relation commerciale', 'Comment gérez-vous des commerciaux pressés qui veulent que vous priorisiez leurs clients ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Amélioration de process', 'Avez-vous déjà proposé une amélioration concrète d''un process ADV ? Qu''avez-vous obtenu ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Pic d''activité', 'Comment gérez-vous les pics d''activité (fin de mois, fin d''année) ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la qualité indispensable selon vous pour réussir en ADV ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Responsable grands comptes' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : qu''est-ce qui change vraiment, dans la posture, entre vendre à un grand compte et à une PME ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Portefeuille', 'Décrivez vos comptes actuels : noms (si vous pouvez), CA, complexité, durée de la relation. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Account plan', 'Comment structurez-vous un plan stratégique de compte sur 12 ou 24 mois ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Cartographie', 'Comment cartographiez-vous les décideurs, sponsors, détracteurs sur un grand compte complexe ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Négociation cadre', 'Avez-vous négocié un accord-cadre ou un contrat-cadre ? Racontez-nous les enjeux et le déroulé. Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'C-level', 'Comment construisez-vous une relation au niveau C-level chez vos clients ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Coordination interne', 'Comment coordonnez-vous les équipes internes (technique, juridique, finance, marketing) autour d''un compte ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Compte perdu', 'Avez-vous déjà perdu un compte stratégique ? Qu''en avez-vous retenu ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Croissance d''un compte', 'Donnez-nous un exemple de compte que vous avez fait significativement grossir. Comment ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous rejoignez l''équipe, quel grand compte aimeriez-vous attaquer en priorité ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chargé de développement' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : la prospection, c''est aimer ou détester. Vous, c''est quoi votre rapport à la prospection ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Mission de développement', 'Décrivez votre mission de développement actuelle : marché, cible, objectifs. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Stratégie de prospection', 'Quelle est votre stratégie de prospection ? Quels canaux fonctionnent le mieux pour vous ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Cold call & cold email', 'Quelle est votre approche du cold outreach ? Quel taux de réponse obtenez-vous ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Réseau & événements', 'Comment exploitez-vous le networking, les salons, ou LinkedIn pour générer des opportunités ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Premier client conquis', 'Racontez-nous comment vous avez décroché un premier client emblématique. Quelle a été votre démarche ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Persévérance', 'La prospection, c''est beaucoup de non. Comment maintenez-vous votre énergie et votre motivation ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Outils & data', 'Quels outils utilisez-vous pour structurer votre prospection (Sales Nav, Lemlist, Apollo, CRM) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Résultats', 'Quels résultats chiffrés avez-vous générés : RDV pris, opportunités créées, CA new business ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel marché ou type de cible vous donnerait envie de tout casser chez nous ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chef de projet marketing' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : quelle est la dernière campagne marketing que vous avez vue et qui vous a vraiment bluffé(e) ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type de projets', 'Quels types de projets marketing avez-vous pilotés : produit, BtoB, BtoC, lancement, branding ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Méthode de gestion', 'Décrivez votre méthode de gestion d''un projet marketing complexe, de la note de cadrage à la mesure d''impact. Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Lancement marquant', 'Racontez-nous un lancement marquant que vous avez piloté. Quel était l''enjeu et le résultat ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Coordination agences', 'Comment travaillez-vous avec des agences externes (créa, média, RP) ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Mesure de performance', 'Quels KPIs suivez-vous et comment justifiez-vous le ROI marketing à votre direction ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Crise / projet en difficulté', 'Avez-vous eu un projet qui partait dans le mur ? Comment l''avez-vous remis sur les rails ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Outils', 'Quels outils utilisez-vous au quotidien : gestion de projet, marketing automation, analytics ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Créativité & process', 'Comment trouvez-vous l''équilibre entre créativité et rigueur de pilotage ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel projet marketing rêveriez-vous de mener chez nous dans votre première année ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chargé de communication' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : quelle marque, à votre goût, communique vraiment bien aujourd''hui, et pourquoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type de communication', 'Quels types de communication avez-vous pratiqués : interne, externe, RP, digital, événementiel ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Stratégie éditoriale', 'Comment construisez-vous une ligne éditoriale qui soit cohérente et incarnée ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Canaux digitaux', 'Quels réseaux sociaux gérez-vous concrètement et avec quels résultats : LinkedIn, Instagram, X, TikTok ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Crise de com', 'Avez-vous géré une situation de bad buzz ou de communication sensible ? Comment ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Production de contenu', 'Êtes-vous à l''aise pour rédiger vous-même : posts, articles, communiqués, scripts vidéo ? Donnez-nous un exemple. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Coordination interne', 'Comment travaillez-vous avec les équipes internes pour récolter de l''info et faire émerger des contenus ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Mesure d''impact', 'Quels indicateurs de communication suivez-vous et comment les présentez-vous ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Tendances', 'Comment faites-vous votre veille pour rester à jour sur les tendances et formats ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel angle de communication aimeriez-vous explorer chez nous ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Traffic Manager' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : c''est quoi pour vous une campagne paid réussie, au-delà du simple ROAS ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Régies maîtrisées', 'Quelles régies maîtrisez-vous : Google Ads, Meta, LinkedIn Ads, TikTok, programmatique ? Sur lesquelles êtes-vous le plus expert(e) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Budget géré', 'Quel budget mensuel ou annuel pilotiez-vous, sur quelle typologie de produits ou services ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Stratégie de campagne', 'Comment construisez-vous une stratégie de campagne en partant d''un objectif business ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Optimisation', 'Donnez-nous un exemple d''optimisation qui a vraiment fait basculer la performance d''une campagne. Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Tracking & attribution', 'Comment gérez-vous le tracking, les modèles d''attribution et les questions liées au cookieless ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Tests & itérations', 'Quel est votre approche du A/B testing et de l''itération continue ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Reporting', 'Comment structurez-vous vos reportings pour qu''ils soient lisibles par des non-experts ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Collaboration créa', 'Comment travaillez-vous avec les équipes créa pour produire des assets performants ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quelle est la prochaine grande tendance paid qui vous excite le plus ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Brand Content' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : quel contenu de marque vous a profondément marqué(e), et pourquoi ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Vision du brand content', 'Comment définissez-vous le brand content par rapport à la communication classique ou à la pub ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Stratégie éditoriale', 'Comment construisez-vous une plateforme et une ligne éditoriale alignées avec la stratégie de marque ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Formats préférés', 'Quels formats avez-vous produits : long form, vidéo, podcast, série, social ? Sur lesquels êtes-vous le plus à l''aise ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Storytelling', 'Racontez-nous une campagne de storytelling dont vous êtes particulièrement fier ou fière. Pourquoi ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Production', 'Comment pilotez-vous une production : agence, freelance, équipe interne ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Mesure de l''impact', 'Comment mesurez-vous l''impact d''un contenu de marque, au-delà des vues ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Cohérence vs créativité', 'Comment trouvez-vous l''équilibre entre cohérence de marque et liberté créative ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 8, 'Influence', 'Comment intégrez-vous les créateurs ou influenceurs dans une stratégie brand content ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Si vous deviez incarner notre marque en un type de contenu, ce serait quoi ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Chargé de mission' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour briser la glace : c''est un métier souvent flou pour l''extérieur. Comment expliquez-vous votre métier à un proche ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type de missions', 'Décrivez les missions transverses que vous avez menées : sujet, durée, périmètre. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Cadrage', 'Comment cadrez-vous une mission floue qu''on vous confie avec un brief minimaliste ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 3, 'Analyse & synthèse', 'Comment construisez-vous une note de synthèse qui aide vraiment à la décision ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Mission complexe', 'Racontez-nous la mission la plus complexe que vous ayez portée. Comment l''avez-vous structurée ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Stakeholders multiples', 'Comment gérez-vous des parties prenantes nombreuses avec des intérêts contradictoires ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Sans autorité hiérarchique', 'Comment faites-vous avancer un sujet sans avoir d''autorité hiérarchique sur les contributeurs ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Outils', 'Quels outils utilisez-vous pour piloter une mission : Notion, Trello, Office, ou autre ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Restitution', 'Comment adaptez-vous votre restitution selon que vous parlez à un opérationnel ou à un dirigeant ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel type de mission rêveriez-vous de mener chez nous dans votre première année ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Coordinateur de projets' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer : qu''est-ce qui distingue, pour vous, un bon coordinateur d''un mauvais coordinateur ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Projets gérés', 'Décrivez les projets que vous avez coordonnés : nombre en parallèle, taille d''équipe, secteur. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Méthodologie', 'Travaillez-vous plutôt en mode classique, agile, ou hybride ? Quelle méthode vous correspond le mieux ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Outils', 'Quels outils utilisez-vous : MS Project, Jira, Asana, Monday, Notion ? Sur lesquels êtes-vous expert(e) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 4, 'Projet en retard', 'Racontez-nous un projet qui dérapait. Comment l''avez-vous remis sur les rails ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Gestion des conflits', 'Comment gérez-vous un conflit entre deux contributeurs clés du projet ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Communication', 'Comment structurez-vous vos rituels et votre communication projet (comités, reportings, dashboards) ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Stakeholders', 'Comment gérez-vous les attentes parfois divergentes des sponsors et des opérationnels ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Bilan & retours d''expérience', 'Faites-vous des retours d''expérience à la fin de vos projets ? Qu''en faites-vous ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel projet vous donnerait envie de vous lever le matin si vous nous rejoigniez ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Assistant de direction' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour commencer en douceur : c''est quoi, pour vous, le secret d''un super binôme assistant-dirigeant ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Profil de dirigeant', 'Quels profils de dirigeants avez-vous accompagnés ? Décrivez celui avec qui ça collait le mieux. À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Gestion d''agenda', 'Comment gérez-vous un agenda ultra dense avec des arbitrages permanents ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Anticipation', 'Donnez-nous un exemple où vous avez vraiment anticipé un besoin de votre dirigeant avant qu''il ne le formule. À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Confidentialité', 'Vous accédez à des informations très sensibles. Comment vivez-vous cette responsabilité ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 5, 'Voyages & événements', 'Avez-vous organisé des déplacements complexes ou des événements (séminaire, board, déjeuner client) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 6, 'Gestion d''imprévus', 'Racontez-nous un imprévu majeur que vous avez géré seul(e). Comment ? Je vous laisse.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 7, 'Outils', 'Quels outils maîtrisez-vous : suite Office, Google Workspace, outils collaboratifs, gestion de notes de frais ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Filtre & priorisation', 'Comment filtrez-vous les sollicitations qui arrivent vers votre dirigeant ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Qu''est-ce qui ferait, selon vous, qu''on serait ravis dans six mois de vous avoir choisi(e) ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    ELSIF _seed.name = 'Responsable planning' THEN
      INSERT INTO public.interview_template_questions (template_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level, category) VALUES
        (_tpl_id, 0, '✨ Brise-glace', 'Pour démarrer : qu''est-ce qui vous a attiré vers le métier de planification, qui demande beaucoup de rigueur ? Je vous écoute.', 'written', true, 1, 'light', 'Intro'),
        (_tpl_id, 1, 'Type de planning', 'Quel type de planning gériez-vous : production, terrain, équipes, transports, projets ? Sur quel volume ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 2, 'Outils', 'Quels outils de planification maîtrisez-vous : Excel avancé, logiciels métier, ERP, GMAO ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 3, 'Optimisation', 'Comment optimisez-vous l''allocation des ressources sous contraintes (compétences, lois sociales, géographie) ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 4, 'Aléa majeur', 'Racontez-nous une journée où tout a dérapé. Comment avez-vous reconstruit le planning en urgence ? Je vous écoute.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 5, 'Communication terrain', 'Comment communiquez-vous des changements de planning à des équipes terrain qui n''aiment pas être bousculées ? À vous.', 'written', true, 2, 'deep', 'Métier'),
        (_tpl_id, 6, 'Indicateurs', 'Quels indicateurs suivez-vous pour piloter la performance de votre planning ? Je vous laisse.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 7, 'Réglementation', 'Comment intégrez-vous les contraintes légales (temps de travail, repos, pauses, conventions) ? À vous.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 8, 'Anticipation', 'Comment travaillez-vous l''anticipation pour limiter le mode pompier ? Je vous écoute.', 'written', true, 2, 'medium', 'Métier'),
        (_tpl_id, 9, '🎯 Mot de la fin', 'Quel premier chantier d''optimisation aimeriez-vous porter chez nous ? La parole est à vous.', 'written', true, 1, 'light', 'Closing');

    END IF;
  END LOOP;
END;
$function$;

DO $$
DECLARE _org RECORD;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations WHERE owner_id IS NOT NULL LOOP
    PERFORM public.seed_default_interview_templates(_org.id, _org.owner_id);
  END LOOP;
END $$;