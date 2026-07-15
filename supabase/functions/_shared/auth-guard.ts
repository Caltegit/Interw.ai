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
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      // Tentative 1 : signing keys (rapide, sans round-trip)
      try {
        const { data, error } = await supabase.auth.getClaims(token);
        if (!error && data?.claims?.sub) {
          return {
            ok: true,
            internal: false,
            userId: String(data.claims.sub),
            email: typeof data.claims.email === "string" ? data.claims.email : undefined,
          };
        }
      } catch (_) { /* fallback getUser */ }
      // Tentative 2 : validation classique via GoTrue (compat toutes configs)
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        return {
          ok: true,
          internal: false,
          userId: userData.user.id,
          email: userData.user.email ?? undefined,
        };
      }
    } catch (_) {
      /* fall through to 401 */
    }
  }

  return { ok: false, response: unauthorized(cors) };
}
