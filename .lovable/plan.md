# Corriger l’accès au compte par code

## Diagnostic confirmé

- Le compte d’Eva existe bien sous `eva@alboteam.com` et l’adresse du profil correspond à l’adresse de connexion : le changement d’e-mail n’est pas la cause.
- Le clic sur « Renvoyer le code » fonctionne côté envoi : un nouveau code à 6 chiffres a été créé à 17:27 et l’e-mail a bien été accepté pour livraison.
- L’e-mail utilise cependant le mauvais modèle : il attend une adresse de lien, alors que le parcours lui transmet un code. Le code n’est donc jamais affiché et le bouton anglais n’a aucune destination, ce qui le rend inutilisable.

## Correction

1. **Créer un e-mail français dédié au code**
   - Afficher clairement le code à 6 chiffres.
   - Préciser qu’il expire après 15 minutes.
   - Retirer le bouton, puisqu’aucun clic n’est nécessaire dans ce parcours.

2. **Séparer les deux usages**
   - Utiliser ce nouveau modèle uniquement pour « Renvoyer le code ».
   - Conserver le modèle à lien pour les véritables demandes de réinitialisation par lien, mais le traduire entièrement en français et vérifier que son bouton contient toujours une adresse valide.

3. **Sécuriser le rendu**
   - Rendre obligatoire la donnée attendue par chaque modèle afin qu’un e-mail avec un code absent ou un bouton vide ne puisse plus être produit.
   - Conserver le message neutre à l’écran pour ne pas révéler si une adresse possède un compte.

4. **Déployer et vérifier le parcours complet**
   - Déployer les deux fonctions d’e-mail concernées.
   - Tester le rendu de l’e-mail, puis un vrai renvoi vers `eva@alboteam.com`.
   - Vérifier que le code reçu permet bien d’ouvrir la session et d’accéder au tableau de bord.

## Résultat attendu

En cliquant sur « Renvoyer le code », Eva reçoit un e-mail en français contenant directement six chiffres, les saisit sur la page déjà ouverte, puis retrouve l’accès à son compte.
