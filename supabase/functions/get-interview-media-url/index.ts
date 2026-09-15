// Délivre un lien temporaire (1 h) vers un enregistrement d'entretien,
// après vérification des droits :
//   - jeton candidat valide correspondant à la session du fichier
//   - OU utilisateur authentifié membre de l'organisation de la session
//   - OU super administrateur
//   - OU appel interne (service_role)
// Un lot peut couvrir plusieurs sessions : seules les sessions autorisées
// sont signées (les autres sont ignorées). Pour une seule session, le
// comportement historique est conservé : refus explicite si non autorisé.
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

  const sessionIds = [...new Set(paths.map(sessionIdFromPath).filter(Boolean) as string[])];
  if (sessionIds.length === 0) return json({ error: "Invalid path" }, 400);
  const singleSession = sessionIds.length === 1;

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
        session_id: sessionIds[0],
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

  const { data: sessions } = await sb
    .from("sessions")
    .select("id, token, organization_id")
    .in("id", sessionIds);
  const found = new Map((sessions ?? []).map((s) => [s.id as string, s]));
  if (singleSession && found.size === 0) return json({ error: "Not found", diagnosticId }, 404);

  const allowedSessions = new Set<string>();
  let actorType: "candidate" | "member" | "super_admin" | "internal" | "anonymous" = "anonymous";

  // 1) Jeton candidat : n'ouvre que sa propre session
  if (body.token) {
    for (const [id, s] of found) {
      if (s.token && body.token === s.token) allowedSessions.add(id);
    }
    if (allowedSessions.size > 0) actorType = "candidate";
  }

  // 2) Appel interne ou utilisateur authentifié
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    for (const id of found.keys()) allowedSessions.add(id);
    if (actorType === "anonymous") actorType = "internal";
  } else if (bearer) {
    const { data: userData } = await sb.auth.getUser(bearer);
    const userId = userData?.user?.id;
    if (userId) {
      const { data: isSuper } = await sb.rpc("is_super_admin", { _user_id: userId });
      if (isSuper) {
        for (const id of found.keys()) allowedSessions.add(id);
        if (actorType === "anonymous") actorType = "super_admin";
      } else {
        const orgIds = [...new Set([...found.values()].map((s) => s.organization_id as string))];
        const { data: memberships } = await sb
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .in("organization_id", orgIds);
        const myOrgs = new Set((memberships ?? []).map((m) => m.organization_id as string));
        for (const [id, s] of found) {
          if (myOrgs.has(s.organization_id)) allowedSessions.add(id);
        }
        if (allowedSessions.size > 0 && actorType === "anonymous") actorType = "member";
      }
    }
  }

  const allowedPaths = paths.filter((p) => allowedSessions.has(sessionIdFromPath(p) ?? ""));
  if (allowedPaths.length === 0) {
    await record(actorType, "forbidden", "authorization_failed");
    return json({ error: "Forbidden", diagnosticId }, 403);
  }

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrls(allowedPaths, EXPIRES_SECONDS);
  if (error || !data) {
    await record(actorType, "signing_failed", "storage_signing_failed");
    return json({ error: "Signing failed", diagnosticId }, 500);
  }

  const urls: Record<string, string> = {};
  data.forEach((item, i) => {
    if (item.signedUrl) urls[allowedPaths[i]] = item.signedUrl;
  });

  await record(actorType, "allowed", "signed");
  return json({ url: urls[allowedPaths[0]] ?? null, urls, expiresIn: EXPIRES_SECONDS, diagnosticId });
});
