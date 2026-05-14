# Champ « Expéditeur (nom affiché) » dans les dialogues d'envoi d'email

## Objectif
Ajouter un champ modifiable dans chaque boîte de dialogue d'envoi d'email pour personnaliser le nom affiché dans le `From:` du destinataire. L'adresse reste `noreply@interw.ai`.

Exemple rendu côté boîte de réception : `Marie Dupont <noreply@interw.ai>`.

## Périmètre
Boîtes de dialogue concernées (envois manuels par un recruteur) :
- `ShareReportsDialog` — Partager les rapports
- `BulkEmailDialog` — Email groupé aux candidats

Les emails automatiques (rapport, remerciement, invitations) restent inchangés et conservent l'expéditeur par défaut « InterviewAI ».

## Changements

### 1. Edge function `send-transactional-email`
- Accepter un nouveau champ optionnel `fromName` (string) dans le body.
- Validation : trim, longueur max 60 caractères, suppression des caractères qui casseraient l'en-tête (`<`, `>`, `"`, `\r`, `\n`).
- Si fourni et non vide après nettoyage : `from = "${fromName} <noreply@${FROM_DOMAIN}>"`.
- Sinon comportement inchangé (`SITE_NAME`).
- Redéploiement requis.

### 2. Front — `ShareReportsDialog.tsx` et `BulkEmailDialog.tsx`
- Nouveau champ `Input` « Nom de l'expéditeur » au-dessus du champ Destinataires.
- Pré-rempli avec `profile.full_name` (fallback : partie locale de `user.email`).
- État local `fromName`, modifiable par le recruteur avant chaque envoi.
- Validation Zod côté client : trim, 1–60 caractères.
- Passé dans le body de chaque appel `supabase.functions.invoke('send-transactional-email', ...)`.
- Combiné au `replyTo` déjà présent.

## Détails techniques
- Format `from` final RFC 5322 : `"Marie Dupont <noreply@interw.ai>"`.
- Pas de migration DB, pas de secret, pas de modification de template.
- Le champ est purement « display name » — l'adresse d'envoi ne change jamais.

## Hors périmètre
- Pas de personnalisation de l'adresse `noreply@`.
- Pas de mémorisation par utilisateur (le nom se réinitialise au profil à chaque ouverture du dialogue).
