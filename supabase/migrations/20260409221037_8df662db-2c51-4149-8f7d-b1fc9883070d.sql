CREATE POLICY "Authenticated can insert messages"
ON public.session_messages
FOR INSERT
TO authenticated
WITH CHECK (true);