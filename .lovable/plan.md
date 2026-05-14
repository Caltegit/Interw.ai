# Copilote IA recruteur

Un assistant conversationnel qui aide chaque recruteur à comparer, classer et interroger les candidats d'un projet en s'appuyant sur leurs rapports d'évaluation.

## Expérience utilisateur

**Bouton flottant contextuel**
- Bouton fixed en bas à droite, visible sur toutes les pages RH protégées (masqué sur les pages candidat publiques, landing, superadmin).
- Icône `Sparkles` indigo, pastille de notification discrète si nouveau thread non lu.
- Détecte automatiquement le projet actif via la route (`/projects/:id/*`, `/sessions/:id`).
- Hors contexte projet : sélecteur de projet en haut du drawer.

**Drawer latéral droit** (Sheet shadcn, ~480px, responsive)
- Header : nom du projet · sélecteur de fil (dropdown) · bouton « Nouveau fil » · fermer.
- Zone messages : style ChatGPT, markdown rendu (tableaux, listes, gras), avec streaming.
- Composer : textarea + envoyer + 3 suggestions cliquables ("Compare X et Y sur l'organisation", "Top 3 candidats", "Forces de Z").
- État loading : « Réflexion… ».
- Erreurs : toast clair pour 429 (limite) / 402 (crédits).

**Threads multiples par projet, privés au recruteur**
- Chaque recruteur ne voit QUE ses propres conversations (RLS sur `created_by`).
- Liste déroulante des fils du projet (titre auto-généré depuis le 1er message).
- Création/suppression depuis le dropdown.
- Persistance complète des messages.

## Fonctionnement IA

**Contexte injecté dans le prompt système** (à l'ouverture de chaque fil)
- Infos projet : titre, poste, description.
- Pour chaque session du projet ayant un rapport : nom candidat, score global, recommandation, scores par critère, résumé exécutif, forces, axes d'amélioration, soft skills, red flags, décision recruteur.
- Critères d'évaluation du projet (libellés + descriptions).
- **Pas** les transcripts complets en V1 (volume trop important).

**Modèle** : `google/gemini-3-flash-preview` via Lovable AI Gateway, streaming Vercel AI SDK.

**Prompt système** : persona « assistant recruteur expert », français, ton factuel, doit citer les noms, doit refuser les critères discriminatoires (origine, âge, genre, etc.).

## Architecture technique

**Tables** (2 nouvelles)

```text
copilot_threads
  id, project_id (FK projects), created_by (FK auth.users),
  title, created_at, updated_at

copilot_messages
  id, thread_id (FK copilot_threads, ON DELETE CASCADE),
  role ('user'|'assistant'), content (text),
  parts (jsonb pour AI SDK UIMessage), created_at
```

**RLS — privé par recruteur**
- `copilot_threads` : SELECT/INSERT/UPDATE/DELETE seulement si `created_by = auth.uid()` ET le projet est accessible (org member via `get_user_organization_id`).
- `copilot_messages` : accès uniquement via thread dont `created_by = auth.uid()`.

**Edge function** `supabase/functions/copilot-chat/index.ts`
- POST `{ threadId, messages }`.
- Vérifie le JWT et que le thread appartient bien à l'utilisateur.
- Charge contexte projet + rapports (1 requête optimisée).
- Construit system prompt + appelle `streamText` (Lovable AI Gateway).
- `onFinish` : sauvegarde le dernier message user + le message assistant complet (avec `parts`).
- Gère 429 / 402 / erreurs validation.
- Génère automatiquement le `title` du thread à partir du 1er message user (tronqué).

**Composants React**
- `src/components/copilot/CopilotFloatingButton.tsx` — bouton fixed, masqué selon route.
- `src/components/copilot/CopilotDrawer.tsx` — Sheet : header + ThreadSwitcher + ChatWindow.
- `src/components/copilot/CopilotThreadSwitcher.tsx` — dropdown sélection/nouveau/supprimer.
- `src/components/copilot/CopilotChatWindow.tsx` — `useChat` AI SDK, rendu `message.parts`, markdown via `react-markdown`.
- `src/components/copilot/CopilotSuggestions.tsx` — chips de questions suggérées.
- `src/contexts/CopilotContext.tsx` — état global (drawer ouvert/fermé, projet actif détecté).
- `src/hooks/queries/useCopilotThreads.ts` — React Query : liste/création/suppression/messages.

**Intégration**
- Monter `<CopilotProvider>` + `<CopilotFloatingButton/>` dans `AppLayout.tsx`.
- Détection du `projectId` via `useLocation` / `useParams`.

## Hors périmètre (V1)

- Pas de transcripts complets dans le contexte (potentiel V2 avec RAG).
- Pas d'actions automatiques depuis le chat (envoi mail, changement décision).
- Pas d'export ni de partage de conversation.
- Pas d'accès au chat depuis les pages candidat publiques.
