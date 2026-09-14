// Sert les fichiers publics légitimes (logos, avatars, vidéos de question,
// pages vitrine) depuis le stockage devenu privé.
// Liste blanche stricte de préfixes : les enregistrements d'entretien
// (`interviews/…`) ne sont jamais servis ici.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const ALLOWED_PREFIXES = [
  "avatars/",
  "org-logos/",
  "questions/",
  "question-templates/",
  "question-avatars/",
  "intro/",
  "intro-library/",
  "presentation/",
  "public-pages/",
  "enigmas/",
  "defaults/",
  "templates/",
];

const BUCKET = "media";

function isAllowed(path: string): boolean {
  if (!path || path.includes("..")) return false;
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}

function extractPath(req: Request): string {
  const url = new URL(req.url);
  const qp = url.searchParams.get("path");
  if (qp) return decodeURIComponent(qp.replace(/^\/+/, ""));
  const marker = "/public-asset/";
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return "";
  return decodeURIComponent(url.pathname.slice(idx + marker.length));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const path = extractPath(req);
  if (!isAllowed(path)) {
    return new Response("Not found", { status: 404, headers: CORS });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    return new Response("Not found", { status: 404, headers: CORS });
  }

  const upstream = await fetch(data.signedUrl, {
    method: req.method,
    headers: req.headers.get("range") ? { range: req.headers.get("range")! } : undefined,
  });

  const headers = new Headers(CORS);
  const passthrough = ["content-type", "content-length", "content-range", "accept-ranges", "etag"];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");

  return new Response(req.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
});
