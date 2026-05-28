# Destinataires des rapports à l'étape 5

## Objectif

À l'étape 5 (« Publier ») de création/édition d'un projet, permettre de choisir parmi les membres de l'organisation qui recevra l'email de rapport après chaque entretien. Sélection multiple via dropdown avec cases à cocher.

## Comportement attendu

- Liste tous les membres de l'organisation (depuis `profiles` filtrés par `organization_id`).
- Par défaut à la création : le créateur du projet est pré-coché.
- À l'édition : on charge la sélection enregistrée.
- Aucun destinataire coché → comportement actuel inchangé (fallback : créateur du projet, puis owner de l'organisation).
- Chaque membre coché reçoit l'email de rapport pour chaque entretien finalisé du projet.

## Étape 1 — Stockage

Migration : ajouter `report_recipient_user_ids uuid[] NOT NULL DEFAULT '{}'` sur `public.projects`.
Aucun changement RLS (déjà couvert par les policies projet).

## Étape 2 — UI étape 5

Dans `src/components/project/ProjectForm.tsx`, ajouter sous le récapitulatif un bloc « Destinataires des rapports » :

- Composant inline réutilisant `Popover` + `Command` (shadcn) ou simplement un `DropdownMenu` avec `Checkbox` par membre.
- Chargement des membres au montage du composant via `supabase.from("profiles").select("user_id, full_name, email").eq("organization_id", profile.organization_id)`.
- Affichage du trigger : « 3 destinataires sélectionnés » ou les 2 premiers noms + « +N ».
- État local `recipientUserIds: string[]` ajouté à `initial`, propagé via `onSubmit`.
- Petite mention sous le champ : « Ces personnes recevront l'email de rapport après chaque entretien. »

## Étape 3 — Sauvegarde

- `ProjectForm` : ajouter `recipientUserIds` dans la prop `initial`, l'inclure dans le payload `onSubmit`.
- `src/pages/ProjectNew.tsx` : défaut `recipientUserIds: [user.id]`, mappé à `report_recipient_user_ids` à l'INSERT.
- `src/pages/ProjectEdit.tsx` : charger depuis `project.report_recipient_user_ids`, sauvegarder à l'UPDATE.

## Étape 4 — Envoi

Dans `supabase/functions/generate-report/index.ts`, modifier `sendReportEmail` :

- Récupérer `project.report_recipient_user_ids`.
- Si non vide → charger les emails correspondants depuis `profiles` (filtrés par `organization_id` pour sécurité) et envoyer un email par destinataire (boucle, chacun avec son `messageId`, son `unsubscribe_token` et son log).
- Si vide → conserver la logique actuelle (assigned_to → created_by → owner org).
- Respecter la suppression : continuer à filtrer les emails présents dans `suppressed_emails`.
- Idempotency key par destinataire : `report-${session_id}-${userId}` pour éviter les doublons en cas de retry.

## Étape 5 — Validation

1. Créer un nouveau projet, cocher 2 membres → vérifier en base que `report_recipient_user_ids` contient bien les 2 ids.
2. Éditer le projet, décocher un membre → vérifier la mise à jour.
3. Déclencher `generate-report` sur une session test → vérifier dans `email_send_log` qu'il y a 2 entrées `pending` puis `sent` avec les bons destinataires.
4. Vider la sélection → vérifier que le fallback créateur fonctionne toujours.

## Hors scope

- Notification par autre canal (Slack, webhook).
- Personnalisation du contenu par destinataire.
- Préférences individuelles de fréquence/digest.
