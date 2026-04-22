# Durcissement architecture — état d'avancement

## ✅ Lot 1 — Hygiène (FAIT)

- **1.1 Index BDD** : 28 nouveaux index ajoutés via migration sur sessions, session_messages, reports, questions, evaluation_criteria, projects, user_roles, profiles, transcripts, templates, etc.
- **1.2 Sélection ciblée** : `select("*")` remplacés par colonnes explicites dans Dashboard, Projects, ProjectDetail.
- **1.3 React Query** :
  - `src/lib/queryClient.ts` — client centralisé (staleTime 30s, gcTime 5min, retry 1)
  - `src/hooks/queries/useDashboardData.ts` — Dashboard cache + invalidation
  - `src/hooks/queries/useProjectsList.ts` — Projects cache + invalidation
  - Migrations : Dashboard et Projects utilisent désormais le cache.

## ⚠️ Lot 2 — Refacto InterviewStart (NON FAIT — décision pragmatique)

`InterviewStart.tsx` (2092 lignes) est le fichier le plus critique en production. Le refactoriser sans suite de tests dédiée est trop risqué pour un dîner.

**Recommandation pour la prochaine fois** :
1. Ajouter d'abord 5-10 tests Playwright qui couvrent les flux critiques (start, record, pause, complete, resume).
2. Puis extraire dans cet ordre : `useExamRoomLock` → `useInterviewTimer` → `useSpeechRecognition` → `useMediaRecorder` → `useInterviewSession`.
3. Tester après chaque extraction.

## ✅ Lot 3 partiel — Scalabilité (FAIT en partie)

- **3.1 Pagination** : ✅ Projects (20/page), ✅ ProjectDetail sessions (20/page). AdminEmails l'avait déjà.
- **3.2 Virtualisation messages** : ✅ FAIT pour `SessionDetail` via `VirtualizedMessageList` (`@tanstack/react-virtual`). InterviewStart n'affiche pas de liste — non concerné.
- **3.3 Logger** : ✅ `src/lib/logger.ts` + branchement auth (user_id auto). Utilisé sur erreurs critiques (delete projet).
- **3.4 ProjectForm partagé** : ✅ FAIT. `src/components/project/ProjectForm.tsx` centralise UI + état du wizard (5 étapes). `ProjectNew.tsx` (756 → ~290 lignes) et `ProjectEdit.tsx` (792 → ~340 lignes) deviennent des wrappers focalisés sur la persistance. Test E2E `project-edit.spec.ts` ajouté en filet de sécurité.

## Ce qui reste à faire (sessions futures)

- ~~Migrer SessionDetail et Settings vers React Query.~~ ✅ FAIT (hooks `useSessionDetail`, `useOrganization`, `useProfile`).
- ~~Brancher logger.error sur les points critiques de InterviewStart (uploads, IA, STT).~~ ✅ FAIT (média, recorder, uploads, STT, AI turn, TTS, génération rapport, mises à jour session).
- Refacto InterviewStart (Lot 2) avec tests préalables.
- Refacto ProjectForm partagé (Lot 3.4).
- Virtualisation des messages d'entretien (Lot 3.2).
