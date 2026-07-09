## Problème

La page publique `/highlights/:token` (`HighlightsPublic.tsx`) interroge directement `report_shares`, `reports` et `sessions` avec le client `anon`. La migration de durcissement (08/07) a supprimé les policies `anon` sur `report_shares` et `reports` → la page est cassée (écran "Lien introuvable ou expiré").

## Solution : réutiliser l'edge function `consume-report-share`

L'edge function `consume-report-share` existe déjà, tourne en `service_role` (contourne RLS proprement), gère expiration/désactivation/verrouillage par `viewer_secret`, et renvoie déjà `report`, `session`, `messages`. C'est ce que `SharedReport.tsx` utilise déjà. On l'étend légèrement pour couvrir les highlights.

### Étape 1 — Étendre `consume-report-share`

- Ajouter dans la réponse le `project.title` (déjà dispo via la jointure `sessions.projects.title`) et `session.candidate_name` (déjà là).
- Aucun changement de sécurité : la fonction fait déjà tout le travail de validation du token.

### Étape 2 — Refactor `HighlightsPublic.tsx`

- Supprimer les 3 appels directs à `supabase.from(...)`.
- Faire un seul appel `supabase.functions.invoke("consume-report-share", { body: { token, viewerSecret } })`, aligné sur `SharedReport.tsx` (même storageKey `report-share:${token}`, même gestion du `viewerSecret` renvoyé).
- Extraire `clips` depuis `report.highlight_clips`, `candidateName` depuis `session.candidate_name`, `projectTitle` depuis `session.projects.title`.
- Conserver l'UI et le lien "Voir le rapport complet" tels quels.

### Étape 3 — Effet de bord à valider

`HighlightsPublic` et `SharedReport` partagent maintenant la même `storageKey` → un candidat qui ouvre le lien highlights *puis* le rapport complet (ou l'inverse) sur le même navigateur reste autorisé (même `viewer_secret`). C'est le comportement voulu. Sur un autre appareil, le lien reste verrouillé — cohérent avec la sécurité en place.

## Ce que je ne touche PAS

- Aucune modification RLS / migration SQL.
- Aucun changement à `SharedReport.tsx`.
- Aucun changement aux autres points audités (session_attempts anon, user_roles, organizations anon columns) — soit intentionnels, soit non liés.

## Fichiers modifiés

- `supabase/functions/consume-report-share/index.ts` — s'assurer que la réponse contient bien `session.candidate_name` et `session.projects.title` (déjà le cas — vérif seulement, sans doute 0 changement).
- `src/pages/HighlightsPublic.tsx` — bascule sur l'edge function.
