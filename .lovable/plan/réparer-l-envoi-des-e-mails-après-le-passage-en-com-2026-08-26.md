# Réparer l'envoi des e-mails après le passage en .com

## Ce qui se passe réellement

Le code d'envoi a bien basculé sur `notify.interw.com`, mais la plateforme d'envoi refuse encore ce domaine pour ce projet : chaque e-mail part en erreur `403 domaine non vérifié` et finit en échec définitif.

Constaté dans le journal d'envois :
- 14h06 (avant bascule, ancien domaine) : code de réinitialisation **envoyé**.
- 14h20 (après bascule vers `.com`) : code de réinitialisation **en échec 403**, ainsi qu'un e-mail de remerciement candidat.
- Le DNS de `notify.interw.com` est vérifié, mais le chemin d'envoi du projet est resté bloqué sur « en attente de vérification de la voie de livraison » (délai dépassé).

Donc : DNS bon, mais l'activation de l'envoi côté plateforme n'est pas allée au bout.

## Plan

### 1. Rétablir l'envoi tout de suite (repli sur l'ancien domaine vérifié)
Repasser l'expéditeur technique sur `notify.interw.ai` (qui reste vérifié et fonctionnel) dans les fonctions d'envoi, sans toucher au reste de la migration : les liens, l'application et les contenus restent en `interw.com`. Seule l'adresse d'expédition affichée reviendra temporairement en `.ai`.

Fonctions concernées : envoi de code de réinitialisation, e-mails d'authentification, e-mails applicatifs, rapports, relance d'envoi. Redéploiement dans la foulée.

### 2. Terminer l'activation de `notify.interw.com`
Relancer la configuration d'envoi du domaine `.com` puis vérifier son état dans **Cloud → E-mails**. Tant que l'état n'est pas « actif », on n'y rebascule pas.

### 3. Rebasculer en `.com` une fois l'envoi actif
Remettre `notify.interw.com` comme expéditeur, redéployer, et envoyer un e-mail de test (code à 6 chiffres) vers une boîte externe (Gmail/Outlook) pour confirmer la réception hors indésirables.

### 4. Renvoyer ce qui a échoué
Les e-mails tombés en échec définitif ne sont pas rejoués automatiquement. Après rebascule, relancer manuellement ceux qui comptent (codes de réinitialisation à redemander, remerciement candidat concerné).

## Détails techniques
- Constantes à modifier : `SENDER_DOMAIN` / `FROM_DOMAIN` dans `request-password-reset-code`, `auth-email-hook`, `send-transactional-email`, `generate-report`, `retry-email`.
- Les adresses de réponse et de contact (`hello@`, `contact@`) restent en `.com` : elles n'ont pas besoin du domaine d'envoi.
- Les 16 e-mails en file d'échec définitif (`dlq`) sont conservés dans le journal d'envois pour audit.

## Point de vigilance
Un expéditeur qui alterne `.ai` puis `.com` en quelques jours n'aide pas la réputation d'envoi : une fois la bascule `.com` faite, on ne revient plus en arrière et on surveille le journal une à deux semaines.
