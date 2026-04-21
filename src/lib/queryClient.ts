import { QueryClient } from "@tanstack/react-query";

/**
 * Client React Query centralisé.
 *
 * - staleTime de 30 s : on évite les refetch en boucle lors des navigations rapides.
 * - gcTime de 5 min : les données restent en cache après démontage.
 * - retry 1 : on retente une fois les requêtes en échec (réseau flaky).
 * - refetchOnWindowFocus désactivé : trop agressif pour notre usage.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Clés de cache centralisées pour invalidation cohérente. */
export const queryKeys = {
  dashboard: (userId: string) => ["dashboard", userId] as const,
  projects: (userId: string) => ["projects", userId] as const,
  project: (id: string) => ["project", id] as const,
  projectSessions: (id: string) => ["project-sessions", id] as const,
  session: (id: string) => ["session", id] as const,
  organization: (id: string) => ["organization", id] as const,
};
