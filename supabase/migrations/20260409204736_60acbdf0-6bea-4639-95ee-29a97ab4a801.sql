
-- Table for report sharing links
CREATE TABLE public.report_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own shares
CREATE POLICY "Users can view own report shares"
  ON public.report_shares FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create report shares"
  ON public.report_shares FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own report shares"
  ON public.report_shares FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Anon can view active shares (for public link access)
CREATE POLICY "Anon can view active shares"
  ON public.report_shares FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Allow anon to read reports via share token (need to add policy on reports table)
CREATE POLICY "Anon can view shared reports"
  ON public.reports FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.report_shares rs
      WHERE rs.report_id = reports.id
        AND rs.is_active = true
        AND (rs.expires_at IS NULL OR rs.expires_at > now())
    )
  );

CREATE INDEX idx_report_shares_token ON public.report_shares(share_token);
CREATE INDEX idx_report_shares_report_id ON public.report_shares(report_id);
