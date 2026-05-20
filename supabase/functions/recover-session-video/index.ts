// One-shot : reconstruit un fichier qN.webm tronqué à partir des chunks bruts.
// Body: { session_id: string, question_index: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { session_id, question_index } = await req.json();
    if (!session_id || typeof question_index !== "number") {
      return new Response(JSON.stringify({ error: "session_id + question_index required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const folder = `interviews/${session_id}/q${question_index}`;
    const finalPath = `interviews/${session_id}/q${question_index}.webm`;

    // Supprime le final tronqué s'il existe.
    await sb.storage.from("media").remove([finalPath]);

    const { data: chunks, error: listErr } = await sb.storage
      .from("media")
      .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (listErr) throw listErr;
    const files = (chunks ?? [])
      .filter((f) => f.name.startsWith("chunk-") && f.name.endsWith(".webm"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "no chunks found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const parts: Uint8Array[] = [];
    let total = 0;
    for (const f of files) {
      const { data, error } = await sb.storage.from("media").download(`${folder}/${f.name}`);
      if (error || !data) {
        console.error("download fail", f.name, error?.message);
        continue;
      }
      const buf = new Uint8Array(await data.arrayBuffer());
      parts.push(buf);
      total += buf.byteLength;
    }

    const merged = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { merged.set(p, off); off += p.byteLength; }

    const { error: upErr } = await sb.storage
      .from("media")
      .upload(finalPath, merged, { contentType: "video/webm", upsert: true });
    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ ok: true, chunks: files.length, bytes: total, path: finalPath }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
