# Fiabiliser durablement la lecture des vidéos privées

## Ce qui est vérifié, et ce qui ne l'est pas

Vérifié dans l'historique du projet :

- Le message « Réseau indisponible pour charger la vidéo » et le bouton de réparation existent depuis le 1er juin. Des vidéos noires se produisaient donc déjà avant la correction de sécurité, à cause de fichiers mal enregistrés par certains navigateurs.
- La correction de sécurité du 14 septembre a ajouté une étape nouvelle : un enregistrement n'est plus lisible directement, le lecteur doit obtenir une adresse temporaire valable une heure.
- Sur le cas testé pendant cette analyse, l'autorisation a été accordée et le stockage a répondu correctement. Le passage en privé ne bloque donc pas les vidéos par lui-même.

Non vérifié à ce stade : la part exacte des écrans noirs actuels imputable à la sécurité plutôt qu'aux anciens fichiers défectueux. Les traces disponibles ne distinguent pas encore une adresse expirée d'un fichier illisible. C'est la première étape du plan, avant toute correction.

## Deux défauts réellement nés avec la correction de sécurité

1. **« Réessayer la vidéo » recharge exactement la même adresse**, sans en redemander une valide. Un incident passager devient donc définitif à l'écran.
2. **Aucune adresse n'est renouvelée** quand une fiche reste ouverte, alors que la validité est d'une heure. Toutes les adresses d'une session sont d'ailleurs demandées dès l'ouverture, même pour les vidéos regardées bien plus tard.

S'y ajoute un défaut de lisibilité antérieur : le lecteur affiche « Réseau indisponible » pour des situations différentes (adresse expirée, autorisation refusée, fichier absent, transfert interrompu, coupure réelle), et propose parfois une réparation alors que le fichier est intact.

## Incident confirmé sur la session de Thibault

Les traces du 15 septembre permettent de séparer précisément les étapes :

- Le clic a bien lancé la réparation de la question 1 (`q0.webm`). Le serveur a reconstruit ses 148 fragments et a remplacé le fichier à 07:26:57. Cette étape a donc fonctionné.
- Le nouveau fichier fait environ 10,9 Mo et le stockage le renvoie bien avec un statut 200. L'accès privé n'a pas refusé le fichier.
- L'étape suivante, le ré-encodage exécuté dans le navigateur, n'est jamais arrivée jusqu'à l'enregistrement final : aucun appel à `store-repaired-video` n'apparaît dans les traces. C'est pourquoi l'écran est resté sur « Ré-encodage vidéo… ».
- L'état `recovering` est actuellement global au lecteur, pas rattaché à une question. En changeant de question pendant le traitement de la question 1, le même message et le même indicateur tournant apparaissent donc sur les questions 2 à 6, alors qu'elles ne sont pas en cours de réparation.
- Chaque nouveau clic force à nouveau la reconstruction serveur du même fichier avant de relancer le ré-encodage local. Deux reconstructions de `q0.webm` sont visibles dans les traces, sans réparation finale enregistrée.

Conclusion vérifiée pour cet incident : le stockage privé a bien délivré les vidéos. Le blocage se situe dans l'ancien mécanisme de réparation côté navigateur, et son affichage global donne à tort l'impression que toutes les vidéos sont simultanément réparées.

## Objectif

Conserver le stockage privé, tout en rendant la lecture aussi fiable qu'avant : adresse demandée au moment utile, renouvellement silencieux, reprise automatique, diagnostic exact et réparation réservée aux fichiers réellement défectueux.

## Correction proposée

### 1. Charger uniquement la vidéo demandée

- Ne plus demander les adresses de toutes les réponses à l'ouverture de la fiche.
- Demander une adresse temporaire pour la vidéo courante, juste avant sa lecture.
- Précharger uniquement la suivante afin de garder une navigation fluide.
- Conserver les chemins de stockage comme source de vérité, jamais une ancienne adresse temporaire.

**Bénéfice :** une vidéo regardée tardivement ne démarre plus avec une adresse déjà ancienne.

### 2. Ajouter un véritable renouvellement automatique

- La réponse du serveur expose déjà la durée de validité ; l'utiliser réellement côté lecteur.
- Renouveler l'adresse quelques minutes avant son expiration si la fiche reste ouverte.
- En cas d'erreur de chargement, invalider immédiatement l'adresse conservée, en demander une nouvelle et reprendre la lecture au même instant.
- Limiter cette reprise automatique à une tentative par incident afin d'éviter les boucles.
- Faire de « Réessayer » une vraie nouvelle tentative : nouvelle adresse, nouvelle requête, position de lecture conservée.

**Bénéfice :** aucune action manuelle pour une expiration normale ou une coupure momentanée.

### 3. Séparer les quatre familles d'erreurs

Le lecteur effectuera un contrôle serveur après un échec et classera le problème :

- **adresse expirée ou refusée** : nouvelle autorisation automatique ;
- **fichier absent** : message « Enregistrement introuvable », sans proposer une fausse réparation ;
- **fichier présent mais non décodable** : réparation automatique existante, puis solution audio si disponible ;
- **réseau réellement indisponible** : reprises espacées, puis message clair si la connexion ne revient pas.

Le message générique « Réseau indisponible » ne sera plus utilisé pour toutes les erreurs.

### 4. Remplacer la réparation bloquante par une tâche suivie

- Rattacher l'état de réparation à la question concernée, jamais à tout le lecteur.
- Une seule demande active par fichier : un second clic consulte l'état existant au lieu de reconstruire à nouveau les mêmes fragments.
- Après la reconstruction serveur, vérifier d'abord si le fichier obtenu est désormais décodable avant de lancer un ré-encodage lourd.
- Encadrer le ré-encodage dans le navigateur par une durée maximale, une annulation réelle lors de la fermeture et un message d'échec explicite ; aucun indicateur ne doit tourner indéfiniment.
- Si la personne navigue vers une autre question, continuer ou annuler proprement la tâche de la question initiale, mais ne jamais afficher « Ré-encodage » sur la nouvelle question.
- Après réussite, enregistrer le nouveau fichier, obtenir une nouvelle adresse temporaire et recharger uniquement la question réparée.
- Si la réparation échoue, conserver le fichier source et proposer la lecture audio lorsqu'elle existe ; ne jamais annoncer une réussite avant que le fichier réparé soit enregistré puis relu.
- Rendre l'action visible seulement après confirmation que le fichier est présent mais illisible. Employer un bouton clairement identifiable, avec l'intitulé « Réparer cette vidéo » et l'état de la question concernée.

**Bénéfice :** aucune réparation fantôme sur les autres questions, aucun traitement sans fin et aucune reconstruction répétée du même fichier.

### 5. Rendre le serveur observable

- Journaliser chaque demande d'adresse sans enregistrer le jeton ni l'adresse signée : session, fichier, utilisateur autorisé ou candidat, résultat, durée et motif du refus.
- Ajouter un identifiant de diagnostic renvoyé au lecteur et affichable dans le détail d'une erreur.
- Mesurer séparément : autorisations refusées, fichiers absents, échecs de signature et lectures interrompues après une signature réussie.
- Prévoir une rétention courte et un accès réservé aux administrateurs.

**Bénéfice :** le prochain incident sera attribuable en quelques minutes, sans supposition et sans exposer de donnée sensible.

### 6. Nettoyer les anciennes adresses stockées

Le dépôt privé contient encore des adresses publiques historiques dans les données. Elles sont aujourd'hui converties à la volée.

- Recenser tous les formats réellement présents avant modification.
- Convertir progressivement les adresses d'enregistrements en chemins internes `interviews/<session>/<fichier>`.
- À l'enregistrement d'une nouvelle réponse, sauvegarder directement ce chemin interne au lieu de fabriquer une adresse publique inutilisable.
- Garder temporairement la compatibilité avec les anciennes lignes, puis la retirer seulement après contrôle complet.

**Bénéfice :** une seule représentation stable des fichiers, indépendante du réglage public ou privé.

### 7. Unifier les règles de chemin

- Centraliser la normalisation et la validation des chemins utilisée par le serveur.
- Ajouter des essais de contrat couvrant : chemin moderne, ancienne adresse publique, ancienne adresse signée, caractères encodés, autre session et chemin interdit.
- Ajouter un contrôle automatique empêchant tout nouvel usage d'une adresse publique pour `interviews/`.

**Bénéfice :** une future page ou intégration ne pourra pas contourner par erreur le nouveau mécanisme.

### 8. Couvrir tous les lecteurs

Appliquer le même comportement au lecteur principal, aux extraits, aux temps forts, à l'export et aux rapports partagés. Les rapports partagés conserveront leur propre autorisation ; aucun enregistrement ne deviendra public.

## Ordre de livraison sans interruption

### Étape A — Mesurer avant de changer

1. Ajouter les journaux de diagnostic.
2. Reproduire les cas sur des vidéos récentes et anciennes.
3. Chiffrer les erreurs par catégorie et vérifier les formats historiques en base.

### Étape B — Corriger la lecture

1. Résolution à la demande de la vidéo courante.
2. Renouvellement avant expiration.
3. Nouvelle adresse et reprise au même instant après erreur.
4. Messages exacts et séparation stricte entre reprise réseau et réparation de fichier.
5. État de réparation par question, détection des doublons, délai maximal et issue toujours explicite.

### Étape C — Normaliser sans casser l'historique

1. Les nouveaux enregistrements stockent un chemin interne.
2. Migration progressive des anciennes lignes par lots contrôlés.
3. Compatibilité maintenue pendant la transition.
4. Suppression de la compatibilité uniquement après vérification de l'intégralité des données.

### Étape D — Généraliser et surveiller

1. Étendre le mécanisme aux autres lecteurs et rapports partagés.
2. Ajouter les contrôles automatiques de non-régression.
3. Suivre les taux d'échec pendant plusieurs jours avant de considérer l'incident clos.

## Vérifications obligatoires

- Vidéo récente et vidéo historique sur Chrome, Firefox et Safari.
- Première, dernière et plusieurs vidéos successives d'une même session.
- Fiche laissée ouverte au-delà de la durée d'une adresse temporaire.
- Mise hors ligne puis retour du réseau, avec reprise au même instant.
- Adresse expirée, fichier absent et fichier réellement non décodable : trois comportements distincts.
- Sur la session `5c613bdd-2733-40f8-9a23-c7f241d877fb`, réparer la question 1 puis naviguer : seule la question 1 affiche son avancement et le traitement se termine ou échoue explicitement.
- Double clic et nouvelle tentative sur une même question : une seule reconstruction serveur, sans écrasements répétés.
- Ré-encodage volontairement interrompu ou trop long : arrêt propre, fichier source conservé et bouton de nouvelle tentative disponible.
- Recruteur autorisé, recruteur d'une autre organisation, candidat avec bon ou mauvais jeton, super-administrateur et rapport partagé.
- Téléchargement et export inchangés.
- Stockage toujours privé et ancienne adresse publique toujours refusée.
- Aucun changement du scoring, de la transcription ou des analyses.

## Critères de réussite

- Une expiration ou un incident réseau bref se résout automatiquement, sans écran noir persistant.
- « Réessayer » renouvelle réellement l'accès au lieu de recharger une adresse morte.
- « Réparer » n'apparaît que lorsque le fichier est présent mais réellement illisible.
- Une réparation ne peut jamais rester indéfiniment sur « Ré-encodage vidéo… » ni contaminer visuellement les autres questions.
- Chaque échec restant possède une cause mesurable dans les journaux.
- Aucun lecteur de l'application ne consomme directement une adresse publique d'entretien.
- Les vidéos restent privées pendant toute la correction.

## Périmètre protégé

- Aucun retour du stockage en public.
- Aucun changement du scoring, de la transcription, de l'analyse orale ou non verbale.
- Aucun changement des données des candidats, sauf la normalisation technique progressive des chemins vidéo.
- Le plan séparé sur les entretiens interrompus par un micro trop faible reste en attente et sera repris après cette priorité.
