

## Crédits de sessions par organisation

### Ce qui change

**Super Admin — fiche organisation**
Deux nouveaux champs dans la création et l'édition d'organisation :
- **Crédits de sessions illimités** (interrupteur, activé par défaut)
- **Nombre de crédits** (nombre entier, visible uniquement si l'interrupteur est désactivé)

**Dashboard recruteur**
Une nouvelle carte « Crédits de sessions » affiche, selon la configuration de l'organisation :
- « Illimité » si l'organisation n'a pas de quota
- Sinon « **X / Y** sessions utilisées » avec une barre de progression
  - Vert si moins de 70 % consommé
  - Orange entre 70 % et 99 %
  - Rouge à 100 % ou plus, avec un message « Quota atteint — pensez à augmenter votre plafond »

Le décompte correspond au nombre de sessions au statut **completed** dans l'organisation.

Quand le quota est atteint, l'invitation de nouveaux candidats reste autorisée — seul un avertissement est affiché (jamais de blocage).

### Détails techniques

**Migration**
Ajouter sur `organizations` :
- `session_credits_unlimited boolean NOT NULL DEFAULT true`
- `session_credits_total integer` (nullable, `>= 0` via trigger de validation)

**Backend**
- `supabase/functions/superadmin-create-org/index.ts` : accepter `session_credits_unlimited` et `session_credits_total` dans le body et les insérer.
- Aucune autre fonction touchée — l'édition se fait via update direct (RLS « Org admins / Super admins can update organizations » déjà en place).

**Front**
- `src/components/superadmin/CreateOrgDialog.tsx` : ajouter Switch « Crédits illimités » + Input numérique conditionnel.
- `src/components/superadmin/EditOrgDialog.tsx` : mêmes champs, écriture directe via `supabase.from("organizations").update(...)`.
- `src/pages/SuperAdminOrgDetail.tsx` : afficher la valeur dans le bloc d'info de l'organisation.
- `src/hooks/queries/useDashboardData.ts` : récupérer `session_credits_unlimited`, `session_credits_total` de l'organisation du user, et compter les sessions `completed` sur tous les projets de l'organisation. Ajouter au retour `credits: { unlimited, total, used }`.
- `src/pages/Dashboard.tsx` : nouvelle carte « Crédits de sessions » (4ᵉ ou 5ᵉ KPI) avec barre de progression colorée.
- `src/integrations/supabase/types.ts` : régénéré automatiquement.

### Hors champ

- Pas de blocage de création de session (choix retenu : avertir mais autoriser).
- Pas de gestion de période/renouvellement automatique du quota — c'est un compteur cumulatif sur les sessions completed. Si besoin de remise à zéro mensuelle, à traiter dans un second temps.
- Pas d'historique des modifications de quota.

