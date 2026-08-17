# Plan : exposer Interw comme serveur MCP

## Objectif
Ajouter un serveur MCP à Interw pour que des assistants externes (ChatGPT, Claude, Cursor, Lovable) puissent appeler des outils sécurisés : lister les projets, consulter une session, récupérer un rapport, etc.

## Choix d'architecture
- **Auth : OAuth 2.1 via Supabase Auth.** L'application a des comptes utilisateurs et les données sont protégées par RLS ; chaque appel MCP doit donc s'exécuter en tant qu'utilisateur authentifié. Pas de serveur public.
- **Stack : `@lovable.dev/mcp-js` + Edge Function générée.** Le plugin Vite produit `supabase/functions/mcp/index.ts` à partir de `src/lib/mcp/index.ts`.

## Étapes

1. **Dépendances**
   - Installer `@lovable.dev/mcp-js` (et vérifier que `zod` est présent).

2. **Factory Supabase pour les outils**
   - Créer `src/lib/mcp/supabase.ts` avec `supabaseForUser(ctx)` (transmet le bearer token vérifié) et `supabaseAnon()` (non utilisé ici, mais présent pour l'avenir).
   - Lire les variables d'env au runtime, jamais au top-level.

3. **Outils MCP (un par fichier sous `src/lib/mcp/tools/`)**
   - `list_organizations` : organisations accessibles à l'utilisateur.
   - `list_projects` : projets de l'organisation courante (avec filtres optionnels).
   - `get_project` : détail d'un projet.
   - `list_sessions` : sessions d'un projet.
   - `get_session` : détail d'une session (statut, candidat, dates).
   - `get_report` : rapport généré d'une session (scores, verdict, recommandation).
   - Chaque outil vérifie `ctx.isAuthenticated()`, utilise `supabaseForUser(ctx)`, et renvoie du JSON texte MCP.

4. **Définition du serveur**
   - Créer `src/lib/mcp/index.ts` avec `defineMcp`.
   - `name: "interw"`, `title: "Interw"`.
   - `auth: auth.oauth.issuer({ issuer: "https://qxszgsxdktnwqabsdfvw.supabase.co/auth/v1", acceptedAudiences: "authenticated" })`.
   - Lister tous les outils.

5. **Route de consentement OAuth**
   - Ajouter `src/pages/OAuthConsent.tsx` à l'URL `/.lovable/oauth/consent`.
   - Elle consomme `authorization_id`, redirige vers `/login?next=...` si non authentifié, puis appelle `supabase.auth.oauth.approveAuthorization` / `denyAuthorization`.
   - Préserver le paramètre `next` sur tous les chemins d'authentification (login, magic-link, social OAuth).

6. **Activation côté backend**
   - Appeler `supabase--configure_oauth_server` pour activer OAuth 2.1 + DCR.

7. **Plugin Vite**
   - Ajouter `mcpPlugin()` dans `vite.config.ts` (sans retirer les plugins existants).

8. **Validation et déploiement**
   - Lancer `app_mcp_server--extract_mcp_manifest` pour régénérer `.lovable/mcp/manifest.json`.
   - Déployer la fonction `mcp` avec `supabase--deploy_edge_functions`.

## Résultat attendu
Endpoint MCP live sur `https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/mcp`, sécurisé par OAuth, listé dans More → Agent integrations et connectable depuis ChatGPT / Claude / Cursor / Lovable.
