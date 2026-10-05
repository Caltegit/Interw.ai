// API d'export en lecture seule pour l'outil externe (Convex / Claude Code).
// Authentification : entête `x-api-key` comparé au secret EXPORT_API_KEY.
// Actions (paramètre `action`) : stats, postes, sessions, session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { signMedia } from "../_shared/interview-media.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type, authorization, apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const expected = Deno.env.get("EXPORT_API_KEY") ?? "";
  const given = req.headers.get("x-api-key") ?? "";
  if (!expected || !given || !safeEqual(given, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const url = new URL(req.url);
  const p = url.searchParams;
  const action = p.get("action") ?? "stats";
  const limit = Math.min(Math.max(Number(p.get("limit") ?? 100) || 100, 1), 500);
  const offset = Math.max(Number(p.get("offset") ?? 0) || 0, 0);
  const orgId = p.get("organization_id");
  const projectId = p.get("project_id");
  if (orgId && !UUID.test(orgId)) return json({ error: "organization_id invalide" }, 400);
  if (projectId && !UUID.test(projectId)) return json({ error: "project_id invalide" }, 400);

  try {
    if (action === "stats") {
      const count = async (table: string, f?: (q: any) => any) => {
        let q = db.from(table).select("*", { count: "exact", head: true });
        if (f) q = f(q);
        const { count: c } = await q;
        return c ?? 0;
      };
      const [orgs, projects, questions, criteria, sessions, completed, reports, videos] =
        await Promise.all([
          count("organizations"),
          count("projects"),
          count("questions", (q) => q.is("archived_at", null)),
          count("evaluation_criteria"),
          count("sessions", (q) => q.eq("is_demo", false)),
          count("sessions", (q) => q.eq("is_demo", false).eq("status", "completed")),
          count("reports"),
          count("session_messages", (q) => q.not("video_segment_url", "is", null)),
        ]);
      return json({ orgs, projects, questions, criteria, sessions, completed, reports, videos });
    }

    if (action === "postes") {
      let q = db.from("projects")
        .select("*, questions(*), evaluation_criteria(*)")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (orgId) q = q.eq("organization_id", orgId);
      if (projectId) q = q.eq("id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return json({ data, limit, offset });
    }

    if (action === "sessions") {
      let q = db.from("sessions")
        .select(
          "id, project_id, organization_id, candidate_name, candidate_email, candidate_phone, candidate_linkedin_url, candidate_job_title, status, is_demo, started_at, completed_at, duration_seconds, recruiter_decision, created_at, reports(overall_score, recommendation, executive_summary_short)",
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (orgId) q = q.eq("organization_id", orgId);
      if (projectId) q = q.eq("project_id", projectId);
      const status = p.get("status");
      if (status) q = q.eq("status", status);
      const since = p.get("since");
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return json({ data, limit, offset });
    }

    if (action === "orgs") {
      let q = db.from("organizations").select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (orgId) q = q.eq("id", orgId);
      const { data, error } = await q;
      if (error) throw error;
      return json({ data, limit, offset });
    }

    if (action === "members") {
      let mq = db.from("organization_members").select("organization_id, user_id, created_at")
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);
      if (orgId) mq = mq.eq("organization_id", orgId);
      const { data: mem, error } = await mq;
      if (error) throw error;
      const ids = [...new Set((mem ?? []).map((m) => m.user_id))];
      const [profs, roles, owners] = await Promise.all([
        ids.length ? db.from("profiles").select("user_id, email, full_name").in("user_id", ids) : { data: [] },
        ids.length ? db.from("user_roles").select("user_id, role, organization_id").in("user_id", ids) : { data: [] },
        db.from("organizations").select("id, owner_id"),
      ]);
      const prof = new Map((profs.data ?? []).map((p: any) => [p.user_id, p]));
      const ownerOf = new Map((owners.data ?? []).map((o: any) => [o.id, o.owner_id]));
      const lastSignIn = new Map<string, string | null>();
      await Promise.all(ids.map(async (uid) => {
        const { data } = await db.auth.admin.getUserById(uid);
        lastSignIn.set(uid, data?.user?.last_sign_in_at ?? null);
      }));
      const rows: unknown[] = (mem ?? []).map((m) => {
        const r = (roles.data ?? []).find((x: any) => x.user_id === m.user_id && x.organization_id === m.organization_id);
        const role = ownerOf.get(m.organization_id) === m.user_id ? "owner" : (r as any)?.role ?? "member";
        const p: any = prof.get(m.user_id);
        return {
          status: "active", organization_id: m.organization_id, user_id: m.user_id,
          email: p?.email ?? null, full_name: p?.full_name ?? null, role, language: null,
          created_at: m.created_at, last_sign_in_at: lastSignIn.get(m.user_id) ?? null,
        };
      });
      // Invitations en attente : ajoutées sur la première page uniquement.
      if (offset === 0) {
        let iq = db.from("organization_invitations")
          .select("organization_id, email, invited_by, created_at")
          .eq("status", "pending");
        if (orgId) iq = iq.eq("organization_id", orgId);
        const { data: inv } = await iq;
        for (const i of inv ?? []) {
          rows.push({
            status: "invited", organization_id: i.organization_id, email: i.email,
            role: "member", invited_at: i.created_at, invited_by: i.invited_by,
          });
        }
      }
      return json({ data: rows, limit, offset });
    }

    if (action === "users") {
      const ids = (p.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!ids.length) return json({ error: "ids requis" }, 400);
      if (ids.length > 100) return json({ error: "100 ids maximum" }, 400);
      if (ids.some((i) => !UUID.test(i))) return json({ error: "ids invalides" }, 400);
      const { data, error } = await db.from("profiles").select("user_id, email, full_name").in("user_id", ids);
      if (error) throw error;
      return json({ data: (data ?? []).map((u) => ({ id: u.user_id, email: u.email, full_name: u.full_name })) });
    }

    if (action === "session") {
      const id = p.get("id");
      if (!id || !UUID.test(id)) return json({ error: "id requis" }, 400);
      const [s, m, r, t] = await Promise.all([
        db.from("sessions").select("*").eq("id", id).maybeSingle(),
        db.from("session_messages")
          .select("id, role, content, timestamp, question_id, is_follow_up, video_segment_url, audio_segment_url, video_duration_seconds")
          .eq("session_id", id).order("timestamp", { ascending: true }),
        db.from("reports").select("*").eq("session_id", id).maybeSingle(),
        db.from("transcripts").select("full_text, word_count, duration_seconds, language").eq("session_id", id).maybeSingle(),
      ]);
      if (!s.data) return json({ error: "Session introuvable" }, 404);
      const { token: _t, ...session } = s.data as Record<string, any>;
      const ttl = 6 * 3600;
      const signDoc = async (path: string | null, filename: string | null) => {
        if (!path) return { url: null, mime: null };
        const clean = path.includes("/candidate-cvs/") ? path.split("/candidate-cvs/")[1].split("?")[0] : path;
        const { data } = await db.storage.from("candidate-cvs").createSignedUrl(clean, ttl);
        const ext = (filename ?? clean).split(".").pop()?.toLowerCase() ?? "";
        const mime = ({ pdf: "application/pdf", doc: "application/msword",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          txt: "text/plain", rtf: "application/rtf", odt: "application/vnd.oasis.opendocument.text",
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" } as Record<string, string>)[ext] ?? null;
        return { url: data?.signedUrl ?? null, mime };
      };
      const [cv, cl] = await Promise.all([
        signDoc(session.candidate_cv_url, session.candidate_cv_filename),
        signDoc(session.candidate_cover_letter_url, session.candidate_cover_letter_filename),
      ]);
      session.candidate_cv_url = cv.url;
      session.candidate_cv_mime_type = cv.mime;
      session.candidate_cover_letter_url = cl.url;
      session.candidate_cover_letter_mime_type = cl.mime;
      // L'origine de l'entretien n'est pas enregistrée en base.
      session.source = null;
      session.invited_by = null;
      const messages = await Promise.all((m.data ?? []).map(async (msg) => ({
        ...msg,
        video_url: await signMedia(db, msg.video_segment_url, ttl),
        audio_url: await signMedia(db, msg.audio_segment_url, ttl),
      })));
      return json({ session, messages, report: r.data, transcript: t.data });
    }

    return json({ error: "Action inconnue (stats, postes, sessions, session, orgs, members, users)" }, 400);
  } catch (e) {
    console.error("[export-api]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
