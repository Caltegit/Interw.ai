// Edge function : finalise une session côté serveur (transcription puis
// génération du rapport + email). Appelée par un trigger Postgres dès que
// sessions.status passe à 'completed', et par cleanup-abandoned-sessions
// en filet de sécurité.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function invoke(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "x-internal-secret": SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`finalize-session: ${name} failed`, res.status, text);
    throw new Error(`${name} ${res.status}: ${text}`);
  }
  return text;
}

async function processSession(sessionId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Idempotence : ne rien faire si rapport existe déjà.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) {
    console.log("finalize-session: report already exists", sessionId);
    return;
  }

  // Vérifie que la session est bien terminée + récupère les infos pour l'email candidat.
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, status, token, candidate_name, candidate_email, projects:projects!inner(title, job_title, slug, organizations:organizations(name))",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.status !== "completed") {
    console.log("finalize-session: session not completed, skipping", sessionId);
    return;
  }

  try {
    await invoke("transcribe-session", { session_id: sessionId });
  } catch (e) {
    console.error("finalize-session: transcribe failed (continuing)", e);
  }

  await invoke("generate-report", { session_id: sessionId });

  // Email de remerciement RGPD au candidat (best-effort, non bloquant)
  try {
    // deno-lint-ignore no-explicit-any
    const project = (session as any).projects;
    const orgName = project?.organizations?.name ?? "";
    const jobTitle = project?.job_title || project?.title || "";
    const firstName = (session.candidate_name ?? "").trim().split(/\s+/)[0] ?? "";
    const slug = project?.slug ?? "session";
    const privacyUrl = session.token
      ? `https://interw.ai/session/${slug}/privacy/${session.token}`
      : undefined;

    if (session.candidate_email) {
      await invoke("send-transactional-email", {
        templateName: "candidate-thank-you",
        recipientEmail: session.candidate_email,
        idempotencyKey: `candidate-thanks-${sessionId}`,
        templateData: { firstName, jobTitle, orgName, privacyUrl },
      });
    }
  } catch (e) {
    console.error("finalize-session: thank-you email failed (continuing)", e);
  }

  console.log("finalize-session: done", sessionId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(
        JSON.stringify({ error: "session_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lance le traitement en arrière-plan pour ne pas bloquer l'appelant
    // (trigger Postgres ou cron). Le runtime garde le worker en vie.
    // @ts-ignore EdgeRuntime global
    EdgeRuntime.waitUntil(
      processSession(session_id).catch((e) => {
        console.error("finalize-session error", session_id, e);
      }),
    );

    return new Response(
      JSON.stringify({ status: "processing", session_id }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("finalize-session: bad request", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
