/**
 * Reprocess imported external sessions after changing the project's question set.
 *
 * For every session with end_reason = 'imported_external' on the given project:
 *   - delete existing candidate messages (old split segments)
 *   - create one fresh candidate message attached to the project's active question
 *   - call transcribe-session (force)
 *   - call generate-report (force + matrix)
 *
 * No e-mail is sent by this script itself; generate-report may e-mail project
 * recipients if any are configured.
 *
 * Usage:
 *   bun run scripts/reprocess-imported-sessions.ts \
 *     --project-id eb7db435-1f2f-4ccf-a2ff-f49d68f851db \
 *     --dry-run
 */
import { createClient } from "@supabase/supabase-js";

const PROJECT_ID = "eb7db435-1f2f-4ccf-a2ff-f49d68f851db";

function parseArgs(argv: string[]): { dryRun: boolean; limit?: number } {
  const args: { dryRun: boolean; limit?: number } = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--limit") {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n)) args.limit = n;
    }
  }
  return args;
}

function fail(message: string): never {
  console.error(`\n  Erreur : ${message}\n`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const internalSecret = process.env.INTERNAL_FUNCTION_SECRET ?? serviceRole;
  if (!supabaseUrl || !serviceRole || !internalSecret) {
    fail("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et INTERNAL_FUNCTION_SECRET doivent être définis");
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log("Connexion Supabase OK", supabaseUrl.slice(0, 28));



  const { data: question, error: qErr } = await supabase
    .from("questions")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .is("archived_at", null)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (qErr) fail(qErr.message);
  if (!question) fail("aucune question active trouvée pour ce poste");
  const questionId = question.id;
  console.log(`Question active : ${questionId}`);

  let query = supabase
    .from("sessions")
    .select("id, candidate_email, candidate_name")
    .eq("project_id", PROJECT_ID)
    .eq("end_reason", "imported_external")
    .order("created_at", { ascending: false });
  if (args.limit) query = query.limit(args.limit);
  const { data: sessions, error: sErr } = await query;
  if (sErr) fail(sErr.message);
  if (!sessions?.length) {
    console.log("Aucune session à retraiter.");
    return;
  }

  console.log(`\n${sessions.length} session(s) à retraiter${args.dryRun ? " (simulation)" : ""} :`);
  for (const s of sessions) console.log(`  - ${s.candidate_email} (${s.candidate_name})`);

  for (const session of sessions) {
    console.log(`\n→ ${session.candidate_email}`);

    const { data: messages } = await supabase
      .from("session_messages")
      .select("id, audio_segment_url, video_segment_url")
      .eq("session_id", session.id)
      .eq("role", "candidate");

    const mediaMsg = messages?.find((m) => m.audio_segment_url || m.video_segment_url);
    if (!mediaMsg) {
      console.log("  ! aucun média trouvé, session ignorée");
      continue;
    }

    if (args.dryRun) {
      console.log(`  (simulation) ${messages?.length ?? 0} message(s) à remplacer`);
      continue;
    }

    const { error: delErr } = await supabase
      .from("session_messages")
      .delete()
      .eq("session_id", session.id)
      .eq("role", "candidate");
    if (delErr) {
      console.log(`  ! échec suppression messages : ${delErr.message}`);
      continue;
    }

    const now = new Date().toISOString();
    const { error: insErr } = await supabase.from("session_messages").insert({
      session_id: session.id,
      role: "candidate",
      content: "",
      question_id: questionId,
      is_follow_up: false,
      timestamp: now,
      transcription_status: "pending",
      audio_segment_url: mediaMsg.audio_segment_url,
      video_segment_url: mediaMsg.video_segment_url,
    });
    if (insErr) {
      console.log(`  ! échec insertion message : ${insErr.message}`);
      continue;
    }

    const { error: updErr } = await supabase
      .from("sessions")
      .update({ last_question_index: 0 })
      .eq("id", session.id);
    if (updErr) console.log(`  ! échec mise à jour session : ${updErr.message}`);

    const invoke = async (fn: string, payload: Record<string, unknown>) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": secret,
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let payloadJson: unknown = null;
      try {
        payloadJson = JSON.parse(text);
      } catch {
        payloadJson = text;
      }
      return { ok: res.ok, status: res.status, body: payloadJson };
    };

    const tr = await invoke("transcribe-session", { session_id: session.id, force: true });
    console.log(`  transcription : HTTP ${tr.status}`);
    if (!tr.ok) console.log(`    ${JSON.stringify(tr.body).slice(0, 200)}`);

    const rep = await invoke("generate-report", {
      session_id: session.id,
      force: true,
      generate_fit_matrix: true,
    });
    console.log(`  rapport : HTTP ${rep.status}`);
    if (!rep.ok) console.log(`    ${JSON.stringify(rep.body).slice(0, 200)}`);
  }

  console.log("\nTerminé.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
