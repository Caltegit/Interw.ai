ALTER TABLE public.session_messages ADD COLUMN IF NOT EXISTS video_duration_seconds integer;

DROP FUNCTION IF EXISTS public.candidate_insert_message(text,text,text,uuid,boolean,text,text);

CREATE OR REPLACE FUNCTION public.candidate_insert_message(
  _token text,
  _role text,
  _content text,
  _question_id uuid DEFAULT NULL,
  _is_follow_up boolean DEFAULT false,
  _video_segment_url text DEFAULT NULL,
  _audio_segment_url text DEFAULT NULL,
  _video_duration_seconds integer DEFAULT NULL
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
    (session_id, role, content, question_id, is_follow_up, video_segment_url, audio_segment_url, video_duration_seconds)
  VALUES
    (sid, _role::message_role, _content, _question_id, COALESCE(_is_follow_up, false),
     _video_segment_url, _audio_segment_url, _video_duration_seconds)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;