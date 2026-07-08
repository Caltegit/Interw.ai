Objectif : garantir que le parcours de réinitialisation utilise réellement un code à 6 chiffres, côté backend comme côté interface.

## Plan

1. **Remplacer la dépendance au code natif actuel**
   - Ne plus utiliser le code de réinitialisation généré automatiquement s’il n’est pas configurable à 6 chiffres.
   - Mettre en place un flux backend maîtrisé qui génère toujours un code numérique de 6 chiffres.

2. **Créer le flux backend sécurisé**
   - Ajouter une table dédiée aux codes de réinitialisation avec : email normalisé, utilisateur lié, code haché, expiration, nombre d’essais, date d’utilisation.
   - Générer le code côté backend avec un générateur sécurisé.
   - Stocker uniquement une version hachée du code.
   - Expirer les codes rapidement et limiter les essais.
   - Répondre de manière générique à la demande d’envoi pour éviter de révéler si un compte existe.

3. **Envoyer le bon code par email**
   - Adapter l’envoi d’email de réinitialisation pour injecter le code généré par ce nouveau backend.
   - Faire apparaître clairement “code à 6 chiffres” dans le contenu de l’email.
   - Utiliser un exemple de prévisualisation à 6 chiffres.

4. **Adapter l’interface utilisateur**
   - Page de connexion : le bouton “mot de passe oublié” déclenchera le nouveau backend d’envoi de code.
   - Page de réinitialisation : conserver uniquement 6 cases de saisie.
   - Validation : bloquer la vérification tant que les 6 chiffres ne sont pas saisis.
   - Étape mot de passe : finaliser la réinitialisation via le backend après validation du code.
   - Remplacer toutes les mentions visibles restantes de 8 chiffres par 6 chiffres.

5. **Sécuriser les cas limites**
   - Code expiré.
   - Code déjà utilisé.
   - Trop d’essais incorrects.
   - Email inexistant sans fuite d’information.
   - Mot de passe non conforme aux règles existantes.

6. **Vérification globale**
   - Rechercher dans le code toutes les mentions de “8 chiffres”, `maxLength={8}`, validations à 8 caractères et anciens appels de réinitialisation.
   - Tester visuellement la page `/reset-password` : 6 cases uniquement.
   - Tester le bouton : désactivé avant 6 chiffres, activé à 6 chiffres.
   - Tester un envoi de code et vérifier côté backend que le code généré et envoyé contient exactement 6 chiffres.
   - Tester la réinitialisation complète : demande du code, saisie du code, nouveau mot de passe, connexion possible ensuite.

## Détails techniques

- Le réglage natif de longueur OTP n’est pas exposé ici, donc le plan prévoit un flux backend contrôlé plutôt qu’un simple changement d’affichage.
- Le code ne sera jamais stocké en clair.
- Les accès directs à la table seront fermés côté utilisateur ; seules les fonctions backend pourront créer, vérifier et consommer les codes.
- Les emails resteront en français et cohérents avec l’interface actuelle.