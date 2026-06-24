## Bug

Sur l'URL `/projects/new` (création de projet), le copilote IA appelle la base avec `project_id = "new"`, ce qui déclenche `invalid input syntax for type uuid: "new"`.

**Cause** : dans `CopilotContext.tsx`, `PROJECT_ROUTE_PATTERNS` inclut `"/projects/:id"`. Or `matchPath("/projects/:id", "/projects/new")` matche et renvoie `params.id = "new"`. → `activeProjectId = "new"` → `useCopilotThreads` exécute `.eq("project_id", "new")` → erreur Postgres.

## Correctif

Dans `src/contexts/CopilotContext.tsx`, ignorer la valeur `"new"` (et toute valeur non-UUID) lors de l'extraction de `projectFromRoute` :

```ts
const RESERVED_PROJECT_IDS = new Set(["new", "archives"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const projectFromRoute = useMemo<string | null>(() => {
  for (const pattern of PROJECT_ROUTE_PATTERNS) {
    const match = matchPath({ path: pattern, end: false }, location.pathname);
    const id = match?.params?.id;
    if (id && !RESERVED_PROJECT_IDS.has(id) && UUID_RE.test(id)) return id;
  }
  return null;
}, [location.pathname]);
```

Sur `/projects/new`, `activeProjectId` redevient `null` → le copilote affiche `CopilotProjectPicker` (déjà géré) au lieu de planter.

## Fichier touché

- `src/contexts/CopilotContext.tsx` — garde-fou sur `projectFromRoute`.

## Validation

- Naviguer sur `/projects/new`, ouvrir le copilote → plus d'erreur SQL, le picker s'affiche.
- Naviguer sur un projet existant (`/projects/<uuid>`) → le copilote charge bien les threads.
- Naviguer sur `/projects/archives` → idem, pas de plantage (même si la route est gérée séparément, ça blinde).
