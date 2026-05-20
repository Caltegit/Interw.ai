## Objectif

Ajouter, sur la page **Super Admin > détail organisation**, le bouton « Magic Link » sur chaque ligne utilisateur — identique à celui déjà présent dans la table globale des utilisateurs.

## Fichier modifié

`src/pages/SuperAdminOrgDetail.tsx`

## Changements

1. Importer l'icône `Link2` (lucide-react) et le client `supabase`.
2. Dans la liste des membres (lignes 192-250), ajouter un nouveau bouton icône entre l'action « Prendre la main » et « Modifier » :
   - Icône : `Link2`
   - Tooltip : « Copier un lien de connexion (24h, usage unique) »
   - Action : appel à l'edge function `superadmin-magic-link` avec l'email du membre, puis copie du `action_link` dans le presse-papier
   - Toasts succès / erreur identiques à `UsersTable.tsx`

## Hors périmètre

Pas de changement backend (l'edge function `superadmin-magic-link` existe déjà), pas de modification de la table globale.
