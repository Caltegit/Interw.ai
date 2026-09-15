// Délivre un lien temporaire (1 h) vers un enregistrement d'entretien,
// après vérification des droits :
//   - jeton candidat valide correspondant à la session du fichier
//   - OU utilisateur authentifié membre de l'organisation de la session
//   - OU super administrateur
//   - OU appel interne (service_role)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { toStoragePath } from "../_shared/interview-media.ts";

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

const BodySchema = z.object({
  path: z.string().min(1).max(2048).optional(),
  url: z.string().min(1).max(2048).optional(),
  token: z.string().min(1).max(256).optional(),
  paths: z.array(z.string().min(1).max(2048)).min(1).max(50).optional(),
});

function sessionIdFromPath(path: string): string | null {
  const parts = path.split("/");
  const id = parts[1] ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const diagnosticId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid body", diagnosticId }, 400);
    body = parsed.data;
  } catch {
    return json({ error: "Invalid body", diagnosticId }, 400);
  }

  const rawList = Array.isArray(body.paths) && body.paths.length
    ? body.paths
    : [body.path ?? body.url ?? ""];
  if (rawList.length === 0 || rawList.length > 50) return json({ error: "Invalid paths" }, 400);

  const paths: string[] = [];
  for (const raw of rawList) {
    const p = toStoragePath(String(raw ?? ""));
    if (!p || !p.startsWith("interviews/")) return json({ error: "Invalid path", diagnosticId }, 400);
    paths.push(p);
  }

  const sessionIds = new Set(paths.map(sessionIdFromPath).filter(Boolean) as string[]);
  if (sessionIds.size !== 1) return json({ error: "Invalid path" }, 400);
  const sessionId = [...sessionIds][0];

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const record = async (
    actorType: "candidate" | "member" | "super_admin" | "internal" | "anonymous",
    outcome: "allowed" | "forbidden" | "not_found" | "signing_failed" | "invalid_request",
    reason: string,
  ) => {
    try {
      await sb.from("media_access_logs").insert({
        diagnostic_id: diagnosticId,
        session_id: sessionId,
        storage_path: paths[0].slice(0, 500),
        actor_type: actorType,
        outcome,
        reason,
        duration_ms: Date.now() - startedAt,
      });
    } catch { /* le diagnostic ne doit jamais bloquer la lecture */ }
  };
  // Purge opportuniste : aucune donnée technique n'est conservée au-delà de 7 jours.
  void sb.from("media_access_logs").delete().lt("expires_at", new Date().toISOString());

  const { data: session } = await sb
    .from("sessions")
    .select("id, token, organization_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return json({ error: "Not found", diagnosticId }, 404);

  let allowed = false;
  let actorType: "candidate" | "member" | "super_admin" | "internal" | "anonymous" = "anonymous";

  // 1) Jeton candidat
  if (body.token && session.token && body.token === session.token) {
    allowed = true;
    actorType = "candidate";
  }

  // 2) Appel interne ou utilisateur authentifié
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!allowed && bearer) {
    if (bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      allowed = true;
      actorType = "internal";
    } else {
      const { data: userData } = await sb.auth.getUser(bearer);
      const userId = userData?.user?.id;
      if (userId) {
        const { data: isMember } = await sb.rpc("is_org_member", {
          _user_id: userId,
          _org_id: session.organization_id,
        });
        if (isMember) {
          allowed = true;
          actorType = "member";
        }
        if (!allowed) {
          const { data: isSuper } = await sb.rpc("is_super_admin", { _user_id: userId });
          if (isSuper) {
            allowed = true;
            actorType = "super_admin";
          }
        }
      }
    }
  }

  if (!allowed) {
    await record(actorType, "forbidden", "authorization_failed");
    return json({ error: "Forbidden", diagnosticId }, 403);
  }

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrls(paths, EXPIRES_SECONDS);
  if (error || !data) {
    await record(actorType, "signing_failed", "storage_signing_failed");
    return json({ error: "Signing failed", diagnosticId }, 500);
  }

  const urls: Record<string, string> = {};
  data.forEach((item, i) => {
    if (item.signedUrl) urls[paths[i]] = item.signedUrl;
  });

  await record(actorType, "allowed", "signed");
  return json({ url: urls[paths[0]] ?? null, urls, expiresIn: EXPIRES_SECONDS, diagnosticId });
});
