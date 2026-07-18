// Accepte un fichier vidéo réparé côté client et le stocke à la place du
// fichier original cassé (`interviews/{sid}/q{n}.{ext}`). Écrit via le
// service_role car les policies du bucket `media` sont restrictives pour les
// utilisateurs authentifiés côté client.
//
// Auth : le caller doit être un utilisateur authentifié appartenant à
// l'organisation propriétaire du projet lié à la session, ou un appel
// interne.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCallerOrInternal } from "../_shared/auth-guard.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret, x-session-id, x-question-index, x-extension",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EXT = new Set(["webm", "mp4"]);
const MAX_SIZE = 250 * 1024 * 1024; // 250 MB : marge large, une réponse fait généralement <30 MB.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const caller = await requireCallerOrInternal(req, cors);
  if (!caller.ok) return caller.response;

  try {
    const sessionId = req.headers.get("x-session-id");
    const questionIndexRaw = req.headers.get("x-question-index");
    const extension = (req.headers.get("x-extension") ?? "").toLowerCase();

    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return new Response(JSON.stringify({ error: "invalid x-session-id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const questionIndex = questionIndexRaw ? parseInt(questionIndexRaw, 10) : NaN;
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 999) {
      return new Response(JSON.stringify({ error: "invalid x-question-index" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_EXT.has(extension)) {
      return new Response(JSON.stringify({ error: "invalid x-extension (webm|mp4)" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `file too large (max ${MAX_SIZE} bytes)` }), {
        status: 413, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const buffer = new Uint8Array(await req.arrayBuffer());
    if (buffer.length === 0) {
      return new Response(JSON.stringify({ error: "empty body" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (buffer.length > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `file too large (max ${MAX_SIZE} bytes)` }), {
        status: 413, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Contrôle d'accès : si caller.userId présent, vérifier qu'il appartient
    // à l'organisation du projet de la session.
    if (caller.userId) {
      const { data: sess, error: sessErr } = await sb
        .from("sessions")
        .select("id, projects(organization_id)")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessErr || !sess) {
        return new Response(JSON.stringify({ error: "session not found" }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      // deno-lint-ignore no-explicit-any
      const orgId = (sess as any).projects?.organization_id as string | undefined;
      if (!orgId) {
        return new Response(JSON.stringify({ error: "session missing org" }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: member } = await sb
        .from("organization_members")
        .select("user_id")
        .eq("user_id", caller.userId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!member) {
        return new Response(JSON.stringify({ error: "not a member of the session org" }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const contentType = extension === "mp4" ? "video/mp4" : "video/webm";
    const targetPath = `interviews/${sessionId}/q${questionIndex}.${extension}`;
    const siblingExt = extension === "mp4" ? "webm" : "mp4";
    const siblingPath = `interviews/${sessionId}/q${questionIndex}.${siblingExt}`;

    const { error: upErr } = await sb.storage
      .from("media")
      .upload(targetPath, buffer, { contentType, upsert: true });
    if (upErr) throw upErr;

    // Si on a changé d'extension (WebM cassé → MP4), on efface l'ancien
    // pour que l'URL publique de la nouvelle extension soit la seule référence.
    try { await sb.storage.from("media").remove([siblingPath]); } catch { /* noop */ }

    console.log("stored repaired video", targetPath, buffer.length, "bytes");

    return new Response(
      JSON.stringify({ ok: true, path: targetPath, bytes: buffer.length, extension }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("store-repaired-video error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
