# Bug création d'organisation

## Cause

La création passe bien côté Auth (lien magique envoyé, utilisateur créé), mais l'edge function `superadmin-create-org` reçoit une erreur 500 quand elle insère la nouvelle organisation. Le trigger qui ensemence le projet de démo appelle `public.seed_demo_project`, qui tente d'écrire dans `projects.description` — colonne qui n'existe pas (la table n'a que `title` et `job_title`).

Log Postgres correspondant :
> column "description" of relation "projects" does not exist

## Correction

Migration unique : recréer `public.seed_demo_project` sans la colonne `description` (le reste de l'INSERT inchangé). Aucune modification frontend nécessaire.

## Vérification

- Relancer une création d'organisation via la console super admin.
- Vérifier que l'organisation est créée, le projet de démo "Candidature spontanée - TEST -" présent avec ses 5 questions et 3 critères, et que le lien magique est bien envoyé.
