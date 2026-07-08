// Répare les sessions dont les segments vidéo/audio ont été uploadés avec
// l'extension `.webm` alors que le conteneur réel est MP4 (cas Safari/iOS
// avant le correctif d'`InterviewStart`). Sans cette réparation, le CDN sert
// les fichiers avec `Content-Type: video/webm` et le `<video>` du rapport
// refuse de décoder → vidéo « ne fonctionne pas ».
//
// Pour chaque segment :
//   1. télécharge les 16 premiers octets et détecte la signature
//      - MP4   : `ftyp` à l'offset 4
//      - WebM  : `1A 45 DF A3` à l'offset 0
//   2. si la signature ne correspond pas à l'extension du chemin :
//      - télécharge le blob complet
//      - réuploade sous une nouvelle URL `.mp4` avec le bon `contentType`
//      - met à jour `session_messages.video_segment_url` / `audio_segment_url`
//      - et `sessions.video_recording_url` si concerné
//
// Idempotent : si tout est déjà cohérent, ne touche à rien.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCallerOrInternal } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "media";

function detectKind(head: Uint8Array): "mp4" | "webm" | "unknown" {
  if (head.length >= 8) {
    // 'ftyp' = 66 74 79 70
    if (
      head[4] === 0x66 &&
      head[5] === 0x74 &&
      head[6] === 0x79 &&
      head[7] === 0x70
    ) {
      return "mp4";
    }
  }
  if (
    head.length >= 4 &&
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  ) {
    return "webm";
  }
  return "unknown";
}

function pathFromPublicUrl(url: string): string | null {
  // .../object/public/media/<path>
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

interface SegmentReport {
  url: string;
  path: string;
  kind: "mp4" | "webm" | "unknown";
  action: "ok" | "renamed" | "skipped" | "missing" | "error";
  newUrl?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const caller = await requireCallerOrInternal(req, corsHeaders);
  if (!caller.ok) return caller.response;

  try {
    const { session_id, dry_run = false } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .select("id, video_recording_url")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("Session introuvable");

    const { data: messages, error: mErr } = await supabase
      .from("session_messages")
      .select("id, video_segment_url, audio_segment_url")
      .eq("session_id", session_id);
    if (mErr) throw mErr;

    const reports: SegmentReport[] = [];

    const processOne = async (
      url: string | null,
      isAudio: boolean,
    ): Promise<{ newUrl: string | null; report: SegmentReport | null }> => {
      if (!url) return { newUrl: null, report: null };
      const path = pathFromPublicUrl(url);
      if (!path) return { newUrl: null, report: null };

      // Sniff
      const headResp = await fetch(url, { headers: { Range: "bytes=0-15" } });
      if (!headResp.ok) {
        const r: SegmentReport = { url, path, kind: "unknown", action: "missing" };
        reports.push(r);
        return { newUrl: null, report: r };
      }
      const head = new Uint8Array(await headResp.arrayBuffer());
      const kind = detectKind(head);

      const isWebmPath = path.endsWith(".webm");
      const needsRename = kind === "mp4" && isWebmPath;

      if (!needsRename) {
        const r: SegmentReport = { url, path, kind, action: "ok" };
        reports.push(r);
        return { newUrl: null, report: r };
      }

      if (dry_run) {
        const r: SegmentReport = { url, path, kind, action: "skipped" };
        reports.push(r);
        return { newUrl: null, report: r };
      }

      // Téléchargement complet + réupload sous .mp4 (ou .audio.mp4)
      const newPath = isAudio
        ? path.replace(/\.audio\.webm$/, ".audio.mp4").replace(/\.webm$/, ".mp4")
        : path.replace(/\.webm$/, ".mp4");
      const contentType = isAudio ? "audio/mp4" : "video/mp4";

      try {
        const fullResp = await fetch(url);
        if (!fullResp.ok) throw new Error(`download ${fullResp.status}`);
        const buf = new Uint8Array(await fullResp.arrayBuffer());

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(newPath, buf, { contentType, upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
        const r: SegmentReport = {
          url,
          path,
          kind,
          action: "renamed",
          newUrl: pub.publicUrl,
        };
        reports.push(r);
        return { newUrl: pub.publicUrl, report: r };
      } catch (e) {
        const r: SegmentReport = {
          url,
          path,
          kind,
          action: "error",
          error: String((e as Error).message ?? e),
        };
        reports.push(r);
        return { newUrl: null, report: r };
      }
    };

    // Messages
    for (const msg of messages ?? []) {
      const vid = await processOne(msg.video_segment_url, false);
      const aud = await processOne(msg.audio_segment_url, true);

      const patch: Record<string, string> = {};
      if (vid.newUrl) patch.video_segment_url = vid.newUrl;
      if (aud.newUrl) patch.audio_segment_url = aud.newUrl;
      if (!dry_run && Object.keys(patch).length > 0) {
        await supabase.from("session_messages").update(patch).eq("id", msg.id);
      }
    }

    // sessions.video_recording_url
    const recRes = await processOne(session.video_recording_url, false);
    if (!dry_run && recRes.newUrl) {
      await supabase
        .from("sessions")
        .update({ video_recording_url: recRes.newUrl })
        .eq("id", session_id);
    }

    return new Response(
      JSON.stringify({ ok: true, session_id, dry_run, reports }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
