// Finalise une session abandonnée (téléphone fermé / onglet tué) :
// - reconstitue q{i}.{webm|mp4} à partir des chunks uploadés au fil de l'eau,
//   en détectant le format réel via le manifest ou l'extension des chunks,
// - renseigne session_messages.video_segment_url / audio_segment_url pour chaque
//   question récupérée (idempotent : ne touche que les URLs NULL),
// - passe la session en 'completed' (+ marque recovered_at) — le trigger Postgres
//   déclenchera la transcription + génération du rapport via finalize-session.
//
// Idempotent : safe à appeler plusieurs fois. Public : appelée par le front (sendBeacon).
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

const EBML_MAGIC = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

type ManifestData = {
  mimeType?: string;
  chunks?: string[];
};

type ChunkSource = {
  name: string;
  path: string;
  order: number;
};

type AssembleResult = {
  ok: boolean;
  ext?: "webm" | "mp4";
  videoPath?: string;
};

function indexOfMagic(buf: Uint8Array): number {
  outer: for (let i = 0; i <= buf.length - EBML_MAGIC.length; i++) {
    for (let j = 0; j < EBML_MAGIC.length; j++) {
      if (buf[i + j] !== EBML_MAGIC[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function parseChunkIndex(name: string): number {
  const match = name.match(/chunk-(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function extFromPath(path: string): "webm" | "mp4" | null {
  if (path.endsWith(".mp4")) return "mp4";
  if (path.endsWith(".webm")) return "webm";
  return null;
}

function sniffChunkFormat(buf: Uint8Array): "webm" | "mp4" | null {
  if (indexOfMagic(buf) >= 0) return "webm";
  if (buf.length >= 8) {
    const boxType = String.fromCharCode(buf[4], buf[5], buf[6], buf[7]);
    if (boxType === "ftyp" || boxType === "moof" || boxType === "moov" || boxType === "mdat") {
      return "mp4";
    }
  }
  return null;
}

function sortChunkSources(a: ChunkSource, b: ChunkSource): number {
  return parseChunkIndex(a.name) - parseChunkIndex(b.name) || a.order - b.order || a.name.localeCompare(b.name);
}

async function readManifest(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
): Promise<ManifestData | null> {
  const folder = `interviews/${sessionId}/q${questionIndex}`;
  try {
    const { data: manifestBlob } = await supabase.storage
      .from("media")
      .download(`${folder}/manifest.json`);
    if (!manifestBlob) return null;
    const m = JSON.parse(await manifestBlob.text());
    return {
      mimeType: typeof m?.mimeType === "string" ? m.mimeType : undefined,
      chunks: Array.isArray(m?.chunks) ? m.chunks.filter((v: unknown): v is string => typeof v === "string") : [],
    };
  } catch {
    return null;
  }
}

async function detectQuestionFormat(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
  manifest: ManifestData | null,
): Promise<{ ext: "webm" | "mp4"; contentType: string }> {
  const folder = `interviews/${sessionId}/q${questionIndex}`;
  const manifestPaths = manifest?.chunks ?? [];
  const mp4FromManifest = manifestPaths.filter((path) => path.endsWith(".mp4")).length;
  const webmFromManifest = manifestPaths.filter((path) => path.endsWith(".webm")).length;
  if (mp4FromManifest > webmFromManifest) return { ext: "mp4", contentType: "video/mp4" };
  if (webmFromManifest > 0) return { ext: "webm", contentType: "video/webm" };
  const mt: string | undefined = manifest?.mimeType;
  if (mt && mt.startsWith("video/mp4")) return { ext: "mp4", contentType: "video/mp4" };
  if (mt && mt.startsWith("video/webm")) return { ext: "webm", contentType: "video/webm" };
  try {
    const { data: chunks } = await supabase.storage
      .from("media")
      .list(folder, { limit: 1000 });
    const mp4 = (chunks ?? []).filter((f) => f.name.endsWith(".mp4")).length;
    const webm = (chunks ?? []).filter((f) => f.name.endsWith(".webm")).length;
    if (mp4 > webm) return { ext: "mp4", contentType: "video/mp4" };
    if (webm > 0) return { ext: "webm", contentType: "video/webm" };
  } catch {
    /* noop */
  }
  return { ext: "webm", contentType: "video/webm" };
}

async function resolveChunkSources(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
  manifest: ManifestData | null,
): Promise<ChunkSource[]> {
  const folder = `interviews/${sessionId}/q${questionIndex}`;
  const manifestChunks = (manifest?.chunks ?? [])
    .map((path, order) => ({ name: basename(path), path, order }))
    .filter((chunk) => chunk.name.startsWith("chunk-") && extFromPath(chunk.path));
  if (manifestChunks.length > 0) return manifestChunks.sort(sortChunkSources);

  const { data: chunks } = await supabase.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  return (chunks ?? [])
    .filter((f) => f.name.startsWith("chunk-") && (f.name.endsWith(".webm") || f.name.endsWith(".mp4")))
    .map((f, order) => ({ name: f.name, path: `${folder}/${f.name}`, order }))
    .sort(sortChunkSources);
}

async function refineFormatFromChunkContent(
  supabase: ReturnType<typeof createClient>,
  chunkFiles: ChunkSource[],
  current: { ext: "webm" | "mp4"; contentType: string },
): Promise<{ ext: "webm" | "mp4"; contentType: string }> {
  for (const file of chunkFiles.slice(0, 5)) {
    try {
      const { data, error } = await supabase.storage.from("media").download(file.path);
      if (error || !data) continue;
      const detected = sniffChunkFormat(new Uint8Array(await data.arrayBuffer()));
      if (detected === "mp4") return { ext: "mp4", contentType: "video/mp4" };
      if (detected === "webm") return { ext: "webm", contentType: "video/webm" };
    } catch { /* noop */ }
  }
  return current;
}

async function assembleQuestion(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
): Promise<AssembleResult> {
  const parent = `interviews/${sessionId}`;
  const folder = `${parent}/q${questionIndex}`;
  const manifestData = await readManifest(supabase, sessionId, questionIndex);
  const chunkFiles = await resolveChunkSources(supabase, sessionId, questionIndex, manifestData);
  const { ext, contentType } = await refineFormatFromChunkContent(
    supabase,
    chunkFiles,
    await detectQuestionFormat(supabase, sessionId, questionIndex, manifestData),
  );
  const finalName = `q${questionIndex}.${ext}`;
  const finalPath = `${parent}/${finalName}`;

  // Si un blob final existe déjà (webm ou mp4), on considère la question OK.
  const { data: existing } = await supabase.storage
    .from("media")
    .list(parent, { limit: 1000 });
  const alreadyExists = existing?.find(
    (f) => f.name === `q${questionIndex}.webm` || f.name === `q${questionIndex}.mp4`,
  );
  if (alreadyExists) {
    const existingExt = alreadyExists.name.endsWith(".mp4") ? "mp4" : "webm";
    return { ok: true, ext: existingExt, videoPath: `${parent}/${alreadyExists.name}` };
  }

  if (chunkFiles.length === 0) return { ok: false };

  // Pour les WebM : démarrer sur un init segment EBML valide.
  let firstValidIdx = 0;
  let droppedFromFirst = 0;
  if (ext === "webm") {
    firstValidIdx = -1;
    for (let k = 0; k < chunkFiles.length; k++) {
      const f = chunkFiles[k];
      const { data, error } = await supabase.storage.from("media").download(f.path);
      if (error || !data) continue;
      const buf = new Uint8Array(await data.arrayBuffer());
      const idx = indexOfMagic(buf);
      if (idx >= 0) {
        firstValidIdx = k;
        droppedFromFirst = idx;
        break;
      }
    }
    if (firstValidIdx < 0) {
      console.error("finalize-abandoned: no EBML header found", sessionId, questionIndex);
      return { ok: false };
    }
  }

  // Assemblage en streaming.
  let i = firstValidIdx;
  let firstChunkConsumed = false;
  let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          if (!currentReader) {
            if (i >= chunkFiles.length) { controller.close(); return; }
            const f = chunkFiles[i++];
            const { data, error } = await supabase.storage.from("media").download(f.path);
            if (error || !data) { console.error("download failed", f.path, error?.message); continue; }
            currentReader = data.stream().getReader();
            if (!firstChunkConsumed && droppedFromFirst > 0) {
              const parts: Uint8Array[] = [];
              while (true) {
                const { value, done } = await currentReader.read();
                if (done) break;
                if (value?.byteLength) parts.push(value);
              }
              currentReader = null;
              const total = parts.reduce((n, p) => n + p.byteLength, 0);
              const merged = new Uint8Array(total);
              let off = 0;
              for (const p of parts) { merged.set(p, off); off += p.byteLength; }
              firstChunkConsumed = true;
              if (droppedFromFirst < merged.byteLength) {
                controller.enqueue(merged.slice(droppedFromFirst));
                return;
              }
              continue;
            }
            firstChunkConsumed = true;
          }
          const { value, done } = await currentReader.read();
          if (done) { currentReader = null; continue; }
          if (value && value.byteLength > 0) { controller.enqueue(value); return; }
        }
      } catch (e) { controller.error(e); }
    },
    async cancel() { try { await currentReader?.cancel(); } catch { /* noop */ } },
  });

  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(finalPath, stream as any, {
      contentType,
      upsert: true,
      duplex: "half",
    } as any);
  if (upErr) {
    console.error("upload final failed", finalPath, upErr.message);
    return { ok: false };
  }

  // Manifest récap (variable renommée pour éviter le shadow de manifestData).
  const finalManifest = {
    sessionId,
    questionIndex,
    mimeType: contentType,
    chunks: chunkFiles.map((f) => f.path),
    createdAt: new Date().toISOString(),
    recovered: true,
  };
  await supabase.storage
    .from("media")
    .upload(
      `${folder}/manifest.json`,
      new Blob([JSON.stringify(finalManifest)], { type: "application/json" }),
      { contentType: "application/json", upsert: true },
    );

  return { ok: true, ext, videoPath: finalPath };
}

// Vérifie si un fichier existe dans le bucket storage.
async function storageObjectExists(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<boolean> {
  const parent = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop()!;
  try {
    const { data } = await supabase.storage.from("media").list(parent, { limit: 1000 });
    return !!data?.some((f) => f.name === name);
  } catch { return false; }
}

// Idempotent : met à jour session_messages.video_segment_url + audio_segment_url
// pour la question au rang donné (order_index). Ne touche jamais une URL déjà renseignée.
async function linkMediaToMessage(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  projectId: string,
  questionIndex: number,
  videoPath: string,
): Promise<{ updated: number; error?: string }> {
  // 1. Résoudre le question_id via project + order_index.
  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id")
    .eq("project_id", projectId)
    .eq("order_index", questionIndex)
    .maybeSingle();
  if (qErr || !q?.id) {
    return { updated: 0, error: qErr?.message ?? `no question at order_index=${questionIndex}` };
  }

  // 2. Vérifier présence audio.m4a (peut ne pas exister → on n'écrit pas d'URL 404).
  const audioPath = `interviews/${sessionId}/q${questionIndex}.audio.m4a`;
  const audioExists = await storageObjectExists(supabase, audioPath);

  // 3. UPDATE idempotent : ne touche que si video_segment_url IS NULL.
  const patch: Record<string, unknown> = { video_segment_url: videoPath };
  if (audioExists) patch.audio_segment_url = audioPath;

  const { data: updated, error: uErr } = await supabase
    .from("session_messages")
    .update(patch)
    .eq("session_id", sessionId)
    .eq("question_id", (q as any).id)
    .eq("role", "candidate")
    .is("video_segment_url", null)
    .select("id");
  if (uErr) return { updated: 0, error: uErr.message };
  return { updated: (updated ?? []).length };
}

async function processSession(sessionId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, started_at, project_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) { console.log("finalize-abandoned: session not found", sessionId); return; }
  if ((session as any).status === "completed") {
    console.log("finalize-abandoned: already completed", sessionId);
    return;
  }
  const projectId = (session as any).project_id as string | null;
  if (!projectId) { console.error("finalize-abandoned: no project_id", sessionId); return; }

  // Liste toutes les questions ayant des chunks orphelins.
  const { data: dirs } = await supabase.storage
    .from("media")
    .list(`interviews/${sessionId}`, { limit: 1000 });

  const questionDirs = (dirs ?? [])
    .filter((f) => f.id === null && /^q\d+$/.test(f.name))
    .map((f) => parseInt(f.name.slice(1), 10))
    .sort((a, b) => a - b);

  let recoveredQuestions = 0;
  let messagesUpdated = 0;
  const details: Array<{ idx: number; ok: boolean; updated: number; error?: string }> = [];

  for (const idx of questionDirs) {
    try {
      const result = await assembleQuestion(supabase, sessionId, idx);
      if (result.ok && result.videoPath) {
        recoveredQuestions += 1;
        const link = await linkMediaToMessage(supabase, sessionId, projectId, idx, result.videoPath);
        messagesUpdated += link.updated;
        details.push({ idx, ok: true, updated: link.updated, error: link.error });
      } else {
        details.push({ idx, ok: false, updated: 0 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("assemble failed", sessionId, idx, msg);
      details.push({ idx, ok: false, updated: 0, error: msg });
    }
  }

  if (recoveredQuestions === 0) {
    // Aucun média récupérable → on garde le status actuel (cancelled ou in_progress).
    // Si la session n'était pas encore cancelled, on la ferme.
    if ((session as any).status !== "cancelled") {
      await supabase
        .from("sessions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any)
        .eq("id", sessionId);
    }
    console.log("finalize-abandoned: no media recovered", sessionId);
    return;
  }

  const startedAt = (session as any).started_at ? new Date((session as any).started_at).getTime() : null;
  const durationSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null;
  const wasCancelled = (session as any).status === "cancelled";

  const { error: updErr } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(wasCancelled ? { cancelled_at: null, recovered_at: new Date().toISOString() } : {}),
      ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
    } as any)
    .eq("id", sessionId);

  if (updErr) { console.error("session update failed", sessionId, updErr.message); return; }

  console.log(JSON.stringify({
    tag: "finalize-abandoned:recovered",
    sessionId,
    recoveredQuestions,
    messagesUpdated,
    wasCancelled,
    details,
  }));
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const sessionId = typeof body?.session_id === "string" ? body.session_id : null;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // @ts-ignore EdgeRuntime global
    EdgeRuntime.waitUntil(
      processSession(sessionId).catch((e) => console.error("finalize-abandoned error", sessionId, e)),
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
