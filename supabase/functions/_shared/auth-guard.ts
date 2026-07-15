// Gardes d'authentification partagés pour les edge functions.
// Deux modes :
//   - requireInternal(req) : n'accepte que les appels internes (cron / worker /
//     autre edge function). Accepte le service_role key ou INTERNAL_FUNCTION_SECRET
//     via l'entête `x-internal-secret` ou `Authorization: Bearer <key>`.
//   - requireCallerOrInternal(req) : accepte les appels internes OU un utilisateur
//     authentifié (JWT valide). Renvoie l'ID user quand disponible.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const SHARED_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function unauthorized(cors: Record<string, string> = SHARED_CORS): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

function isInternalToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internal = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  if (svc && token === svc) return true;
  if (internal && token === internal) return true;
  return false;
}

/**
 * Bloque tout appel externe : seul un cron/worker/edge function interne
 * (portant le service_role ou INTERNAL_FUNCTION_SECRET) est autorisé.
 * Retourne `null` si OK, sinon une `Response` 401 à renvoyer immédiatement.
 */
export function requireInternal(
  req: Request,
  cors: Record<string, string> = SHARED_CORS,
): Response | null {
  const internalHeader = req.headers.get("x-internal-secret");
  if (isInternalToken(internalHeader)) return null;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && isInternalToken(authHeader.slice(7))) {
    return null;
  }
  return unauthorized(cors);
}

export type CallerResult =
  | { ok: true; internal: true; userId: null }
  | { ok: true; internal: false; userId: string; email?: string }
  | { ok: false; response: Response };

/**
 * Accepte :
 *  - un appel interne (service_role ou INTERNAL_FUNCTION_SECRET)
 *  - OU un JWT utilisateur valide
 * Retourne `{ ok: true }` ou `{ ok: false, response }` à renvoyer.
 */
export async function requireCallerOrInternal(
  req: Request,
  cors: Record<string, string> = SHARED_CORS,
): Promise<CallerResult> {
  const internalHeader = req.headers.get("x-internal-secret");
  if (isInternalToken(internalHeader)) return { ok: true, internal: true, userId: null };

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    if (isInternalToken(token)) return { ok: true, internal: true, userId: null };
    try {
      // Utilise SERVICE_ROLE (garanti présent) pour valider le token utilisateur
      // via l'API GoTrue — évite les surprises de config sur SUPABASE_ANON_KEY.
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        return {
          ok: true,
          internal: false,
          userId: userData.user.id,
          email: userData.user.email ?? undefined,
        };
      }
      console.warn("[auth-guard] getUser failed", userErr?.message ?? "no user");
    } catch (e) {
      console.warn("[auth-guard] exception", e instanceof Error ? e.message : String(e));
    }
  }

  return { ok: false, response: unauthorized(cors) };
}
