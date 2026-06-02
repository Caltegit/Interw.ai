// One-shot : reconstruit qN.{webm|mp4} en streaming.
// Supporte deux modes :
//  1) Reconstruction depuis les chunks `q{N}/chunk-*` quand `q{N}.{webm|mp4}` est absent.
//  2) Réparation d'un `q{N}.webm` corrompu : on cherche la première occurrence de
//     la magic EBML (1A 45 DF A3) et on tronque les octets de préfixe invalides.
//
// Le format réel (webm vs mp4) est déterminé via :
//  - le manifest.json déposé par le front (mimeType),
//  - ou l'extension du fichier final existant,
//  - ou l'extension majoritaire des chunks (fallback : webm).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EBML_MAGIC = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

function indexOfMagic(buf: Uint8Array): number {
  outer: for (let i = 0; i <= buf.length - EBML_MAGIC.length; i++) {
    for (let j = 0; j < EBML_MAGIC.length; j++) {
      if (buf[i + j] !== EBML_MAGIC[j]) continue outer;
    }
    return i;
  }
  return -1;
}

async function detectFormat(
  sb: ReturnType<typeof createClient>,
  sessionId: string,
  questionIndex: number,
): Promise<{ ext: "webm" | "mp4"; contentType: string }> {
  const folder = `interviews/${sessionId}/q${questionIndex}`;
  const parent = `interviews/${sessionId}`;

  // 1) Manifest.json
  try {
    const { data: manifestBlob } = await sb.storage
      .from("media")
      .download(`${folder}/manifest.json`);
    if (manifestBlob) {
      const m = JSON.parse(await manifestBlob.text());
      const mt: string | undefined = m?.mimeType;
      if (mt?.startsWith("video/mp4")) return { ext: "mp4", contentType: "video/mp4" };
      if (mt?.startsWith("video/webm")) return { ext: "webm", contentType: "video/webm" };
    }
  } catch { /* noop */ }

  // 2) Fichier final existant
  try {
    const { data: siblings } = await sb.storage.from("media").list(parent, { limit: 1000 });
    const hasMp4 = (siblings ?? []).some((f) => f.name === `q${questionIndex}.mp4`);
    if (hasMp4) return { ext: "mp4", contentType: "video/mp4" };
    const hasWebm = (siblings ?? []).some((f) => f.name === `q${questionIndex}.webm`);
    if (hasWebm) return { ext: "webm", contentType: "video/webm" };
  } catch { /* noop */ }

  // 3) Extension majoritaire des chunks
  try {
    const { data: chunks } = await sb.storage.from("media").list(folder, { limit: 1000 });
    const mp4 = (chunks ?? []).filter((f) => f.name.endsWith(".mp4")).length;
    const webm = (chunks ?? []).filter((f) => f.name.endsWith(".webm")).length;
    if (mp4 > webm) return { ext: "mp4", contentType: "video/mp4" };
  } catch { /* noop */ }

  return { ext: "webm", contentType: "video/webm" };
}

async function rebuild(session_id: string, question_index: number, force = false) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const folder = `interviews/${session_id}/q${question_index}`;
  const parentFolder = `interviews/${session_id}`;

  const { ext, contentType } = await detectFormat(sb, session_id, question_index);
  const isMp4 = ext === "mp4";

  // Nettoie l'ancien fichier final dans l'AUTRE extension s'il existe
  // (évite d'avoir à la fois q15.webm cassé et q15.mp4 sain qui s'ignorent).
  const finalPath = `${parentFolder}/q${question_index}.${ext}`;
  const otherPath = `${parentFolder}/q${question_index}.${isMp4 ? "webm" : "mp4"}`;

  // ── 1) Tentative de réparation in-place du fichier WebM existant ────────────
  if (!force && !isMp4) {
    try {
      const { data: existing, error: dlErr } = await sb.storage
        .from("media")
        .download(finalPath);
      if (!dlErr && existing) {
        const buf = new Uint8Array(await existing.arrayBuffer());
        const idx = indexOfMagic(buf);
        if (idx === 0) {
          console.log("recover: q file already valid at offset 0, nothing to do");
          return { mode: "skip" as const, path: finalPath };
        }
        if (idx > 0) {
          console.log(`recover: truncating ${idx} junk bytes from ${finalPath}`);
          const truncated = buf.slice(idx);
          const { error: upErr } = await sb.storage
            .from("media")
            .upload(finalPath, truncated, {
              contentType: "video/webm",
              upsert: true,
            });
          if (upErr) throw upErr;
          return { mode: "truncate" as const, path: finalPath, droppedBytes: idx };
        }
        console.log("recover: EBML magic absent, falling back to chunk rebuild");
      }
    } catch (e) {
      console.warn("recover: in-place truncate failed, falling back to chunk rebuild", e);
    }
  }

  // ── 2) Reconstruction depuis les chunks intermédiaires ─────────────────────
  await sb.storage.from("media").remove([finalPath, otherPath]).catch(() => {});

  const { data: chunks } = await sb.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  // On accepte les deux extensions : certaines sessions hybrides ont des
  // chunks en .webm alors que le manifest annonce mp4 (ou l'inverse).
  // On filtre quand même sur l'extension cible pour ne pas mélanger les
  // conteneurs ; si rien ne matche on retombe sur tout.
  const all = (chunks ?? []).filter((f) => f.name.startsWith("chunk-"));
  const preferred = all.filter((f) => f.name.endsWith(`.${ext}`));
  const files = (preferred.length > 0 ? preferred : all).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  console.log("chunks:", files.length, "ext:", ext);

  if (files.length === 0) {
    throw new Error("no chunks available to rebuild from");
  }

  let firstValidIdx = 0;
  let droppedFromFirst = 0;
  if (!isMp4) {
    firstValidIdx = -1;
    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      const { data, error } = await sb.storage.from("media").download(`${folder}/${f.name}`);
      if (error || !data) continue;
      const buf = new Uint8Array(await data.arrayBuffer());
      const idx = indexOfMagic(buf);
      if (idx >= 0) {
        firstValidIdx = k;
        droppedFromFirst = idx;
        console.log(`recover: first EBML in ${f.name} at offset ${idx}; skipping ${k} earlier chunks`);
        break;
      }
    }
    if (firstValidIdx < 0) {
      throw new Error("no chunk contains an EBML header — unrecoverable");
    }
  }

  let i = firstValidIdx;
  let firstChunkConsumed = false;
  let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          if (!currentReader) {
            if (i >= files.length) { controller.close(); return; }
            const f = files[i++];
            const { data, error } = await sb.storage.from("media").download(`${folder}/${f.name}`);
            if (error || !data) { console.error("dl fail", f.name, error?.message); continue; }
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
          if (value?.byteLength) { controller.enqueue(value); return; }
        }
      } catch (e) { controller.error(e); }
    },
  });

  const { error: upErr } = await sb.storage
    .from("media")
    .upload(finalPath, stream as any, {
      contentType,
      upsert: true,
      duplex: "half",
    } as any);
  if (upErr) throw upErr;
  console.log("rebuilt", finalPath);
  return { mode: "rebuild" as const, path: finalPath, chunks: files.length, droppedFromFirst, ext };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { session_id, question_index, sync, force } = await req.json();
    if (!session_id || typeof question_index !== "number") {
      return new Response(JSON.stringify({ error: "session_id + question_index required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (sync) {
      const result = await rebuild(session_id, question_index, !!force);
      return new Response(JSON.stringify({ status: "done", ...result }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // @ts-ignore
    EdgeRuntime.waitUntil(rebuild(session_id, question_index, !!force).catch((e) => console.error("rebuild err", e)));
    return new Response(JSON.stringify({ status: "processing" }), {
      status: 202, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
