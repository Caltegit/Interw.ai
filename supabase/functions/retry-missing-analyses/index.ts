// Cron : relance les analyses para-verbales / non-verbales manquantes ou échouées.
// - Cherche les rapports des 7 derniers jours
// - Plafond 3 tentatives (géré par les fonctions analyze-*)
// - Ne touche pas les "skipped" (volontairement non analysés)
// - Pour "running" : ne relance que si started_at > 10 min (probablement bloqué)
// - Limite : 20 relances par exécution pour éviter de saturer Gemini

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PER_RUN = 20;
const STUCK_RUNNING_MS = 10 * 60 * 1000;
const LOOKBACK_DAYS = 7;
const MAX_ATTEMPTS = 3;

type AnalysisState = {
  status?: string;
  attempt?: number;
  started_at?: string;
  profile?: unknown;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
  const stuckThreshold = new Date(Date.now() - STUCK_RUNNING_MS).toISOString();

  const { data: rows, error } = await supabase
    .from("reports")
    .select(
      "id, session_id, paraverbal_analysis, nonverbal_analysis, generated_at, sessions!inner(id, project_id, projects!inner(audio_analysis_enabled, record_video))",
    )
    .gte("generated_at", since)
    .order("generated_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[retry] query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const needsRetry = (state: AnalysisState | null, enabled: boolean): boolean => {
    if (!enabled) return false;
    if (state?.profile) return false;
    const attempt = typeof state?.attempt === "number" ? state.attempt : 0;
    if (attempt >= MAX_ATTEMPTS) return false;
    if (!state || state.status == null) return true; // jamais tenté
    if (state.status === "failed") return true;
    if (state.status === "running") {
      return !state.started_at || state.started_at < stuckThreshold;
    }
    return false; // skipped, ok, etc.
  };

  const toRetry: Array<{ session_id: string; fn: string }> = [];
  for (const r of rows ?? []) {
    const project: any = (r as any).sessions?.projects;
    if (!project) continue;
    if (needsRetry((r as any).paraverbal_analysis, project.audio_analysis_enabled)) {
      toRetry.push({ session_id: (r as any).session_id, fn: "analyze-paraverbal" });
    }
    if (needsRetry((r as any).nonverbal_analysis, project.record_video)) {
      toRetry.push({ session_id: (r as any).session_id, fn: "analyze-nonverbal" });
    }
    if (toRetry.length >= MAX_PER_RUN) break;
  }

  console.log(`[retry] ${toRetry.length} analyse(s) à relancer`);

  // Fire-and-forget
  for (const job of toRetry) {
    fetch(`${SUPABASE_URL}/functions/v1/${job.fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ session_id: job.session_id, force: true }),
    }).catch((e) => console.warn(`[retry] invoke ${job.fn} failed`, e));
  }

  return new Response(
    JSON.stringify({ scanned: rows?.length ?? 0, retried: toRetry.length, jobs: toRetry }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
