# Fiabiliser le Profil Interw avec trois questions recommandées

## Les trois questions proposées

Ces questions sont conçues pour faire raconter des comportements passés plutôt que demander au candidat de se décrire. Elles sont assez ouvertes pour éviter de révéler les huit profils attendus.

### 1. Agir et entraîner

> Racontez une situation où vous deviez atteindre un objectif difficile avec d’autres personnes. Quel était le contexte, quel rôle avez-vous réellement pris, qu’avez-vous fait concrètement et quel résultat avez-vous obtenu ?

**Profils principalement observés :** Leader, Team player, Battant, Empathique.

**Ce que la réponse permet de distinguer :** prise de décision ou coopération, recherche de résultat, place donnée aux autres, gestion des désaccords et résultat concret.

### 2. Résoudre autrement et décider

> Parlez-nous d’un problème complexe ou inhabituel que vous avez dû résoudre. Comment avez-vous analysé la situation, quelles options avez-vous envisagées, qu’avez-vous choisi et pourquoi ?

**Profils principalement observés :** Analytique, Créatif, Exécutant fiable, Leader.

**Ce que la réponse permet de distinguer :** raisonnement fondé sur des faits, génération d’idées, méthode d’exécution et capacité à trancher.

### 3. Faire face au changement

> Décrivez un changement important, un imprévu ou un échec qui a bouleversé votre manière de travailler. Comment avez-vous réagi, qu’avez-vous adapté, comment avez-vous impliqué les autres et qu’en avez-vous appris ?

**Profils principalement observés :** Adaptable, Battant, Empathique, Team player, Exécutant fiable.

**Ce que la réponse permet de distinguer :** vitesse d’adaptation, persévérance, attention aux personnes, coopération et remise en ordre de l’action.

Les trois questions se recouvrent volontairement : aucun profil ne dépend d’une seule réponse et les incohérences peuvent être repérées.

## Création d’un nouveau poste

- Ajouter sous les questions habituelles un bloc séparé nommé **« Questions Profil Interw — recommandées »**.
- Y placer automatiquement ces trois questions pour chaque nouveau poste.
- Permettre au recruteur de modifier leur formulation, leur ordre ou de les supprimer.
- Expliquer sobrement qu’elles servent à rendre le diagramme plus fiable.
- Ne rien ajouter aux postes déjà créés.
- Lorsqu’une session type est appliquée pendant la création, conserver ce bloc séparé au lieu de confondre ces questions avec celles du poste.

## Identification fiable des réponses

- Marquer ces questions dans les données comme questions Profil Interw, au lieu de les reconnaître à partir de leur texte ou de leur position.
- Conserver ce marquage lorsque la question est modifiée, réordonnée ou enregistrée dans une session type.
- Rattacher chaque réponse à sa question grâce à son identifiant existant.
- Les suppressions restent autorisées : le calcul sait fonctionner avec deux, une ou aucune question dédiée.

## Nouveau calcul

### Priorité des sources

1. Les réponses aux trois questions Profil Interw constituent les preuves principales.
2. Le reste de l’entretien peut confirmer ou nuancer un profil, mais ne peut pas compenser seul une absence totale de preuve dans les questions prioritaires.
3. Le CV, le visage, la voix, l’accent, le débit, le Fit Poste, la matrice et les critères métier restent exclus.

### Règles mesurables

Pour chaque profil, le modèle devra produire séparément :

- les indices favorables observés ;
- les indices contraires observés ;
- les questions dédiées réellement exploitables ;
- une ou deux citations exactes ;
- un niveau de confiance ;
- une note de 0 à 100, ou **« Non évalué »**.

Le serveur vérifiera ensuite :

- que chaque citation existe réellement, mot pour mot, dans la réponse indiquée ;
- qu’elle provient du candidat et de la bonne session ;
- qu’une preuve principale vient bien d’une question Profil Interw ;
- que les huit profils sont présents dans la réponse structurée ;
- que les notes sont comprises entre 0 et 100.

Sans preuve principale suffisante, le profil sera **Non évalué**, et non ramené artificiellement à 0 ou 50.

### Stabilisation

- Utiliser une seule consigne versionnée, avec des repères explicites pour les niveaux faible, moyen et fort de chaque profil.
- Demander au modèle une sortie strictement structurée, puis refuser toute sortie incomplète ou incohérente.
- Effectuer une seconde vérification indépendante des notes et des citations avant enregistrement.
- Si la vérification échoue, afficher le profil comme indisponible plutôt que sauvegarder un résultat douteux.
- Enregistrer la version de la méthode et les contrôles passés avec le diagramme, afin de savoir exactement comment chaque résultat a été produit.

## Affichage du diagramme

- Afficher les secteurs sans preuve suffisante en gris avec le libellé **« Non évalué »**.
- Exclure ces secteurs du classement dominant/secondaire et de la moyenne du poste.
- Ne déclarer un profil dominant et secondaire que si suffisamment de profils sont réellement évalués.
- Conserver la règle actuelle : profil net seulement si l’écart est strictement supérieur à 15 points ; sinon profil hybride.
- Dans le détail, montrer pour chaque note les citations validées, la question source et le niveau de confiance.
- Conserver les couleurs, la disposition et la place actuelle de la roue.

## Périmètre historique

- Appliquer la nouvelle méthode uniquement aux rapports générés après sa mise en ligne.
- Ne recalculer aucun diagramme existant.
- Afficher la version de calcul dans le détail pour distinguer clairement ancienne et nouvelle méthode.

## Impact

- **Création de poste :** trois questions supplémentaires sont proposées automatiquement ; le recruteur garde la main pour les modifier ou les supprimer.
- **Durée candidat :** si les trois questions sont conservées, l’entretien sera plus long de trois réponses. C’est le principal impact candidat.
- **Rapport :** le diagramme pourra comporter des secteurs « Non évalué », ce qui est volontaire et plus honnête qu’une estimation sans preuve.
- **Délai et coût :** la double vérification ajoute un appel d’analyse et peut retarder légèrement l’apparition du diagramme, sans bloquer le rapport principal.
- **Scoring existant :** aucun changement du Fit Poste, de la matrice, des critères pondérés, de la transcription, de la recommandation ou des autres analyses.
- **Anciens postes et rapports :** aucun changement automatique.
- **Risque de casse : faible à modéré**, car la création et les modèles de poste sont concernés. Les garde-fous portent surtout sur la conservation des questions lors d’une modification, duplication ou application de modèle.

## Vérifications après réalisation

- Tests unitaires : citations exactes, profil non évalué, classement, seuil de 15 points, version du calcul et exclusion des valeurs absentes.
- Vérifier la création, la modification, la suppression, le déplacement et l’enregistrement des trois questions.
- Vérifier qu’un nouveau poste les reçoit et qu’un poste existant ne change pas.
- Vérifier un rapport avec réponses solides, un avec réponse vague et un avec question passée.
- Exécuter le test de bout en bout candidat : accéder au poste, répondre aux trois questions et terminer la session.
- Exécuter ensuite le test de bout en bout recruteur : créer le poste, modifier une question, ouvrir le rapport, contrôler la roue, les mentions « Non évalué » et les citations.
- Signaler explicitement si le test candidat reste bloqué par la configuration automatisée actuellement manquante ; ne pas annoncer la validation sans preuve.
