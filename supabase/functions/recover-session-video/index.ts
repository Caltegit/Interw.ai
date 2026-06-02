// One-shot : reconstruit qN.webm en streaming.
// Supporte deux modes :
//  1) Reconstruction depuis les chunks `q{N}/chunk-*.webm` quand `q{N}.webm` est absent.
//  2) Réparation d'un `q{N}.webm` corrompu : on cherche la première occurrence de
//     la magic EBML (1A 45 DF A3) et on tronque les octets de préfixe invalides.
//     Cas typique : la dernière question d'une session avait été polluée par
//     ~1 s de chunks mid-stream d'un recorder précédent encore actif.
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

async function rebuild(session_id: string, question_index: number) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const folder = `interviews/${session_id}/q${question_index}`;
  const finalPath = `interviews/${session_id}/q${question_index}.webm`;

  // ── 1) Tentative de réparation in-place du `q{N}.webm` existant ────────────
  // Si le fichier est présent mais que sa magic EBML est en offset > 0, on le
  // tronque puis on le ré-upload. Beaucoup moins coûteux que de tout recoller.
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
      console.log("recover: EBML magic absent from existing file, falling back to chunk rebuild");
    }
  } catch (e) {
    console.warn("recover: in-place truncate failed, falling back to chunk rebuild", e);
  }

  // ── 2) Reconstruction depuis les chunks intermédiaires ─────────────────────
  await sb.storage.from("media").remove([finalPath]);

  const { data: chunks } = await sb.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  const files = (chunks ?? [])
    .filter((f) => f.name.startsWith("chunk-") && f.name.endsWith(".webm"))
    .sort((a, b) => a.name.localeCompare(b.name));
  console.log("chunks:", files.length);

  if (files.length === 0) {
    throw new Error("no chunks available to rebuild from");
  }

  // On va d'abord scanner les premiers chunks pour trouver le premier qui
  // contient la magic EBML, et tronquer son préfixe le cas échéant. Les chunks
  // suivants sont concaténés tels quels.
  let droppedFromFirst = 0;
  let firstValidIdx = -1;
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
            // Le tout premier chunk valide doit être tronqué pour démarrer
            // exactement sur la magic EBML.
            if (!firstChunkConsumed && droppedFromFirst > 0) {
              // On lit en entier ce premier chunk, on tronque, on enqueue.
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
      contentType: "video/webm",
      upsert: true,
      duplex: "half",
    } as any);
  if (upErr) throw upErr;
  console.log("rebuilt", finalPath);
  return { mode: "rebuild" as const, path: finalPath, chunks: files.length, droppedFromFirst };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { session_id, question_index, sync } = await req.json();
    if (!session_id || typeof question_index !== "number") {
      return new Response(JSON.stringify({ error: "session_id + question_index required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Mode synchrone (utile pour le bouton "Tenter récupération" côté UI : on
    // veut attendre la fin avant de rafraîchir le lecteur).
    if (sync) {
      const result = await rebuild(session_id, question_index);
      return new Response(JSON.stringify({ status: "done", ...result }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // @ts-ignore
    EdgeRuntime.waitUntil(rebuild(session_id, question_index).catch((e) => console.error("rebuild err", e)));
    return new Response(JSON.stringify({ status: "processing" }), {
      status: 202, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
