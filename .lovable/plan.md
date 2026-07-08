Je vais limiter la correction aux endroits où l’interface annonce ou attend encore un code à 8 chiffres.

1. Mettre à jour l’écran « mot de passe oublié »
   - Remplacer les textes « code à 8 chiffres » par « code à 6 chiffres ».
   - Garder le même fonctionnement d’envoi du code.

2. Mettre à jour l’écran de saisie du code
   - Limiter le champ OTP à 6 cases.
   - Supprimer les 2 cases en trop.
   - Valider uniquement quand 6 chiffres sont saisis.
   - Corriger les messages d’erreur et descriptions.

3. Vérifier qu’il ne reste aucune mention utilisateur de « 8 chiffres » dans le parcours de réinitialisation.

4. Tester dans l’aperçu
   - Vérifier visuellement l’écran `/reset-password`.
   - Vérifier que le formulaire affiche bien 6 cases et que le bouton reste désactivé tant que les 6 chiffres ne sont pas saisis.

Note importante : si le backend continue réellement à générer un code de 8 chiffres, l’interface seule ne suffira pas à faire accepter un code de 6 chiffres. Dans ce correctif, je corrige tout ce qui est dans le code applicatif accessible ici ; je vérifierai aussi si une option de configuration backend du code OTP est disponible avant de conclure.