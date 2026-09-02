# Corriger la confirmation d’inscription et la boucle `/bienvenue`

## Diagnostic confirmé

- Le lien de validation n’était pas expiré : le compte `eva.bdanel28@gmail.com` a été confirmé le 2 septembre à 14:14:47, puis connecté à 14:15:16.
- Le message « Invitation expirée » affiché ensuite concerne une ancienne invitation vers ALBO, créée le 24 août et expirée le 31 août. L’écran mélange donc deux événements différents : la validation du nouvel email a réussi, mais une ancienne invitation bloque ensuite l’accueil du compte.
- La page d’accueil redirige actuellement toute personne connectée vers `/dashboard`. Comme ce nouveau compte n’a pas d’organisation, la protection du tableau de bord le renvoie vers `/bienvenue`. C’est la boucle qui empêche d’accéder à `interw.com`, même en retapant l’adresse.

## Correction proposée

### 1. Rendre la fin d’inscription explicite

- Après validation de l’email, envoyer le nouvel utilisateur vers `/bienvenue` seulement s’il n’a aucune organisation ; s’il est déjà rattaché, l’envoyer directement vers `/dashboard`. Sur `/bienvenue`, afficher son organisation de rattachement en champ grisé non modifiable.
- Sur la page de confirmation, distinguer clairement : confirmation réussie, lien réellement invalide, et lien déjà utilisé.
- Conserver la protection contre les robots qui ouvrent automatiquement les liens reçus par email.

### 2. Ne plus laisser une ancienne invitation bloquer le compte

Sur `/bienvenue`, lorsqu’une invitation expirée est trouvée :

- expliquer qu’elle est indépendante de la création du compte ;
- proposer **« Demander une nouvelle invitation »** pour rejoindre l’organisation concernée ;
- proposer **« Créer ma propre organisation »** pour ignorer définitivement cette ancienne invitation et poursuivre l’inscription normale ;
- enregistrer ce choix côté base afin que l’écran expiré ne réapparaisse pas à chaque connexion.

Une invitation encore valide continuera d’être acceptée automatiquement. Un utilisateur sans invitation conservera directement le formulaire de création d’organisation.

### 3. Toujours permettre de quitter `/bienvenue`

- Rendre le logo Interw cliquable vers la page d’accueil.
- Ajouter une action **« Se déconnecter »** sur cette page.
- Supprimer la redirection automatique de `/` vers le tableau de bord pour les utilisateurs connectés : la page d’accueil restera consultable. Le bouton « Se connecter » deviendra « Mon espace » lorsqu’une session est active.

### 4. Fiabiliser l’état des invitations

- Ajouter une opération sécurisée permettant uniquement à l’utilisateur connecté de classer sa propre invitation expirée comme expirée/ignorée.
- Ne jamais accepter une invitation expirée et ne jamais permettre de modifier celle d’une autre adresse.
- Vérifier que les invitations valides, expirées et déjà acceptées restent correctement distinguées.

## Vérification

1. Créer un nouveau compte sans invitation : validation email → `/bienvenue` → création d’organisation.
2. Rejouer le cas `eva.bdanel28@gmail.com` : la validation est reconnue comme réussie ; l’ancienne invitation ALBO peut être ignorée et ne bloque plus le compte.
3. Tester une invitation valide : rattachement automatique à la bonne organisation.
4. Depuis `/bienvenue`, ouvrir `interw.com` : la landing reste accessible.
5. Tester « Se déconnecter », « Mon espace » et les liens déjà consommés ou réellement expirés.
