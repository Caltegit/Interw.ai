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

## Réponses aux questions de vérification (31/08)

1. **Hébergement** : le projet tourne sur Lovable Cloud (base gérée), pas sur un Supabase externe — donc éligible à la mise à jour.
2. **Footer de désinscription** : il est ajouté automatiquement à **tous** les e-mails applicatifs, invitations et rapports candidats compris. Il n'existe aucune exemption ; retirer le jeton de désinscription fait rejeter l'envoi. Seuls les e-mails d'authentification (connexion, réinitialisation) n'en ont pas.
3. **Tables créées par `20260418130145_email_infra.sql`** : oui — `email_send_log` (l. 27), `email_send_state` (l. 87), `suppressed_emails` (l. 209), `email_unsubscribe_tokens` (l. 238). Ces tables sont **conservées** ; seule la migration SQL legacy est retirée du dépôt.
4. **`retry-email`** : non, il casse en l'état. Il appelle `supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', ... })` (l. 73-88 de `supabase/functions/retry-email/index.ts`). Il doit être converti vers l'envoi géré dans le même lot. À noter : aujourd'hui il renvoie déjà un contenu générique de remplacement, pas l'e-mail original.
5. **Les 16 e-mails en échec définitif** : voir tableau ci-dessous.
6. **Retries côté Lovable** : gérés automatiquement par la plateforme, sans file d'attente ni DLQ propres au projet. L'historique de livraison reste consultable via les logs d'e-mail de la plateforme, mais **il n'y a plus de DLQ rejouable côté projet** : un renvoi se fait en re-déclenchant l'envoi métier. Je ne connais pas de chiffre officiel de nombre de tentatives / fenêtre à te donner — à confirmer avant bascule.
7. **Hébergement des logs et sous-traitant** : les journaux applicatifs (`email_send_log`) restent dans ta base Lovable Cloud. Les logs de livraison de la plateforme sont hébergés côté Lovable. Le sous-traitant d'envoi utilisé aujourd'hui est Mailgun (les rebonds et plaintes remontent par ce canal). À faire confirmer par écrit pour ton registre RGPD.
8. **Quota et coût** : la mise à jour elle-même est gratuite. Je n'ai pas de grille de quota/tarification d'envoi fiable à te communiquer — à obtenir avant décision.

### Les 16 e-mails en échec définitif

| Date | Type | Destinataire | Cause |
|---|---|---|---|
| 26/08 14:21 | candidate-thank-you | lamitakafrouni@gmail.com | 403 domaine non vérifié |
| 26/08 14:20 | recovery | eva@alboteam.com | 403 domaine non vérifié |
| 08/07 16:07 | recovery | c+m@bap.fr | 5 tentatives échouées |
| 08/07 16:05 | recovery | c+m@bap.fr | 5 tentatives échouées |
| 03/07 11:10 | candidate-thank-you | c.plisson@mailistec.fr | 5 tentatives échouées |
| 22/06 08:00 | weekly-project-recap | eva.bdanel28@gmail.com | envois désactivés |
| 06/06 12:17 | candidate-thank-you | sd | adresse invalide |
| 06/06 12:17 | candidate-thank-you | sdf | adresse invalide |
| 23/05 21:19 | interview-report | c@bap.fr | envois désactivés |
| 23/05 21:02 | interview-report | c@bap.fr | envois désactivés |
| 20/05 19:35 | interview-report | c@bap.fr | envois désactivés |
| 13/05 21:38 | interview-report | c@bap.fr | envois désactivés |
| 03/05 14:03 | interview-report | clement.alteresco@gmail.com | 5 tentatives échouées |
| 19/04 13:34 | interview-report | clement.alteresco@gmail.com | 5 tentatives échouées |
| 19/04 13:31 | interview-report | clement.alteresco@gmail.com | 5 tentatives échouées |
| 18/04 19:55 | recovery | cclemalte@gmail.com | envois désactivés |

Aucun n'est un échec de contenu : ce sont des périodes d'envois désactivés, des adresses invalides, ou le 403 du basculement `.com` (résolu depuis).

## Points bloquants avant décision

- Le footer de désinscription sur les invitations et rapports candidats est **non désactivable**. Si c'est rédhibitoire, on ne migre pas.
- Les chiffres de retries, de quota et de coût d'envoi restent à confirmer.
- `retry-email` doit être réécrit dans le même lot (ajout à l'étape 3).

## Prochaine action

Aucun fichier ne sera modifié tant que tu n'as pas validé ce plan.
