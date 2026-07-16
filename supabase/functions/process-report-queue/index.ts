// Worker unique de la file `report_jobs`.
// Appelé toutes les minutes par pg_cron.
// - Récupère atomiquement BATCH_SIZE jobs (FOR UPDATE SKIP LOCKED)
// - Pour chacun : transcrit les segments restants, génère le rapport,
//   envoie le thank-you email (avec idempotence existante)
// - Sur succès : mark_report_job_done
// - Sur échec : mark_report_job_failed (backoff exponentiel)
// - Espace les jobs de SPACING_MS pour lisser la charge IA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 3;
const SPACING_MS = 10_000;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const TRANSCRIBE_TIMEOUT_MS = 3 * 60 * 1000;

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
    throw new Error(`${name} ${res.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

async function sendCandidateThankYou(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
) {
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, token, candidate_name, candidate_email, projects:projects!inner(title, job_title, slug, organization_id, created_by, candidate_email_subject, candidate_email_body, organizations:organizations(name))",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.candidate_email) return;

  // Idempotence par session : un seul thank-you par session, peu importe
  // les autres entretiens du même candidat. (cf. fix précédent du spam :
  // on conserve la garde, mais scopée au session_id via metadata.)
  const { data: alreadySent } = await supabase
    .from("email_send_log")
    .select("id")
    .eq("template_name", "candidate-thank-you")
    .eq("recipient_email", session.candidate_email)
    .in("status", ["pending", "sent"])
    .contains("metadata", { session_id: sessionId })
    .limit(1);
  if (alreadySent && alreadySent.length > 0) return;

  // deno-lint-ignore no-explicit-any
  const project = (session as any).projects;
  const orgName = project?.organizations?.name ?? "";
  const jobTitle = project?.job_title || project?.title || "";
  const firstName = (session.candidate_name ?? "").trim().split(/\s+/)[0] ?? "";
  const slug = project?.slug ?? "session";
  const privacyUrl = session.token
    ? `https://interw.ai/session/${slug}/privacy/${session.token}`
    : undefined;

  let customSubject: string | null = project?.candidate_email_subject ?? null;
  let customBody: string | null = project?.candidate_email_body ?? null;
  if ((!customSubject || !customBody) && project?.organization_id) {
    const { data: orgTpl } = await supabase
      .from("candidate_message_templates")
      .select("subject, body")
      .eq("organization_id", project.organization_id)
      .eq("key", "candidate-thank-you")
      .maybeSingle();
    if (orgTpl) {
      // deno-lint-ignore no-explicit-any
      const tpl = orgTpl as any;
      customSubject = customSubject || tpl.subject || null;
      customBody = customBody || tpl.body || null;
    }
  }

  let replyTo: string | undefined;
  if (project?.created_by) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", project.created_by)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    const email = (creatorProfile as any)?.email;
    if (typeof email === "string" && email.includes("@")) replyTo = email;
  }

  await invoke("send-transactional-email", {
    templateName: "candidate-thank-you",
    recipientEmail: session.candidate_email,
    idempotencyKey: `candidate-thanks-${sessionId}`,
    replyTo,
    metadata: { session_id: sessionId },
    templateData: {
      firstName,
      jobTitle,
      orgName,
      privacyUrl,
      customSubject: customSubject || undefined,
      customBody: customBody || undefined,
    },
  });
}

async function processJob(sessionId: string, forceRegenerate = false) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Garde-fou : ne traiter que les sessions completed non-demo
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, is_demo")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("session not found");
  if (session.status !== "completed") {
    throw new Error(`session status=${session.status} (expected completed)`);
  }
  if ((session as any).is_demo) {
    // mark done directly, ne devrait pas arriver mais safe
    await supabase.rpc("mark_report_job_done", { p_session_id: sessionId });
    return;
  }

  // Si un rapport existe déjà, on saute la génération automatique initiale,
  // mais une régénération demandée depuis le front force une vraie recréation.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!existing || forceRegenerate) {
    // 1. Boucle de transcription (transcribe-session plafonne à 8 segments/run)
    const MAX_RUNS = 10;
    const startedAt = Date.now();
    for (let i = 0; i < MAX_RUNS; i++) {
      const raw = await invoke("transcribe-session", { session_id: sessionId });
      let remaining = 0;
      try {
        const json = JSON.parse(raw);
        remaining = Number(json?.remaining ?? 0);
      } catch { break; }
      if (remaining <= 0) break;
      if (Date.now() - startedAt > TRANSCRIBE_TIMEOUT_MS) {
        console.warn("process-report-queue: transcribe timeout", sessionId, "remaining=", remaining);
        break;
      }
    }

    // 2. Génération
    await invoke("generate-report", {
      session_id: sessionId,
      force: forceRegenerate,
      generate_fit_matrix: false,
    });

    // La matrice doit être recalculée avec le rapport, sinon l'UI peut afficher
    // une ancienne matrice incohérente avec le nouveau score global.
    await invoke("generate-fit-matrix", { session_id: sessionId, force: true });
  }

  // 3. Email (best-effort, n'échoue pas le job)
  try {
    await sendCandidateThankYou(supabase, sessionId);
  } catch (e) {
    console.error("process-report-queue: thank-you failed (continuing)", sessionId, e);
  }

  await supabase.rpc("mark_report_job_done", { p_session_id: sessionId });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Récupère les jobs stuck (worker crashed avant fin du lock)
  await supabase.rpc("requeue_stuck_report_jobs");

  // 2. Claim
  const { data: jobs, error: claimErr } = await supabase.rpc("claim_report_jobs", {
    p_limit: BATCH_SIZE,
    p_lock_ms: LOCK_DURATION_MS,
  });

  if (claimErr) {
    console.error("process-report-queue: claim failed", claimErr);
    return new Response(
      JSON.stringify({ error: claimErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const claimed = (jobs ?? []) as Array<{ session_id: string; attempts: number; force_regenerate?: boolean }>;
  const results: Array<{ session_id: string; status: "done" | "failed"; error?: string }> = [];

  for (let i = 0; i < claimed.length; i++) {
    const job = claimed[i];
    try {
      await processJob(job.session_id, job.force_regenerate === true);
      results.push({ session_id: job.session_id, status: "done" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("process-report-queue: job failed", job.session_id, msg);
      await supabase.rpc("mark_report_job_failed", {
        p_session_id: job.session_id,
        p_error: msg,
      });
      results.push({ session_id: job.session_id, status: "failed", error: msg });
    }

    // Espacement entre jobs (sauf après le dernier)
    if (i < claimed.length - 1) {
      await new Promise((r) => setTimeout(r, SPACING_MS));
    }
  }

  const summary = {
    ok: true,
    claimed: claimed.length,
    done: results.filter((r) => r.status === "done").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
  console.log("process-report-queue", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
