-- ============================================================
-- 1. Fonctions candidat (vérification du jeton côté serveur)
-- ============================================================

CREATE OR REPLACE FUNCTION public.candidate_session_id(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id FROM public.sessions s WHERE s.token = _token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.candidate_get_session(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 10 THEN RETURN NULL; END IF;
  SELECT to_jsonb(s) - 'recruiter_note' - 'recruiter_decision' - 'recruiter_decision_at'
         - 'recruiter_decision_by' - 'assigned_to' - 'last_candidate_email_key'
    INTO result
  FROM public.sessions s
  WHERE s.token = _token
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_get_project(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 10 THEN RETURN NULL; END IF;
  SELECT to_jsonb(p) INTO result
  FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.token = _token
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_get_questions(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 10 THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.order_index), '[]'::jsonb) INTO result
  FROM public.sessions s
  JOIN public.questions q ON q.project_id = s.project_id
  WHERE s.token = _token AND q.archived_at IS NULL;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_list_messages(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  result jsonb;
BEGIN
  sid := public.candidate_session_id(_token);
  IF sid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.timestamp ASC), '[]'::jsonb) INTO result
  FROM public.session_messages m
  WHERE m.session_id = sid;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_count_media_messages(_token text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  n integer;
BEGIN
  sid := public.candidate_session_id(_token);
  IF sid IS NULL THEN RETURN 0; END IF;
  SELECT count(*) INTO n
  FROM public.session_messages m
  WHERE m.session_id = sid
    AND m.role = 'candidate'
    AND (m.video_segment_url IS NOT NULL OR m.audio_segment_url IS NOT NULL);
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_insert_message(
  _token text,
  _role text,
  _content text,
  _question_id uuid DEFAULT NULL,
  _is_follow_up boolean DEFAULT false,
  _video_segment_url text DEFAULT NULL,
  _audio_segment_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  new_id uuid;
BEGIN
  sid := public.candidate_session_id(_token);
  IF sid IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _role NOT IN ('ai', 'candidate') THEN RAISE EXCEPTION 'invalid_role'; END IF;

  INSERT INTO public.session_messages
    (session_id, role, content, question_id, is_follow_up, video_segment_url, audio_segment_url)
  VALUES
    (sid, _role::message_role, _content, _question_id, COALESCE(_is_follow_up, false),
     _video_segment_url, _audio_segment_url)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_reset_messages(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  sid := public.candidate_session_id(_token);
  IF sid IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  DELETE FROM public.session_messages WHERE session_id = sid;
  UPDATE public.sessions
     SET last_question_index = 0, started_at = NULL, status = 'pending'
   WHERE id = sid;
END;
$$;

CREATE OR REPLACE FUNCTION public.candidate_update_session(_token text, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  allowed text[] := ARRAY[
    'status','started_at','completed_at','cancelled_at','last_activity_at',
    'last_question_index','consent_given_at','consent_accepted_at','duration_seconds',
    'end_reason','video_recording_url','audio_recording_url','thumbnail_url',
    'candidate_cv_url','candidate_cv_filename',
    'candidate_cover_letter_url','candidate_cover_letter_filename'
  ];
  k text;
BEGIN
  sid := public.candidate_session_id(_token);
  IF sid IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _patch IS NULL OR jsonb_typeof(_patch) <> 'object' THEN RAISE EXCEPTION 'invalid_patch'; END IF;

  FOR k IN SELECT jsonb_object_keys(_patch) LOOP
    IF NOT (k = ANY(allowed)) THEN
      RAISE EXCEPTION 'field_not_allowed: %', k;
    END IF;
  END LOOP;

  UPDATE public.sessions s SET
    status = CASE WHEN _patch ? 'status'
                  THEN (_patch->>'status')::session_status ELSE s.status END,
    started_at = CASE WHEN _patch ? 'started_at'
                  THEN (_patch->>'started_at')::timestamptz ELSE s.started_at END,
    completed_at = CASE WHEN _patch ? 'completed_at'
                  THEN (_patch->>'completed_at')::timestamptz ELSE s.completed_at END,
    cancelled_at = CASE WHEN _patch ? 'cancelled_at'
                  THEN (_patch->>'cancelled_at')::timestamptz ELSE s.cancelled_at END,
    last_activity_at = CASE WHEN _patch ? 'last_activity_at'
                  THEN (_patch->>'last_activity_at')::timestamptz ELSE s.last_activity_at END,
    last_question_index = CASE WHEN _patch ? 'last_question_index'
                  THEN (_patch->>'last_question_index')::integer ELSE s.last_question_index END,
    consent_given_at = CASE WHEN _patch ? 'consent_given_at'
                  THEN (_patch->>'consent_given_at')::timestamptz ELSE s.consent_given_at END,
    consent_accepted_at = CASE WHEN _patch ? 'consent_accepted_at'
                  THEN (_patch->>'consent_accepted_at')::timestamptz ELSE s.consent_accepted_at END,
    duration_seconds = CASE WHEN _patch ? 'duration_seconds'
                  THEN (_patch->>'duration_seconds')::integer ELSE s.duration_seconds END,
    end_reason = CASE WHEN _patch ? 'end_reason'
                  THEN _patch->>'end_reason' ELSE s.end_reason END,
    video_recording_url = CASE WHEN _patch ? 'video_recording_url'
                  THEN _patch->>'video_recording_url' ELSE s.video_recording_url END,
    audio_recording_url = CASE WHEN _patch ? 'audio_recording_url'
                  THEN _patch->>'audio_recording_url' ELSE s.audio_recording_url END,
    thumbnail_url = CASE WHEN _patch ? 'thumbnail_url'
                  THEN _patch->>'thumbnail_url' ELSE s.thumbnail_url END,
    candidate_cv_url = CASE WHEN _patch ? 'candidate_cv_url'
                  THEN _patch->>'candidate_cv_url' ELSE s.candidate_cv_url END,
    candidate_cv_filename = CASE WHEN _patch ? 'candidate_cv_filename'
                  THEN _patch->>'candidate_cv_filename' ELSE s.candidate_cv_filename END,
    candidate_cover_letter_url = CASE WHEN _patch ? 'candidate_cover_letter_url'
                  THEN _patch->>'candidate_cover_letter_url' ELSE s.candidate_cover_letter_url END,
    candidate_cover_letter_filename = CASE WHEN _patch ? 'candidate_cover_letter_filename'
                  THEN _patch->>'candidate_cover_letter_filename' ELSE s.candidate_cover_letter_filename END
  WHERE s.id = sid;

  RETURN public.candidate_get_session(_token);
END;
$$;

-- Création de session depuis la page publique de poste
CREATE OR REPLACE FUNCTION public.public_start_session(
  _slug text,
  _name text,
  _email text,
  _job_title text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _linkedin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.projects%ROWTYPE;
  new_session public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.projects
   WHERE slug = _slug AND status = 'active' LIMIT 1;
  IF p.id IS NULL THEN RAISE EXCEPTION 'project_not_available'; END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN RAISE EXCEPTION 'project_expired'; END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN RAISE EXCEPTION 'name_required'; END IF;
  IF _email IS NULL OR _email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;

  INSERT INTO public.sessions (
    project_id, organization_id, candidate_name, candidate_email,
    candidate_job_title, candidate_linkedin_url, candidate_phone, recruiter_note
  ) VALUES (
    p.id, p.organization_id, btrim(_name), btrim(_email),
    NULLIF(btrim(COALESCE(_job_title, '')), ''),
    NULLIF(btrim(COALESCE(_linkedin, '')), ''),
    NULLIF(btrim(COALESCE(_phone, '')), ''),
    CASE WHEN NULLIF(btrim(COALESCE(_job_title, '')), '') IS NOT NULL
         THEN 'Poste : ' || btrim(_job_title) END
  ) RETURNING * INTO new_session;

  RETURN jsonb_build_object('id', new_session.id, 'token', new_session.token);
END;
$$;

-- Création de session démo
CREATE OR REPLACE FUNCTION public.public_start_demo_session(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.projects%ROWTYPE;
  new_session public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.projects
   WHERE slug = _slug AND status = 'active' LIMIT 1;
  IF p.id IS NULL THEN RAISE EXCEPTION 'project_not_available'; END IF;

  INSERT INTO public.sessions (
    project_id, organization_id, candidate_name, candidate_email,
    is_demo, consent_accepted_at
  ) VALUES (
    p.id, p.organization_id, 'Démo', 'demo@interw.local', true, now()
  ) RETURNING * INTO new_session;

  RETURN jsonb_build_object('id', new_session.id, 'token', new_session.token);
END;
$$;

-- Écrans candidat annexes (fin d'entretien, page vie privée)
CREATE OR REPLACE FUNCTION public.candidate_session_public_info(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 10 THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'session_id', s.id,
    'status', s.status,
    'project_id', p.id,
    'project_title', p.title,
    'project_job_title', p.job_title,
    'completion_message', p.completion_message,
    'organization_name', o.name
  ) INTO result
  FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  LEFT JOIN public.organizations o ON o.id = p.organization_id
  WHERE s.token = _token
  LIMIT 1;
  RETURN result;
END;
$$;

-- ============================================================
-- 2. Droits d'exécution
-- ============================================================
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.candidate_session_id(text)',
    'public.candidate_get_session(text)',
    'public.candidate_get_project(text)',
    'public.candidate_get_questions(text)',
    'public.candidate_list_messages(text)',
    'public.candidate_count_media_messages(text)',
    'public.candidate_insert_message(text,text,text,uuid,boolean,text,text)',
    'public.candidate_reset_messages(text)',
    'public.candidate_update_session(text,jsonb)',
    'public.public_start_session(text,text,text,text,text,text)',
    'public.public_start_demo_session(text)',
    'public.candidate_session_public_info(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', fn);
  END LOOP;
END $$;

-- ============================================================
-- 3. Fermeture de l'accès anonyme direct aux tables
-- ============================================================
DROP POLICY IF EXISTS "Anon can view sessions on active projects"            ON public.sessions;
DROP POLICY IF EXISTS "Anon can update sessions on active projects"          ON public.sessions;
DROP POLICY IF EXISTS "Anon can insert sessions on active projects"          ON public.sessions;
DROP POLICY IF EXISTS "Anon can view session messages on active projects"    ON public.session_messages;
DROP POLICY IF EXISTS "Anon can update session messages on active projects"  ON public.session_messages;
DROP POLICY IF EXISTS "Anon can insert session messages on active projects"  ON public.session_messages;

REVOKE ALL ON public.sessions         FROM anon;
REVOKE ALL ON public.session_messages FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_messages TO authenticated;
GRANT ALL ON public.sessions         TO service_role;
GRANT ALL ON public.session_messages TO service_role;