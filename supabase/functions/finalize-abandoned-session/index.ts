// Finalise une session abandonnée (téléphone fermé / onglet tué) :
// - reconstitue q{i}.webm à partir des chunks uploadés au fil de l'eau,
// - écrit/met à jour le manifest,
// - passe la session en 'completed' (le trigger Postgres déclenchera la
//   transcription + génération du rapport via finalize-session).
//
// Idempotent : safe à appeler plusieurs fois.
// Public : appelée via navigator.sendBeacon (pas d'auth utilisateur).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function assembleQuestion(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
): Promise<boolean> {
  const folder = `interviews/${sessionId}/q${questionIndex}`;
  const finalPath = `interviews/${sessionId}/q${questionIndex}.webm`;

  // Si le blob final existe déjà, rien à faire.
  const { data: existing } = await supabase.storage
    .from("media")
    .list(`interviews/${sessionId}`, { limit: 1000 });
  if (existing?.some((f) => f.name === `q${questionIndex}.webm`)) {
    return true;
  }

  const { data: chunks } = await supabase.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  const chunkFiles = (chunks ?? [])
    .filter((f) => f.name.startsWith("chunk-") && f.name.endsWith(".webm"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (chunkFiles.length === 0) return false;

  // Téléchargement séquentiel pour limiter la mémoire et préserver l'ordre.
  const buffers: Uint8Array[] = [];
  for (const f of chunkFiles) {
    const { data, error } = await supabase.storage
      .from("media")
      .download(`${folder}/${f.name}`);
    if (error || !data) {
      console.error("download failed", folder, f.name, error?.message);
      continue;
    }
    buffers.push(new Uint8Array(await data.arrayBuffer()));
  }
  if (buffers.length === 0) return false;

  const totalLen = buffers.reduce((s, b) => s + b.byteLength, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of buffers) {
    merged.set(b, offset);
    offset += b.byteLength;
  }

  const blob = new Blob([merged], { type: "video/webm" });
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(finalPath, blob, { contentType: "video/webm", upsert: true });
  if (upErr) {
    console.error("upload final failed", finalPath, upErr.message);
    return false;
  }

  // Manifest (utile pour le lecteur fallback)
  const manifest = {
    sessionId,
    questionIndex,
    mimeType: "video/webm",
    chunks: chunkFiles.map((f) => `${folder}/${f.name}`),
    createdAt: new Date().toISOString(),
    recovered: true,
  };
  await supabase.storage
    .from("media")
    .upload(
      `${folder}/manifest.json`,
      new Blob([JSON.stringify(manifest)], { type: "application/json" }),
      { contentType: "application/json", upsert: true },
    );

  return true;
}

async function processSession(
  sessionId: string,
  lastQuestionIndex: number | null,
) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, started_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    console.log("finalize-abandoned: session not found", sessionId);
    return;
  }
  if (session.status === "completed" || session.status === "cancelled") {
    console.log("finalize-abandoned: already finalized", sessionId, session.status);
    return;
  }

  // Reconstitue toutes les questions ayant des chunks orphelins (par sécurité,
  // pas seulement la dernière).
  const { data: dirs } = await supabase.storage
    .from("media")
    .list(`interviews/${sessionId}`, { limit: 1000 });

  const questionDirs = (dirs ?? [])
    .filter((f) => f.id === null && /^q\d+$/.test(f.name))
    .map((f) => parseInt(f.name.slice(1), 10))
    .sort((a, b) => a - b);

  let recovered = 0;
  for (const idx of questionDirs) {
    try {
      const ok = await assembleQuestion(supabase, sessionId, idx);
      if (ok) recovered += 1;
    } catch (e) {
      console.error("assemble failed", sessionId, idx, e);
    }
  }

  if (recovered === 0 && (lastQuestionIndex == null || lastQuestionIndex < 0)) {
    console.log("finalize-abandoned: nothing to recover", sessionId);
    return;
  }

  const startedAt = (session as any).started_at
    ? new Date((session as any).started_at).getTime()
    : null;
  const durationSeconds = startedAt
    ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    : null;

  const { error: updErr } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
    } as any)
    .eq("id", sessionId);

  if (updErr) {
    console.error("session update failed", sessionId, updErr.message);
    return;
  }

  console.log(
    "finalize-abandoned: completed",
    sessionId,
    "recovered_questions=",
    recovered,
  );
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    // Lecture du body brut pour accepter aussi text/plain (sendBeacon sans preflight).
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const sessionId = typeof body?.session_id === "string" ? body.session_id : null;
    const lastQuestionIndex =
      typeof body?.last_question_index === "number" ? body.last_question_index : null;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // @ts-ignore EdgeRuntime global
    EdgeRuntime.waitUntil(
      processSession(sessionId, lastQuestionIndex).catch((e) =>
        console.error("finalize-abandoned error", sessionId, e),
      ),
    );

    return new Response(
      JSON.stringify({ status: "processing", session_id: sessionId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
