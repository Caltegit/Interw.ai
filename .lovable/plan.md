# Plan de mise à jour des emails

## Contexte actuel

L'application utilise aujourd'hui l'infrastructure email "legacy" de Lovable :

- Domaine vérifié : `notify.interw.com`
- Files d'attente `pgmq` (`auth_emails`, `transactional_emails`) avec cron toutes les 5 s
- Edge Functions maison :
  - `process-email-queue`
  - `send-transactional-email`
  - `handle-email-suppression`
  - `handle-email-unsubscribe`
- Migration SQL : `supabase/migrations/20260418130145_email_infra.sql`
- 16 emails sont actuellement en échec permanent (DLQ) et ne seront pas renvoyés automatiquement.

## La mise à jour proposée

Passer à la version gérée par Lovable : envoi, retries, suppression, désinscription et logs de livraison sont pris en charge côté Lovable. L'application n'a plus besoin de sa propre queue ni de son cron.

### Ce qui change

- Suppression de `process-email-queue`, `handle-email-suppression`, `handle-email-unsubscribe` et du fichier `*_email_infra.sql`.
- Conversion des appels `send-transactional-email` vers le helper géré (`sendTemplateEmail` / `sendLovableEmail`).
- Réécriture du hook d'emails d'authentification pour utiliser l'envoi direct géré.
- Ajout d'un receiver d'événements (`handle-email-events`) pour réagir aux rebonds, plaintes et désinscriptions.
- Les tables `email_send_log`, `suppressed_emails` et `email_unsubscribe_tokens` sont conservées (données utilisateur).

### Ce qui ne change pas

- Le domaine d'envoi reste `notify.interw.com`.
- Les templates React Email dans `supabase/functions/_shared/transactional-email-templates/` sont conservés et réutilisés.
- Les fonctionnalités métiers (invitations, rapports, rappels, health report, etc.) restent identiques.

## Étapes de réalisation

1. **Inventaire complet** : lister tous les appels à `send-transactional-email` / `enqueue_email` dans `src/` et `supabase/functions/`.
2. **Réécriture des emails d'authentification** : régénérer le hook auth pour l'envoi direct géré.
3. **Conversion des emails applicatifs** : transformer chaque sender métier pour utiliser le helper géré, en préservant le sujet, le HTML et le destinataire unique.
4. **Récepteur d'événements** : créer `handle-email-events` pour mettre à jour `email_send_log`, `suppressed_emails` et `email_unsubscribe_tokens` lors des rebonds/plaintes/désinscriptions.
5. **Nettoyage** : supprimer les fichiers et fonctions legacy listés ci-dessus.
6. **Vérification** : build, déploiement des Edge Functions, tests sur un envoi de chaque type critique (auth, invitation, rappel, rapport).

## Conditions importantes

- La mise à jour est **gratuite** et ne consomme pas de crédits.
- **Rien ne change en production** tant que le projet n'est pas publié : l'application live continue de fonctionner avec l'ancienne version.
- **Après publication, la bascule est définitive** et ne peut pas être annulée.
- Les 16 emails actuellement en DLQ devront être re-traités manuellement ou via les fonctionnalités existantes (`retry-email`, `check-email-failures`) avant ou après la bascule.

## Prochaine action

Si tu valides, je lance la procédure de consentement puis la mise à jour du code. Aucun fichier ne sera modifié avant ton accord explicite.
