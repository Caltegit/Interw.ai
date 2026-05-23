import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveStartFactory } from "../_shared/resolve-start-seconds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONALITY_TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "emotional_stability",
];

interface FixOptions {
  msgKey?: string;
  tsKey?: string;
  quoteKey?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, force } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return json({ error: "session_id is required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [reportRes, messagesRes] = await Promise.all([
      supabase.from("reports").select("*").eq("session_id", session_id).maybeSingle(),
      supabase
        .from("session_messages")
        .select("id, role, content, transcript_segments")
        .eq("session_id", session_id),
    ]);

    if (reportRes.error || !reportRes.data) {
      return json({ error: "report_not_found" }, 404);
    }
    const report = reportRes.data;
    const messages = messagesRes.data ?? [];

    const resolveStart = resolveStartFactory(messages as any);
    let touched = 0;

    const stats = (report.stats ?? {}) as Record<string, any>;

    const fixEntry = (e: any, opts: FixOptions = {}) => {
      if (!e || typeof e !== "object") return;
      const msgKey = opts.msgKey ?? "message_id";
      const tsKey = opts.tsKey ?? "start_seconds";
      const quoteKey = opts.quoteKey ?? "quote";
      const current = e[tsKey];
      if (!force && typeof current === "number" && current > 0) return;
      const next = resolveStart(
        e[msgKey],
        e[quoteKey] ?? e.citation ?? e.key_quote,
      );
      if (next === null) return;
      if (current !== next) {
        e[tsKey] = next;
        touched++;
      }
    };

    // stats.fit_breakdown
    if (Array.isArray(stats.fit_breakdown)) {
      stats.fit_breakdown.forEach((e: any) => fixEntry(e));
    }
    // stats.decision_drivers
    if (Array.isArray(stats.decision_drivers)) {
      stats.decision_drivers.forEach((e: any) => fixEntry(e));
    }
    // stats.signals
    if (Array.isArray(stats.signals)) {
      stats.signals.forEach((e: any) => fixEntry(e));
    }
    // stats.communication_profile.<dim>
    if (stats.communication_profile && typeof stats.communication_profile === "object") {
      for (const k of Object.keys(stats.communication_profile)) {
        fixEntry(stats.communication_profile[k]);
      }
    }

    const personality = report.personality_profile as any;
    if (personality && typeof personality === "object") {
      for (const trait of PERSONALITY_TRAITS) {
        const t = personality[trait];
        if (t && Array.isArray(t.evidences)) {
          t.evidences.forEach((e: any) => fixEntry(e));
        }
      }
    }

    const softSkills = report.soft_skills as any;
    if (Array.isArray(softSkills)) {
      softSkills.forEach((e: any) =>
        fixEntry(e, {
          msgKey: "evidence_message_id",
          tsKey: "evidence_start_seconds",
          quoteKey: "evidence_quote",
        }),
      );
    }

    const redFlags = report.red_flags as any;
    if (Array.isArray(redFlags)) {
      redFlags.forEach((e: any) => fixEntry(e));
    }

    const para = report.paraverbal_analysis as any;
    if (para && Array.isArray(para.dimensions)) {
      para.dimensions.forEach((d: any) =>
        fixEntry(d, {
          msgKey: "evidence_message_id",
          tsKey: "evidence_start_seconds",
          quoteKey: "evidence_quote",
        }),
      );
    }

    // question_evaluations : clé_quote + evidence_message_id
    const qEvals = report.question_evaluations as any;
    if (qEvals && typeof qEvals === "object") {
      for (const k of Object.keys(qEvals)) {
        fixEntry(qEvals[k], {
          msgKey: "evidence_message_id",
          tsKey: "evidence_start_seconds",
          quoteKey: "key_quote",
        });
      }
    }

    // Marqueur de version : permet à l'UI de ne déclencher qu'une seule fois
    // le recalcul en mode `force` après un changement d'algorithme.
    stats.timestamps_algo_version = 2;

    if (touched === 0) {
      // On enregistre quand même le marqueur si seul lui a changé.
      await supabase.from("reports").update({ stats }).eq("id", report.id);
      return json({ ok: true, touched: 0, message: "Aucune mise à jour nécessaire" });
    }

    const { error: updateErr } = await supabase
      .from("reports")
      .update({
        stats,
        personality_profile: personality,
        soft_skills: softSkills,
        red_flags: redFlags,
        paraverbal_analysis: para,
        question_evaluations: qEvals,
      })
      .eq("id", report.id);

    if (updateErr) {
      return json({ error: "update_failed", detail: updateErr.message }, 500);
    }

    return json({ ok: true, touched });
  } catch (e) {
    console.error("backfill-report-timestamps error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
