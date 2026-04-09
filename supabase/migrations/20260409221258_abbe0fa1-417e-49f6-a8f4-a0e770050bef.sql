CREATE POLICY "Users can delete own report shares"
ON public.report_shares
FOR DELETE
TO authenticated
USING (created_by = auth.uid());