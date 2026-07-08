CREATE POLICY "Backend can manage password reset codes"
  ON public.password_reset_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);