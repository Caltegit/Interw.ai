

## Impersonation : prendre la main sur un compte utilisateur

### Ce qui change

Sur la table des utilisateurs (Console Super Admin → onglet Utilisateurs **et** fiche organisation), une nouvelle icône **flèche** (`LogIn`) apparaît à gauche du crayon « Modifier » sur chaque ligne.

Au clic :
1. Confirmation : « Prendre la main sur le compte de `email@x.fr` ? Vous serez déconnecté de votre session super admin. »
2. Le super admin est connecté à la place de l'utilisateur cible et redirigé vers `/dashboard`.
3. Un bandeau orange persistant s'affiche en haut de l'application : « 👤 Vous êtes connecté en tant que **email@x.fr** (impersonation) — [Revenir à mon compte] ».
4. Le clic sur « Revenir à mon compte » reconnecte le super admin sur sa session d'origine et le ramène à la console super admin.

L'icône n'est jamais affichée sur sa propre ligne (impossible de s'impersonifier soi-même).

### Comment ça fonctionne (technique)

**Edge function `superadmin-impersonate`** (nouvelle, `verify_jwt = false` géré en code) :
- Vérifie que l'appelant est super admin via `is_super_admin`.
- Génère un **magic link** pour l'utilisateur cible avec `admin.generateLink({ type: 'magiclink', email })`.
- Retourne l'`action_link` (URL de connexion à usage unique).

**Front**
- `src/lib/impersonation.ts` (nouveau) : helpers `startImpersonation(userId, email)` et `stopImpersonation()`.
  - `start` : sauvegarde la session super admin courante (`supabase.auth.getSession()`) dans `localStorage` sous la clé `impersonation_origin_session`, appelle l'edge function, puis redirige `window.location.href = action_link`.
  - Au retour du magic link, la nouvelle session écrase l'ancienne — le marqueur `localStorage` reste, ce qui déclenche le bandeau.
  - `stop` : récupère le marqueur, appelle `supabase.auth.setSession({ access_token, refresh_token })` avec les tokens d'origine, supprime le marqueur, redirige vers `/superadmin`.

- `src/components/ImpersonationBanner.tsx` (nouveau) : bandeau orange fixé en haut, affiché uniquement si `localStorage.impersonation_origin_session` est présent. Bouton « Revenir à mon compte ».
- Monté une seule fois dans `src/App.tsx` (hors routes, au-dessus de `<Routes>`).

- `src/components/superadmin/UsersTable.tsx` et `src/pages/SuperAdminOrgDetail.tsx` : ajouter l'icône `LogIn` (lucide) avec `AlertDialog` de confirmation, désactivée pour `u.user_id === me?.id`.

### Sécurité

- L'edge function vérifie le rôle super admin **côté serveur** via service role + `is_super_admin`. Aucun contournement possible côté client.
- Le magic link généré est à usage unique et expire rapidement (paramètre Supabase par défaut, ~1h).
- Les tokens d'origine sont stockés en `localStorage` côté navigateur du super admin uniquement — pas de risque de fuite côté utilisateur cible.
- Aucune trace n'est laissée dans le compte cible (pas de modification de données auth).

### Hors champ

- Pas de log d'audit des impersonations en base — à ajouter dans un second temps si besoin de conformité (table `audit_log` avec qui, quand, qui).
- Pas de limite de durée d'impersonation côté serveur — repose sur la durée de session standard.
- Pas de notification email à l'utilisateur impersonifié.

