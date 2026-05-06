## Problème confirmé
Le bug ne vient pas du template email ni de la file d’envoi.

La panne se produit avant cela : `report-interview-issue` appelle `send-transactional-email`, mais cette fonction est protégée avec `verify_jwt = true` alors que l’appel interne lui envoie une clé service qui n’est pas acceptée comme JWT valide dans la configuration actuelle.

Résultat : l’appel est rejeté en 401 `UNAUTHORIZED_INVALID_JWT_FORMAT`, donc aucun email n’est mis en file et aucune ligne n’apparaît dans `email_send_log`.

## Ce que je vais corriger
1. Revoir l’authentification de `send-transactional-email` pour qu’elle soit compatible avec :
   - les appels depuis le front candidat/RH avec un vrai token utilisateur
   - les appels internes depuis d’autres fonctions backend
2. Supprimer la dépendance au contrôle `verify_jwt = true` au niveau passerelle pour cette fonction, puis faire la validation dans le code.
3. Mettre à jour les appels internes qui envoient des emails pour utiliser un schéma cohérent et fiable.
4. Re-tester tout le parcours “Signaler un problème” de bout en bout.

## Fichiers concernés
- `supabase/functions/send-transactional-email/index.ts`
- `supabase/functions/report-interview-issue/index.ts`
- `supabase/functions/check-email-failures/index.ts`
- `supabase/config.toml`

## Plan d’implémentation
### 1) Sécuriser correctement `send-transactional-email`
- passer `send-transactional-email` en `verify_jwt = false`
- ajouter une validation explicite dans la fonction :
  - accepter un vrai token utilisateur côté front
  - accepter un appel interne signé côté backend
- garder le comportement actuel d’envoi en file, sans toucher au rendu des templates

### 2) Corriger `report-interview-issue`
- adapter l’appel vers `send-transactional-email` au nouveau schéma d’authentification interne
- conserver :
  - le template `interview-issue-report`
  - le `reply-to` candidat
  - l’idempotency key
  - les messages d’erreur propres

### 3) Aligner les autres appels internes
- corriger aussi `check-email-failures`, car il utilise le même modèle d’appel interne et risque la même panne
- vérifier qu’on n’a pas d’autre appel interne au même format dans le projet

### 4) Vérification complète
Après correction et redéploiement, je vérifierai :
- que `report-interview-issue` répond bien sans 401
- qu’une ligne `pending` ou `sent` apparaît dans `email_send_log`
- que le template `interview-issue-report` est bien mis en file
- qu’il n’y a plus de log `UNAUTHORIZED_INVALID_JWT_FORMAT`

## Détails techniques
Constat actuel :
- log backend : `send-transactional-email failed 401 {"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}`
- `report-interview-issue` appelle aujourd’hui `/functions/v1/send-transactional-email` avec `Authorization: Bearer ${serviceKey}`
- avec le système de clés actuel, cette valeur n’est pas acceptée comme JWT par la protection gateway
- c’est pour cela que l’exécution s’arrête avant même l’écriture dans `email_send_log`

Si vous validez, j’applique la correction complète et je reteste tout le flux proprement.