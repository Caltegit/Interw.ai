// Edge function : nettoie les sessions abandonnées (status pending/in_progress
// sans activité depuis plus de 2 heures). Supprime les fichiers du bucket
// `media/interviews/{sessionId}/...`, puis les messages et la session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const ABANDON_HOURS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authFail = requireInternal(req, corsHeaders);
  if (authFail) return authFail;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(
    Date.now() - ABANDON_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // 1. Récupère les sessions candidates au nettoyage.
  const { data: sessions, error: selectError } = await supabase
    .from("sessions")
    .select("id, last_activity_at, created_at, status")
    .in("status", ["pending", "in_progress"])
    .or(
      `last_activity_at.lt.${cutoff},and(last_activity_at.is.null,created_at.lt.${cutoff})`,
    )
    .limit(200);

  if (selectError) {
    console.error("cleanup_select_failed", selectError);
    return new Response(
      JSON.stringify({ error: selectError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let purgedSessions = 0;
  let purgedFiles = 0;
  let recoveredSessions = 0;
  const errors: string[] = [];

  for (const session of sessions ?? []) {
    try {
      // 2. Liste récursive des fichiers sous interviews/{sessionId}/
      const folder = `interviews/${session.id}`;
      const { data: files } = await supabase.storage
        .from("media")
        .list(folder, { limit: 1000 });

      // Si la session a déjà des chunks ou vidéos, on tente une récupération
      // (téléphone fermé en cours d'entretien) au lieu de tout supprimer.
      const hasMedia = (files?.length ?? 0) > 0;
      if (hasMedia) {
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-abandoned-session`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ session_id: session.id }),
            },
          );
          recoveredSessions += 1;
        } catch (e) {
          errors.push(
            `recover ${session.id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        continue;
      }


      const paths: string[] = [];
      if (files && files.length > 0) {
        for (const f of files) {
          // sous-dossiers q0/, q1/, etc.
          if (f.id === null) {
            const { data: sub } = await supabase.storage
              .from("media")
              .list(`${folder}/${f.name}`, { limit: 1000 });
            if (sub) {
              for (const s of sub) paths.push(`${folder}/${f.name}/${s.name}`);
            }
          } else {
            paths.push(`${folder}/${f.name}`);
          }
        }
      }

      if (paths.length > 0) {
        const { error: rmError } = await supabase.storage
          .from("media")
          .remove(paths);
        if (rmError) {
          errors.push(`storage rm ${session.id}: ${rmError.message}`);
        } else {
          purgedFiles += paths.length;
        }
      }

      // 3. Supprime messages puis session.
      await supabase.from("session_messages").delete().eq("session_id", session.id);
      const { error: delError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", session.id);
      if (delError) {
        errors.push(`session delete ${session.id}: ${delError.message}`);
      } else {
        purgedSessions += 1;
      }
    } catch (e) {
      errors.push(
        `session ${session.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // 4. Filet de sécurité : sessions terminées sans rapport → on les enqueue.
  // Le worker process-report-queue les traitera (avec backoff exponentiel,
  // espacement, et idempotence sur l'email de remerciement).
  let enqueuedReports = 0;
  const finalizeCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: orphanCompleted } = await supabase
    .from("sessions")
    .select("id, reports!left(id)")
    .eq("status", "completed")
    .eq("is_demo", false)
    .lt("completed_at", finalizeCutoff)
    .is("reports.id", null)
    .order("completed_at", { ascending: true })
    .limit(200);

  for (const session of orphanCompleted ?? []) {
    try {
      const { count: mediaCount } = await supabase
        .from("session_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("role", "candidate")
        .or("video_segment_url.not.is.null,audio_segment_url.not.is.null");

      if (!mediaCount || mediaCount === 0) {
        await supabase
          .from("sessions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          } as any)
          .eq("id", session.id);
        continue;
      }

      const { error: rpcErr } = await supabase.rpc("enqueue_report_job", {
        p_session_id: session.id,
      });
      if (rpcErr) {
        errors.push(`enqueue ${session.id}: ${rpcErr.message}`);
      } else {
        enqueuedReports += 1;
      }
    } catch (e) {
      errors.push(
        `enqueue ${session.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `cleanup_abandoned_sessions purged=${purgedSessions} files=${purgedFiles} enqueued_reports=${enqueuedReports} errors=${errors.length}`,
  );

  return new Response(
    JSON.stringify({
      ok: true,
      purgedSessions,
      purgedFiles,
      recoveredSessions,
      enqueuedReports,
      candidates: sessions?.length ?? 0,
      errors,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
