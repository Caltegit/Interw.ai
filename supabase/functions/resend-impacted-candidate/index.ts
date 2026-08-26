// Renvoie une invitation « reprise entretien » aux candidats impactés par la
// régression d'upload de juillet 2026. 100 % manuel : appelé uniquement depuis
// l'écran super-admin /admin/candidates-to-recover.
//
// Payload : { original_session_id: uuid, is_witness?: boolean }
// - Vérifie que l'appelant est super_admin (ou appel interne).
// - Refuse si un fichier > 1 Ko existe déjà sous interviews/<sid>/ (session non impactée).
// - Refuse si une re-invitation a déjà été envoyée pour cette session.
// - Crée une nouvelle session `pending` avec les mêmes coordonnées candidat.
// - Marque l'ancienne session `cancelled` (si pas déjà `cancelled`).
// - Envoie l'e-mail via send-transactional-email (template candidate-recovery-invite).
// - Enregistre la trace dans session_reinvitations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import { requireCallerOrInternal, SHARED_CORS } from "../_shared/auth-guard.ts";

const CORS = {
  ...SHARED_CORS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Auth : appel interne OU super-admin authentifié.
  const caller = await requireCallerOrInternal(req, CORS);
  if (!caller.ok) return caller.response;

  if (!caller.internal) {
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (roleErr || !roleRow) return json(403, { error: "Réservé aux super-admins" });
  }

  let payload: { original_session_id?: string; is_witness?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON invalide" });
  }
  const originalId = payload.original_session_id;
  const isWitness = payload.is_witness === true;
  if (!originalId || !/^[0-9a-f-]{36}$/i.test(originalId)) {
    return json(400, { error: "original_session_id requis" });
  }

  // 2. Charger la session d'origine + poste.
  const { data: original, error: origErr } = await admin
    .from("sessions")
    .select("id, project_id, organization_id, candidate_name, candidate_email, candidate_phone, candidate_linkedin_url, candidate_job_title, status, projects(slug, title, job_title, organizations(name))")
    .eq("id", originalId)
    .maybeSingle();
  if (origErr || !original) return json(404, { error: "Session introuvable" });

  // 3. (Ancien garde-fou "fichiers > 1 Ko" supprimé : depuis la bascule vers
  //    la surveillance continue via signaux (audio_failed, summary_empty,
  //    job_failed, missing_media), une session peut légitimement contenir des
  //    médias tout en étant listée comme anomalie — ex. session d'Inès
  //    récupérée avec q0.mp4 mais audio KO. La page /admin/candidates-to-recover
  //    vet déjà la légitimité du renvoi via la RPC dédiée.)

  // 4. Garde anti-double-clic : refuser si un envoi vient d'être fait (< 10 s).
  //    Au-delà, on autorise des renvois multiples pour couvrir les cas où la
  //    reprise a elle-même échoué (média manquant, audio KO, etc.).
  const tenSecAgo = new Date(Date.now() - 10_000).toISOString();
  const { data: recent } = await admin
    .from("session_reinvitations")
    .select("id, email_sent_at")
    .eq("original_session_id", originalId)
    .eq("email_status", "sent")
    .gte("email_sent_at", tenSecAgo)
    .limit(1);
  if (recent && recent.length > 0) {
    return json(429, {
      error: "Un envoi vient d'avoir lieu il y a moins de 10 secondes. Réessayez.",
    });
  }

  // 5. Créer une nouvelle session pending clone.
  const { data: newSession, error: newErr } = await admin
    .from("sessions")
    .insert({
      project_id: original.project_id,
      organization_id: original.organization_id,
      candidate_name: original.candidate_name,
      candidate_email: original.candidate_email,
      candidate_phone: (original as any).candidate_phone ?? null,
      candidate_linkedin_url: (original as any).candidate_linkedin_url ?? null,
      candidate_job_title: (original as any).candidate_job_title ?? null,
      status: "pending",
    })
    .select("id, token")
    .single();
  if (newErr || !newSession) {
    console.error("resend-impacted-candidate: create session failed", newErr);
    return json(500, { error: "Création de la nouvelle session échouée" });
  }

  // 6. Marquer l'ancienne session cancelled si encore active.
  if (original.status !== "cancelled") {
    await admin
      .from("sessions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", originalId);
  }

  // 7. Envoi de l'e-mail.
  const project = (original as any).projects ?? {};
  const org = project.organizations ?? {};
  // Domaine public fixe — jamais l'origine de la requête (preview Lovable
  // ou autre) pour éviter de mettre un lien lovableproject.com dans l'e-mail.
  const PUBLIC_APP_URL = (Deno.env.get("PUBLIC_APP_URL") || "https://interw.com").replace(/\/$/, "");
  const ctaLink = `${PUBLIC_APP_URL}/session/${project.slug}/start/${newSession.token}`;
  const prenom = String(original.candidate_name ?? "").trim().split(/\s+/)[0] || "";

  // Charger l'override global du modèle (si un super-admin l'a personnalisé).
  const { data: override } = await admin
    .from("global_email_template_overrides")
    .select("subject, intro_html, outro_html")
    .eq("template_key", "candidate-recovery-invite")
    .maybeSingle();

  const { error: sendErr, data: sendData } = await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName: "candidate-recovery-invite",
      recipientEmail: original.candidate_email,
      templateData: {
        prenom,
        poste: project.job_title || project.title || "",
        entreprise: org.name || "",
        cta_link: ctaLink,
        subject_override: override?.subject ?? "",
        intro_html: override?.intro_html ?? "",
        outro_html: override?.outro_html ?? "",
      },
    },
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "x-internal-secret": serviceRoleKey,
    },
  });

  const emailStatus = sendErr ? "failed" : "sent";
  const emailMessageId = (sendData as any)?.messageId ?? (sendData as any)?.id ?? null;

  // 8. Trace dans session_reinvitations.
  const { data: trace, error: traceErr } = await admin
    .from("session_reinvitations")
    .insert({
      original_session_id: originalId,
      new_session_id: newSession.id,
      project_id: original.project_id,
      candidate_email: original.candidate_email,
      candidate_name: original.candidate_name,
      reason: isWitness ? "witness_test" : "upload_regression_july_2026",
      is_witness: isWitness,
      email_sent_at: sendErr ? null : new Date().toISOString(),
      email_status: emailStatus,
      email_message_id: emailMessageId,
      resent_by: caller.internal ? null : caller.userId,
    })
    .select("id")
    .single();

  if (traceErr) {
    console.error("resend-impacted-candidate: trace insert failed", traceErr);
  }

  if (sendErr) {
    return json(500, {
      error: "Nouvelle session créée mais l'envoi de l'e-mail a échoué",
      new_session_id: newSession.id,
      cta_link: ctaLink,
      reinvitation_id: trace?.id ?? null,
    });
  }

  return json(200, {
    success: true,
    new_session_id: newSession.id,
    cta_link: ctaLink,
    reinvitation_id: trace?.id ?? null,
  });
});
