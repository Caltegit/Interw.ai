// Délivre un lien temporaire (1 h) vers un enregistrement d'entretien,
// après vérification des droits :
//   - jeton candidat valide correspondant à la session du fichier
//   - OU utilisateur authentifié membre de l'organisation de la session
//   - OU super administrateur
//   - OU appel interne (service_role)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const BUCKET = "media";
const EXPIRES_SECONDS = 3600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Accepte un chemin (`interviews/…`) ou une adresse absolue héritée. */
function toStoragePath(input: string): string | null {
  if (!input) return null;
  let path = input.trim();
  const marker = `/object/public/${BUCKET}/`;
  const idx = path.indexOf(marker);
  if (idx !== -1) path = path.slice(idx + marker.length);
  const signMarker = `/object/sign/${BUCKET}/`;
  const sIdx = path.indexOf(signMarker);
  if (sIdx !== -1) path = path.slice(sIdx + signMarker.length);
  path = path.split("?")[0];
  path = decodeURIComponent(path.replace(/^\/+/, ""));
  if (path.includes("..")) return null;
  if (!path.startsWith("interviews/")) return null;
  return path;
}

function sessionIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const id = parts[1] ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { path?: string; url?: string; token?: string; paths?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const rawList = Array.isArray(body.paths) && body.paths.length
    ? body.paths
    : [body.path ?? body.url ?? ""];
  if (rawList.length === 0 || rawList.length > 50) return json({ error: "Invalid paths" }, 400);

  const paths: string[] = [];
  for (const raw of rawList) {
    const p = toStoragePath(String(raw ?? ""));
    if (!p) return json({ error: "Invalid path" }, 400);
    paths.push(p);
  }

  const sessionIds = new Set(paths.map(sessionIdFromPath).filter(Boolean) as string[]);
  if (sessionIds.size !== 1) return json({ error: "Invalid path" }, 400);
  const sessionId = [...sessionIds][0];

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session } = await sb
    .from("sessions")
    .select("id, token, organization_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return json({ error: "Not found" }, 404);

  let allowed = false;

  // 1) Jeton candidat
  if (body.token && session.token && body.token === session.token) allowed = true;

  // 2) Appel interne ou utilisateur authentifié
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!allowed && bearer) {
    if (bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      allowed = true;
    } else {
      const { data: userData } = await sb.auth.getUser(bearer);
      const userId = userData?.user?.id;
      if (userId) {
        const { data: isMember } = await sb.rpc("is_org_member", {
          _user_id: userId,
          _org_id: session.organization_id,
        });
        if (isMember) allowed = true;
        if (!allowed) {
          const { data: isSuper } = await sb.rpc("is_super_admin", { _user_id: userId });
          if (isSuper) allowed = true;
        }
      }
    }
  }

  if (!allowed) return json({ error: "Forbidden" }, 403);

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrls(paths, EXPIRES_SECONDS);
  if (error || !data) return json({ error: "Signing failed" }, 500);

  const urls: Record<string, string> = {};
  data.forEach((item, i) => {
    if (item.signedUrl) urls[paths[i]] = item.signedUrl;
  });

  return json({ url: urls[paths[0]] ?? null, urls, expiresIn: EXPIRES_SECONDS });
});
