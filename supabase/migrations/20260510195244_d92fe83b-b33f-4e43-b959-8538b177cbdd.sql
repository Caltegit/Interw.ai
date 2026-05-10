-- Allow authenticated users to view shared reports through valid share tokens

CREATE POLICY "Authenticated can view active shares"
ON public.report_shares
FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Authenticated can view shared reports"
ON public.reports
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.report_shares rs
  WHERE rs.report_id = reports.id
    AND rs.is_active = true
    AND (rs.expires_at IS NULL OR rs.expires_at > now())
));

CREATE POLICY "Authenticated can view shared session messages"
ON public.session_messages
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.reports r
  JOIN public.report_shares rs ON rs.report_id = r.id
  WHERE r.session_id = session_messages.session_id
    AND rs.is_active = true
    AND (rs.expires_at IS NULL OR rs.expires_at > now())
));

CREATE POLICY "Authenticated can view shared transcripts"
ON public.transcripts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.reports r
  JOIN public.report_shares rs ON rs.report_id = r.id
  WHERE r.session_id = transcripts.session_id
    AND rs.is_active = true
    AND (rs.expires_at IS NULL OR rs.expires_at > now())
));