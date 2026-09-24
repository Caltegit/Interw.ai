// Calcule les 8 profils Interw d'un candidat à partir de sa transcription.
// Appelée en arrière-plan par generate-report, ou à la demande depuis la fiche.
// N'écrit que reports.interw_profiles : aucun autre score n'est modifié.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCallerOrInternal } from "../_shared/auth-guard.ts";
import { resolveStartFactory } from "../_shared/resolve-start-seconds.ts";
import { MODEL_FAST, MODEL_FALLBACK, buildChatBody } from "../_shared/ai-models.ts";
import { INTERW_PROFILES } from "../_shared/interw-profiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f-]{36}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const caller = await requireCallerOrInternal(req, corsHeaders);
  if (!caller.ok) return caller.response;

  try {
    const { session_id, force } = await req.json().catch(() => ({}));
    if (typeof session_id !== "string" || !UUID_RE.test(session_id)) {
      return json({ error: "session_id invalide" }, 400);
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY manquante" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session } = await supabase
      .from("sessions").select("id, project_id, candidate_name").eq("id", session_id).maybeSingle();
    if (!session) return json({ error: "Session introuvable" }, 404);

    if (!caller.internal) {
      const { data: allowed } = await supabase.rpc("has_project_access", {
        _user: caller.userId, _project: session.project_id,
      });
      if (!allowed) return json({ error: "Accès refusé" }, 403);
    }

    const { data: report } = await supabase
      .from("reports").select("id, interw_profiles").eq("session_id", session_id).maybeSingle();
    if (!report) return json({ error: "Rapport introuvable" }, 404);
    if (report.interw_profiles && !force) return json({ ok: true, skipped: "already_exists", interw_profiles: report.interw_profiles });

    const { data: messages } = await supabase
      .from("session_messages").select("id, role, content, transcript_segments, timestamp")
      .eq("session_id", session_id).order("timestamp");
    const candidateMsgs = (messages ?? []).filter((m: any) => m.role === "candidate" && (m.content ?? "").trim());
    if (candidateMsgs.length === 0) return json({ error: "Aucune transcription" }, 422);

    const transcript = (messages ?? [])
      .map((m: any) => m.role === "candidate"
        ? `[id=${m.id}] CANDIDAT : ${(m.content ?? "").trim()}`
        : `RECRUTEUR IA : ${(m.content ?? "").trim()}`)
      .join("\n");
    const wordCount = candidateMsgs.reduce((n: number, m: any) => n + String(m.content).split(/\s+/).length, 0);

    const grid = INTERW_PROFILES.map((p) =>
      `- ${p.key} (${p.label}) : ${p.definition}. À l'oral : ${p.oral}. Forces : ${p.forces}. Vigilance : ${p.vigilance}.`
    ).join("\n");

    const system = `Tu es psychologue du travail. Tu évalues un candidat sur 8 profils comportementaux, chacun noté INDÉPENDAMMENT de 0 à 100 (pas un total à 100). Base-toi uniquement sur ce que le candidat dit dans la transcription. Grille :\n${grid}\n\nPour chaque profil : score 0-100, confidence (low/medium/high), 0 à 2 evidences avec une citation EXACTE (verbatim, 5 à 20 mots) et le message_id correspondant. Si peu d'indices, confidence "low" et score modéré. Réponds en français.`;

    const profileProps: Record<string, unknown> = {};
    for (const p of INTERW_PROFILES) {
      profileProps[p.key] = {
        type: "object",
        properties: {
          score: { type: "number" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          evidences: {
            type: "array",
            items: { type: "object", properties: { quote: { type: "string" }, message_id: { type: "string" } }, required: ["quote", "message_id"] },
          },
        },
        required: ["score", "confidence"],
      };
    }
    const tool = {
      type: "function",
      function: {
        name: "save_profiles",
        description: "Enregistre les scores des 8 profils",
        parameters: { type: "object", properties: profileProps, required: INTERW_PROFILES.map((p) => p.key) },
      },
    };

    let parsed: any = null;
    let lastErr = "";
    for (const model of [MODEL_FAST, MODEL_FALLBACK]) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(buildChatBody(model, {
            messages: [
              { role: "system", content: system },
              { role: "user", content: `Transcription de ${session.candidate_name} :\n\n${transcript}` },
            ],
            tools: [tool],
            tool_choice: { type: "function", function: { name: "save_profiles" } },
            temperature: 0.2,
          })),
        });
        if (!r.ok) { lastErr = `[${r.status}] ${await r.text()}`; continue; }
        const data = await r.json();
        const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        parsed = typeof args === "string" ? JSON.parse(args) : args;
        if (parsed && typeof parsed === "object") break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    if (!parsed) {
      console.error("[compute-interw-profiles] AI failed", lastErr);
      return json({ error: "ai_failed", detail: lastErr }, 502);
    }

    const resolveStart = resolveStartFactory((messages ?? []) as any);
    const validIds = new Set(candidateMsgs.map((m: any) => m.id));
    const lowData = wordCount < 120;
    const out: Record<string, unknown> = {};
    for (const p of INTERW_PROFILES) {
      const t = parsed[p.key] ?? {};
      const score = Math.max(0, Math.min(100, Math.round(Number(t.score) || 0)));
      const evidences = (Array.isArray(t.evidences) ? t.evidences : [])
        .filter((e: any) => e?.quote && validIds.has(e.message_id))
        .slice(0, 2)
        .map((e: any) => ({
          quote: String(e.quote),
          message_id: e.message_id,
          start_seconds: resolveStart(e.message_id, String(e.quote)) ?? undefined,
        }));
      const confidence = lowData ? "low" : (["low", "medium", "high"].includes(t.confidence) ? t.confidence : "medium");
      out[p.key] = { score, confidence, evidences };
    }
    out.computed_at = new Date().toISOString();

    const { error: upErr } = await supabase.from("reports").update({ interw_profiles: out }).eq("id", report.id);
    if (upErr) return json({ error: "save_failed", detail: upErr.message }, 500);
    return json({ ok: true, interw_profiles: out });
  } catch (e) {
    console.error("[compute-interw-profiles]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
