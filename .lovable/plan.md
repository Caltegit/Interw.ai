# Plan : Publier le fix avatar sidebar

## Contexte
Le fix de centrage de l'avatar « ED » dans le pied de sidebar replié (`src/components/AppSidebar.tsx`, `size="lg"` + `!p-0` + `justify-center`) est appliqué et vérifié. Il n'a pas encore été publié.

## Ce que fait cette publication
- Publier uniquement le fix avatar (changement CSS uniquement, aucun impact sur la logique métier ou la sécurité).

## Ce qui n'est PAS inclus
Aucun fix de sécurité. Le scan actuel remonte 4 findings critiques préexistants sur `supabase_lov` (storage media, invitations, organizations, sessions) :
- `media_bucket_unscoped_storage_access`
- `organization_invitations_anon_token_not_checked`
- `organizations_anon_full_column_exposure`
- `session_messages_anon_broad_active_project_access`
- `sessions_anon_broad_active_project_access`

Ces findings existent avant ce changement et ne sont pas liés au fix avatar. Per ta demande, je ne les corrige pas maintenant. `preview_ui--publish` signalera si l'un d'eux bloque la publication dans ce workspace.

## Action
1. Appeler `preview_ui--publish` pour publier le fix avatar.
