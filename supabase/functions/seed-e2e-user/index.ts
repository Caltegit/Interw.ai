// One-shot seed function for E2E tests.
// Idempotent: safe to call multiple times.
// Creates: test RH user, org, role, project, questions, criteria, completed session + transcript.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIXED = {
  orgId: "e2e0e2e0-0000-0000-0000-000000000001",
  projectId: "e2e0e2e0-0000-0000-0000-000000000010",
  q1: "e2e0e2e0-0000-0000-0000-000000000020",
  q2: "e2e0e2e0-0000-0000-0000-000000000021",
  c1: "e2e0e2e0-0000-0000-0000-000000000030",
  c2: "e2e0e2e0-0000-0000-0000-000000000031",
  sessionId: "e2e0e2e0-0000-0000-0000-000000000040",
  pendingSessionId: "e2e0e2e0-0000-0000-0000-000000000041",
  resumeSessionId: "e2e0e2e0-0000-0000-0000-000000000042",
  m1: "e2e0e2e0-0000-0000-0000-000000000050",
  m2: "e2e0e2e0-0000-0000-0000-000000000051",
  m3: "e2e0e2e0-0000-0000-0000-000000000052",
  m4: "e2e0e2e0-0000-0000-0000-000000000053",
  rm1: "e2e0e2e0-0000-0000-0000-000000000054",
  rm2: "e2e0e2e0-0000-0000-0000-000000000055",
  transcriptId: "e2e0e2e0-0000-0000-0000-000000000060",
  pendingToken: "e2e-pending-session-token-aaaaaaaaaaaaaaaaaaaaaaaa",
  resumeToken: "e2e-resume-session-token-bbbbbbbbbbbbbbbbbbbbbbbbbb",
  email: "e2e-test@interw.ai",
  password: "E2eTest!2026",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Create or get the test user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = list?.users?.find((u) => u.email === FIXED.email)?.id;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: FIXED.email,
        password: FIXED.password,
        email_confirm: true,
        user_metadata: { full_name: "E2E Test User" },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    } else {
      // Reset password to known value (in case it drifted)
      await admin.auth.admin.updateUserById(userId, { password: FIXED.password });
    }

    // 2. Org
    await admin.from("organizations").upsert({
      id: FIXED.orgId,
      name: "E2E Test Org",
      slug: "e2e-test-org",
      owner_id: userId,
    });

    // 3. Profile org_id
    await admin.from("profiles").update({ organization_id: FIXED.orgId }).eq("user_id", userId);

    // 4. Role admin
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", FIXED.orgId)
      .eq("role", "admin")
      .maybeSingle();
    if (!existingRole) {
      await admin.from("user_roles").insert({
        user_id: userId,
        organization_id: FIXED.orgId,
        role: "admin",
      });
    }

    // 5. Project
    await admin.from("projects").upsert({
      id: FIXED.projectId,
      organization_id: FIXED.orgId,
      created_by: userId,
      title: "E2E Test Project",
      job_title: "QA Engineer E2E",
      description: "Projet seed utilisé par les tests Playwright. Ne pas supprimer.",
      status: "active",
      slug: "e2e-test-project",
      language: "fr",
      ai_persona_name: "Sophie",
      ai_voice: "female_fr",
    });

    // 6. Questions
    await admin.from("questions").upsert([
      {
        id: FIXED.q1, project_id: FIXED.projectId,
        content: "Pouvez-vous vous présenter en quelques minutes ?",
        title: "Présentation", order_index: 0, type: "open",
        follow_up_enabled: false, max_follow_ups: 0,
      },
      {
        id: FIXED.q2, project_id: FIXED.projectId,
        content: "Pourquoi ce poste vous intéresse-t-il ?",
        title: "Motivation", order_index: 1, type: "open",
        follow_up_enabled: false, max_follow_ups: 0,
      },
    ]);

    // 7. Criteria
    await admin.from("evaluation_criteria").upsert([
      {
        id: FIXED.c1, project_id: FIXED.projectId,
        label: "Clarté du discours",
        description: "Capacité à structurer sa pensée.",
        weight: 50, scoring_scale: "0-5", applies_to: "all_questions", order_index: 0,
      },
      {
        id: FIXED.c2, project_id: FIXED.projectId,
        label: "Motivation",
        description: "Niveau d'adhésion au poste.",
        weight: 50, scoring_scale: "0-5", applies_to: "all_questions", order_index: 1,
      },
    ]);

    // 8. Completed session
    await admin.from("sessions").upsert({
      id: FIXED.sessionId,
      project_id: FIXED.projectId,
      candidate_name: "E2E Candidate",
      candidate_email: "e2e-candidate@example.com",
      status: "completed",
      token: "e2e-test-session-token-fixed-12345678901234567890",
      started_at: new Date(Date.now() - 3600_000).toISOString(),
      completed_at: new Date(Date.now() - 1800_000).toISOString(),
      duration_seconds: 1800,
      consent_given_at: new Date(Date.now() - 3600_000).toISOString(),
    });

    // 9. Messages
    await admin.from("session_messages").upsert([
      { id: FIXED.m1, session_id: FIXED.sessionId, question_id: FIXED.q1, role: "ai",
        content: "Pouvez-vous vous présenter en quelques minutes ?", is_follow_up: false },
      { id: FIXED.m2, session_id: FIXED.sessionId, question_id: FIXED.q1, role: "candidate",
        content: "Bonjour, je m'appelle E2E Candidate. J'ai 5 ans d'expérience en QA automation, notamment avec Playwright et Cypress. J'ai travaillé sur des plateformes SaaS B2B avec des équipes Agile. Je suis passionné par la qualité logicielle et l'amélioration continue.",
        is_follow_up: false },
      { id: FIXED.m3, session_id: FIXED.sessionId, question_id: FIXED.q2, role: "ai",
        content: "Pourquoi ce poste vous intéresse-t-il ?", is_follow_up: false },
      { id: FIXED.m4, session_id: FIXED.sessionId, question_id: FIXED.q2, role: "candidate",
        content: "Ce poste m'intéresse car votre produit allie IA et recrutement, deux domaines qui me passionnent. J'ai lu votre roadmap et la mission technique correspond exactement à ce que je cherche : structurer la qualité d'une plateforme en croissance.",
        is_follow_up: false },
    ]);

    // 10. Transcript (insert via admin since users can't insert; service_role bypasses RLS)
    const { data: existingTranscript } = await admin
      .from("transcripts").select("id").eq("id", FIXED.transcriptId).maybeSingle();
    if (!existingTranscript) {
      await admin.from("transcripts").insert({
        id: FIXED.transcriptId,
        session_id: FIXED.sessionId,
        full_text: "Bonjour, je m'appelle E2E Candidate. J'ai 5 ans d'expérience en QA automation. Ce poste m'intéresse car votre produit allie IA et recrutement.",
        formatted_text: "AI: Pouvez-vous vous présenter ?\nCandidate: Bonjour, je m'appelle E2E Candidate...\nAI: Pourquoi ce poste vous intéresse-t-il ?\nCandidate: Ce poste m'intéresse car...",
        word_count: 85,
        duration_seconds: 1800,
        language: "fr",
      });
    }

    // 11. Delete any pre-existing report for this session so the test always re-generates
    await admin.from("reports").delete().eq("session_id", FIXED.sessionId);

    // 12. Sessions dédiées aux tests Playwright de l'écran InterviewStart.
    //     - Pending : session vierge, statut "pending", aucun message.
    //     - Resume  : session "in_progress" avec 1 message IA + 1 candidat sur la 1re question.
    //     Les deux sont reset à chaque appel pour rester déterministes.

    // -- Pending session : on remet à zéro les champs susceptibles d'avoir été modifiés
    //    par un test précédent (status, started_at, last_question_index...).
    await admin.from("session_messages").delete().eq("session_id", FIXED.pendingSessionId);
    await admin.from("sessions").upsert({
      id: FIXED.pendingSessionId,
      project_id: FIXED.projectId,
      candidate_name: "E2E Pending",
      candidate_email: "e2e-pending@example.com",
      status: "pending",
      token: FIXED.pendingToken,
      started_at: null,
      completed_at: null,
      duration_seconds: null,
      consent_given_at: new Date().toISOString(),
      last_question_index: 0,
      last_activity_at: null,
    });

    // -- Resume session : statut in_progress + 2 messages persistés sur la 1re question.
    await admin.from("session_messages").delete().eq("session_id", FIXED.resumeSessionId);
    await admin.from("sessions").upsert({
      id: FIXED.resumeSessionId,
      project_id: FIXED.projectId,
      candidate_name: "E2E Resume",
      candidate_email: "e2e-resume@example.com",
      status: "in_progress",
      token: FIXED.resumeToken,
      started_at: new Date(Date.now() - 600_000).toISOString(),
      completed_at: null,
      duration_seconds: null,
      consent_given_at: new Date(Date.now() - 600_000).toISOString(),
      last_question_index: 1,
      last_activity_at: new Date(Date.now() - 300_000).toISOString(),
    });
    await admin.from("session_messages").upsert([
      {
        id: FIXED.rm1, session_id: FIXED.resumeSessionId, question_id: FIXED.q1, role: "ai",
        content: "Pouvez-vous vous présenter en quelques minutes ?", is_follow_up: false,
      },
      {
        id: FIXED.rm2, session_id: FIXED.resumeSessionId, question_id: FIXED.q1, role: "candidate",
        content: "Bonjour, je suis E2E Resume, candidat de test pour la reprise de session.",
        is_follow_up: false,
      },
    ]);

    // 13. Fichier media factice pour la resume session (utilisé par le test de cleanup
    //     vérifiant que « Recommencer » purge aussi le storage). Idempotent : upsert.
    try {
      const fakeBytes = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01,
      ]); // header EBML/WebM minimal (assez pour être stocké comme blob)
      await admin.storage
        .from("media")
        .upload(`interviews/${FIXED.resumeSessionId}/q0.webm`, fakeBytes, {
          contentType: "video/webm",
          upsert: true,
        });
    } catch (e) {
      console.warn("seed-e2e-user: impossible d'uploader le fichier media factice", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      credentials: { email: FIXED.email, password: FIXED.password },
      ids: FIXED,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("seed-e2e-user error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
