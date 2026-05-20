// One-shot : reconstruit qN.webm en streaming.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function rebuild(session_id: string, question_index: number) {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const folder = `interviews/${session_id}/q${question_index}`;
  const finalPath = `interviews/${session_id}/q${question_index}.webm`;

  await sb.storage.from("media").remove([finalPath]);

  const { data: chunks } = await sb.storage
    .from("media")
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  const files = (chunks ?? [])
    .filter((f) => f.name.startsWith("chunk-") && f.name.endsWith(".webm"))
    .sort((a, b) => a.name.localeCompare(b.name));
  console.log("chunks:", files.length);

  let i = 0;
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { session_id, question_index } = await req.json();
    if (!session_id || typeof question_index !== "number") {
      return new Response(JSON.stringify({ error: "session_id + question_index required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
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
