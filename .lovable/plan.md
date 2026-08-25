# Suites du diagnostic d'entonnoir

Trois chantiers, classés par impact mesuré. Chacun est indépendant et publiable séparément.

## Chantier 1 — Arrêter de faire passer un entretien interrompu pour un entretien terminé

Constat : 17 sessions « terminée » sans aucune réponse, 29 « terminée » incomplètes. Elles encombrent la liste des candidats et alimentent des jobs de rapport voués à l'échec.

Ce qui change :
- Une session n'est déclarée terminée que si le candidat a répondu à toutes les questions du projet. Sinon elle est marquée comme abandonnée, avec l'avancement réel (« 1 sur 6 »).
- Aucun rapport n'est produit pour un entretien non abouti — ni maintenant, ni par rattrapage. Les jobs en échec pour ce motif sont annulés.
- Les médias déjà enregistrés sont conservés, ils servent de preuve pour le suivi des anomalies.
- Régularisation des 46 sessions déjà en base concernées.

Choix d'implémentation : pas de nouveau statut dans la base. On réutilise le statut « annulé », déjà géré par tous les écrans, complété par deux colonnes purement informatives (date d'abandon, nombre de réponses). Aucun filtre, badge ou export existant n'est cassé.

## Chantier 2 — Récupérer les abandons de fin de parcours

Constat : 9 candidats à 5 réponses sur 6, 7 candidats à 14 sur 15. Ils ont fait tout l'effort et n'ont pas cliqué sur le bouton final. C'est le décrochage le plus rentable à traiter.

Ce qui change :
- Ces sessions remontent dans le suivi Super Admin comme « quasi terminées », distinctes des abandons précoces.
- Relance possible en un clic via le flux de réinvitation existant, avec un message adapté : il ne reste qu'une question.
- Côté candidat, aucun changement de parcours dans ce chantier.

## Chantier 3 — Combler l'angle mort de l'ouverture du lien

Constat : 674 sessions n'ont jamais produit le moindre fragment, soit 59 % du volume. On ignore si le lien a été ouvert.

Ce chantier implique une écriture dans le parcours candidat — hors du cadre lecture seule actuel. Il ne sera lancé qu'après validation explicite.

Ce qui serait ajouté : un horodatage d'ouverture du lien (colonne déjà présente mais jamais renseignée) et un horodatage de fin d'intro. Deux écritures ponctuelles, sans effet sur le déroulé de l'entretien. Cela permettrait enfin de distinguer « lien jamais ouvert » de « ouvert puis quitté avant la première question », et donc de savoir s'il faut travailler la relance par e-mail ou l'écran d'accueil.

## Détails techniques

- Chantier 1 : migration ajoutant `sessions.abandoned_at` et `sessions.answered_questions_count` ; conditionnement du passage à `completed` dans `finalize-abandoned-session` ; arrêt de la mise en file dans `cleanup-abandoned-sessions` et `backfill-orphan-reports` pour les sessions sans réponse rattachée ; affichage « Abandonné — n/N » dans `SessionStatusBadge`.
- Chantier 2 : extension de `admin_list_recoverable_candidates` avec l'avancement, et filtre dédié dans `AdminCandidatesToRecover`.
- Chantier 3 : écriture de `video_viewed_at` à l'ouverture du lien candidat, plus une colonne de fin d'intro. À valider séparément.
- Vérification pour chaque chantier : contrôle de typage, tests existants, test bout en bout d'un abandon après la question 1, et contrôle en base après régularisation.

## Ordre proposé

Chantier 1 d'abord : il assainit la liste des candidats et arrête les jobs en échec, sans toucher au parcours candidat. Chantier 2 ensuite, à faible risque. Chantier 3 seulement si tu valides une écriture dans le parcours.
