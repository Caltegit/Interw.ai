# Réparer les liens de première connexion

## Diagnostic confirmé

- L’e-mail a bien été envoyé deux fois à `lea@tango.fr` et le domaine d’envoi est opérationnel.
- Le bouton contient actuellement le lien d’authentification natif, à usage unique. Le serveur de messagerie l’a ouvert automatiquement avant Léa : son compte a été confirmé **8 secondes après le premier envoi**, puis le second lien a été consommé **5 secondes après son envoi**.
- La page intermédiaire « Confirmer ma connexion » arrive trop tard : le lien à usage unique a déjà été consommé. Elle attend en plus un jeton qui n’est pas transmis par l’adresse actuelle, ce qui explique le bouton gris et non cliquable visible sur la capture.
- Le même signal apparaît sur une autre organisation créée récemment. Le défaut peut donc concerner les nouveaux propriétaires dont la messagerie analyse automatiquement les liens.

## Correction

1. **Rendre les liens résistants aux filtres de messagerie**
   - Dans l’e-mail, remplacer le lien d’authentification direct par une adresse Interw neutre vers la page de confirmation.
   - Transmettre à cette page le jeton nécessaire, sans le consommer lors du simple affichage de l’e-mail.
   - Le jeton ne sera validé qu’après le clic humain sur « Me connecter ».
   - Appliquer ce mécanisme aux invitations, liens de connexion, confirmations d’adresse, changements d’adresse et réinitialisations par lien.

2. **Sécuriser la page de confirmation**
   - Garder le bouton actif uniquement quand les paramètres nécessaires sont présents.
   - Si une session valide existe déjà, envoyer directement la personne vers son tableau de bord.
   - Sinon, afficher une erreur claire avec la possibilité de demander un nouveau lien, plutôt qu’un bouton gris sans explication.

3. **Harmoniser les e-mails concernés**
   - Passer les textes encore en anglais en français.
   - Conserver le style Interw et afficher également l’adresse complète en secours sous le bouton.

4. **Déployer et vérifier**
   - Déployer la nouvelle version des e-mails d’authentification.
   - Vérifier que l’ouverture automatique de l’adresse Interw ne confirme pas le compte.
   - Vérifier qu’un clic sur « Me connecter » confirme réellement le lien puis ouvre le tableau de bord.
   - Envoyer un nouveau lien fonctionnel à Léa après le déploiement ; les anciens liens déjà consommés resteront inutilisables.

## Résultat attendu

Les futurs propriétaires reçoivent un e-mail entièrement en français. Les protections de Gmail, Outlook ou des messageries d’entreprise peuvent analyser le lien sans le consommer ; seule l’action sur la page Interw valide la connexion.
