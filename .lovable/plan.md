# Plan

Je vais corriger le bug d’envoi du bouton « Signaler un problème » sur la page candidat.

## Ce que je vais faire

1. Corriger l’appel serveur entre `report-interview-issue` et l’envoi d’email
   - Le bug vient du fait que la fonction `report-interview-issue` appelle `send-transactional-email` avec `supabase.functions.invoke(...)` depuis le serveur.
   - Or la fonction d’email attend un jeton JWT valide en entrée, et l’appel actuel envoie un en-tête non valide pour ce cas, ce qui provoque le `401 Invalid JWT` vu dans les journaux.
   - Je vais remplacer cet appel par un appel HTTP explicite vers la fonction d’email avec les bons en-têtes d’authentification serveur, comme c’est déjà fait ailleurs dans le projet.

2. Garder la logique métier existante
   - La session restera mise en pause.
   - Le message saisi continuera à être envoyé au créateur de la session.
   - Le `reply-to` candidat restera conservé si disponible.
   - Je ne toucherai pas au parcours candidat ni au texte affiché, sauf si un message d’erreur doit être rendu plus clair.

3. Vérifier la robustesse minimale de la fonction
   - Ajouter une vérification propre des variables d’environnement utilisées par la fonction avant l’appel d’email.
   - Garder des retours d’erreur JSON cohérents pour éviter les erreurs floues côté interface.

4. Redéployer puis tester
   - Redéployer la fonction modifiée.
   - Tester l’appel de `report-interview-issue` pour confirmer qu’il répond bien en succès.
   - Contrôler les journaux de la fonction pour vérifier que l’erreur `UNAUTHORIZED_INVALID_JWT_FORMAT` a disparu.

## Détail technique

- Fichier principal à corriger : `supabase/functions/report-interview-issue/index.ts`
- Référence de bon pattern déjà présente dans le projet : `supabase/functions/check-email-failures/index.ts`
- Cause exacte observée dans les journaux :
  - `send-transactional-email failed 401`
  - `UNAUTHORIZED_INVALID_JWT_FORMAT`

## Résultat attendu

Quand le candidat clique sur « Envoyer » dans « Signaler un problème » :
- la fenêtre reste fonctionnelle,
- le toast d’erreur disparaît,
- l’email part bien au créateur de la session.