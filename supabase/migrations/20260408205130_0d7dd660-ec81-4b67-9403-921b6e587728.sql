
-- Allow anon to insert sessions (candidate self-registration)
CREATE POLICY "Anon can create sessions" ON sessions FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to update sessions (status changes during interview)
CREATE POLICY "Anon can update sessions" ON sessions FOR UPDATE TO anon
  USING (true);

-- Allow anon to insert session messages during interview
CREATE POLICY "Anon can insert messages" ON session_messages FOR INSERT TO anon
  WITH CHECK (true);
