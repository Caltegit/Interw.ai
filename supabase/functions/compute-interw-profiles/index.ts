// Calcule les 8 profils Interw à partir des réponses dédiées, avec contrôle indépendant.
// N'écrit que reports.interw_profiles : aucun autre score n'est modifié.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCallerOrInternal } from "../_shared/auth-guard.ts";
import { resolveStartFactory } from "../_shared/resolve-start-seconds.ts";
import { INTERW_PROFILES } from "../_shared/interw-profiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MODEL = "openai/gpt-6-astra";
const METHODOLOGY_VERSION = "interw_profiles_v2_dedicated_questions";
const PROFILE_KEYS = INTERW_PROFILES.map((profile) => profile.key);

type MessageRow = {
  id: string;
  role: string;
  content: string | null;
  question_id: string | null;
  transcript_segments: unknown;
  timestamp: string;
};

const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    quote: { type: "string" },
    message_id: { type: "string" },
  },
  required: ["quote", "message_id"],
};

const profileProperties: Record<string, unknown> = {};
for (const profile of INTERW_PROFILES) {
  profileProperties[profile.key] = {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { type: "string", enum: ["evaluated", "not_evaluated"] },
      score: { type: ["number", "null"] },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      favorable_signals: { type: "array", items: { type: "string" } },
      contrary_signals: { type: "array", items: { type: "string" } },
      primary_evidences: { type: "array", items: evidenceSchema },
      complementary_evidences: { type: "array", items: evidenceSchema },
    },
    required: ["status", "score", "confidence", "favorable_signals", "contrary_signals", "primary_evidences", "complementary_evidences"],
  };
}

const outputSchema = {
  type: "object",
  additionalProperties: false,
  properties: profileProperties,
  required: PROFILE_KEYS,
};

async function streamStructured(key: string, instructions: string, input: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input,
      stream: true,
      reasoning: { effort: "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: { format: { type: "json_schema", name: "interw_profiles", strict: true, schema: outputSchema } },
    }),
  });
  if (!response.ok) return { ok: false as const, status: response.status, error: await response.text() };
  if (!response.body) return { ok: false as const, status: 502, error: "Réponse vide" };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") output += parsed.delta;
        } catch {
          // Les événements non JSON ne contiennent pas le résultat structuré.
        }
      }
    }
  }
  try {
    return { ok: true as const, data: JSON.parse(output) };
  } catch {
    return { ok: false as const, status: 502, error: "Sortie structurée invalide" };
  }
}

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
}

function hasExactQuote(message: MessageRow, quote: string) {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  return words.length >= 5 && words.length <= 20 && normalizeText(message.content ?? "").includes(normalizeText(quote));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const caller = await requireCallerOrInternal(req, corsHeaders);
  if (!caller.ok) return caller.response;

  try {
    const { session_id, force } = await req.json().catch(() => ({}));
    if (typeof session_id !== "string" || !UUID_RE.test(session_id)) return json({ error: "session_id invalide" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Configuration IA manquante" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session } = await supabase.from("sessions").select("id, project_id, candidate_name").eq("id", session_id).maybeSingle();
    if (!session) return json({ error: "Session introuvable" }, 404);
    if (!caller.internal) {
      const { data: allowed } = await supabase.rpc("has_project_access", { _user: caller.userId, _project: session.project_id });
      if (!allowed) return json({ error: "Accès refusé" }, 403);
    }

    const { data: report } = await supabase.from("reports").select("id, interw_profiles").eq("session_id", session_id).maybeSingle();
    if (!report) return json({ error: "Rapport introuvable" }, 404);
    if (report.interw_profiles && !force) return json({ ok: true, skipped: "already_exists", interw_profiles: report.interw_profiles });

    const [{ data: questions }, { data: messages }] = await Promise.all([
      supabase.from("questions").select("id, title, content, is_interw_profile, interw_profile_question_key").eq("project_id", session.project_id),
      supabase.from("session_messages").select("id, role, content, question_id, transcript_segments, timestamp").eq("session_id", session_id).order("timestamp"),
    ]);
    const messageRows = (messages ?? []) as MessageRow[];
    const candidateMessages = messageRows.filter((message) => message.role === "candidate" && (message.content ?? "").trim());
    if (!candidateMessages.length) return json({ error: "Aucune transcription" }, 422);

    const questionById = new Map((questions ?? []).map((question) => [question.id, question]));
    const dedicatedQuestionIds = new Set((questions ?? []).filter((question) => question.is_interw_profile).map((question) => question.id));
    const dedicatedMessages = candidateMessages.filter((message) => message.question_id && dedicatedQuestionIds.has(message.question_id));

    const formatMessage = (message: MessageRow) => {
      const question = message.question_id ? questionById.get(message.question_id) : null;
      return `[message_id=${message.id}; question_id=${message.question_id ?? "aucune"}; question=${question?.title ?? "inconnue"}] ${message.content?.trim()}`;
    };
    const primaryTranscript = dedicatedMessages.length ? dedicatedMessages.map(formatMessage).join("\n") : "AUCUNE RÉPONSE À UNE QUESTION PROFIL INTERW.";
    const complementaryTranscript = candidateMessages.filter((message) => !dedicatedMessages.includes(message)).map(formatMessage).join("\n");
    const grid = INTERW_PROFILES.map((profile) => `- ${profile.key} (${profile.label}) : ${profile.definition}. Indices : ${profile.oral}. Forces : ${profile.forces}. Vigilance : ${profile.vigilance}.`).join("\n");
    const instructions = `Tu es psychologue du travail. Évalue huit profils indépendants, sans utiliser la voix, le visage, le CV, le Fit Poste ni les critères métier.\n${grid}\n\nLes réponses prioritaires sont la seule source autorisant une note. Le reste de l'entretien peut uniquement confirmer ou nuancer. Pour chaque profil, renvoie not_evaluated avec score null si aucune citation prioritaire exacte et pertinente ne l'étaye. Une citation doit reprendre exactement 5 à 20 mots consécutifs et son vrai message_id. Un score évalué exige au moins une preuve prioritaire, des indices favorables et la prise en compte des indices contraires. Repères : 0-30 indices contraires dominants, 31-59 indices faibles ou mixtes, 60-79 indices cohérents, 80-100 plusieurs indices comportementaux précis et résultat concret. N'invente rien.`;
    const input = `Candidat : ${session.candidate_name}\n\nRÉPONSES PRIORITAIRES :\n${primaryTranscript}\n\nPREUVES COMPLÉMENTAIRES :\n${complementaryTranscript || "Aucune"}`;

    const first = await streamStructured(key, instructions, input);
    if (!first.ok) return json({ error: "Analyse du profil impossible", detail: first.error }, first.status);
    const verification = await streamStructured(key, `${instructions}\n\nTu effectues un contrôle indépendant. Corrige toute note non soutenue, citation imprécise ou conclusion excessive. En cas de doute, utilise not_evaluated et score null.`, `${input}\n\nRÉSULTAT À CONTRÔLER :\n${JSON.stringify(first.data)}`);
    if (!verification.ok) return json({ error: "Vérification du profil impossible", detail: verification.error }, verification.status);

    const byId = new Map(candidateMessages.map((message) => [message.id, message]));
    const resolveStart = resolveStartFactory(messageRows as never[]);
    const out: Record<string, unknown> = {};
    for (const profile of INTERW_PROFILES) {
      const proposed = verification.data?.[profile.key] ?? {};
      const primaryEvidence = (Array.isArray(proposed.primary_evidences) ? proposed.primary_evidences : [])
        .filter((e: { quote?: string; message_id?: string }) => {
          const message = e.message_id ? byId.get(e.message_id) : null;
          return Boolean(message && message.question_id && dedicatedQuestionIds.has(message.question_id) && e.quote && hasExactQuote(message, e.quote));
        })
        .slice(0, 2);
      const evaluated = proposed.status === "evaluated" && typeof proposed.score === "number" && primaryEvidence.length > 0;
      const evidences = evaluated ? primaryEvidence.map((e: { quote: string; message_id: string }) => {
        const message = byId.get(e.message_id);
        const question = message?.question_id ? questionById.get(message.question_id) : null;
        return {
          quote: e.quote,
          message_id: e.message_id,
          question_id: message?.question_id,
          question_title: question?.title,
          start_seconds: resolveStart(e.message_id, e.quote) ?? undefined,
        };
      }) : [];
      out[profile.key] = {
        status: evaluated ? "evaluated" : "not_evaluated",
        score: evaluated ? Math.max(0, Math.min(100, Math.round(proposed.score))) : null,
        confidence: evaluated && ["low", "medium", "high"].includes(proposed.confidence) ? proposed.confidence : "low",
        evidences,
        favorable_signals: evaluated && Array.isArray(proposed.favorable_signals) ? proposed.favorable_signals.slice(0, 4) : [],
        contrary_signals: evaluated && Array.isArray(proposed.contrary_signals) ? proposed.contrary_signals.slice(0, 4) : [],
      };
    }
    out.computed_at = new Date().toISOString();
    out.methodology_version = METHODOLOGY_VERSION;
    out.validation = { independent_review: true, exact_quotes: true, dedicated_questions: dedicatedMessages.length };

    const { error } = await supabase.from("reports").update({ interw_profiles: out }).eq("id", report.id);
    if (error) return json({ error: "Enregistrement impossible", detail: error.message }, 500);
    return json({ ok: true, interw_profiles: out });
  } catch (error) {
    console.error("[compute-interw-profiles]", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});