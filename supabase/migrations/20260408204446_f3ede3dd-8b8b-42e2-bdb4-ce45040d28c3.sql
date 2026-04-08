
-- Drop all existing org-based policies
DROP POLICY IF EXISTS "Org members can view projects" ON projects;
DROP POLICY IF EXISTS "Recruiters can create projects" ON projects;
DROP POLICY IF EXISTS "Recruiters can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

DROP POLICY IF EXISTS "Org members can view questions" ON questions;
DROP POLICY IF EXISTS "Recruiters can manage questions" ON questions;

DROP POLICY IF EXISTS "Org members can view criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Recruiters can manage criteria" ON evaluation_criteria;

DROP POLICY IF EXISTS "Org members can view sessions" ON sessions;
DROP POLICY IF EXISTS "Recruiters can create sessions" ON sessions;
DROP POLICY IF EXISTS "Recruiters can update sessions" ON sessions;

DROP POLICY IF EXISTS "Org members can view messages" ON session_messages;
DROP POLICY IF EXISTS "Anon can view messages" ON session_messages;

DROP POLICY IF EXISTS "Org members can view reports" ON reports;
DROP POLICY IF EXISTS "Recruiters can update reports" ON reports;

DROP POLICY IF EXISTS "Org members can view transcripts" ON transcripts;

DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

DROP POLICY IF EXISTS "Admins can view org profiles" ON profiles;

-- Projects: user-based access via created_by
CREATE POLICY "Users can view own projects" ON projects FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create projects" ON projects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own projects" ON projects FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Candidates can view project info (needed for interview landing)
CREATE POLICY "Anon can view projects" ON projects FOR SELECT TO anon
  USING (status = 'active'::project_status);

-- Questions: follow project access
CREATE POLICY "Users can view own project questions" ON questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = questions.project_id AND projects.created_by = auth.uid()));

CREATE POLICY "Users can manage own project questions" ON questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = questions.project_id AND projects.created_by = auth.uid()));

-- Anon can view questions for interview
CREATE POLICY "Anon can view questions" ON questions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = questions.project_id AND projects.status = 'active'::project_status));

-- Evaluation criteria: follow project access
CREATE POLICY "Users can view own project criteria" ON evaluation_criteria FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = evaluation_criteria.project_id AND projects.created_by = auth.uid()));

CREATE POLICY "Users can manage own project criteria" ON evaluation_criteria FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = evaluation_criteria.project_id AND projects.created_by = auth.uid()));

-- Sessions: follow project access
CREATE POLICY "Users can view own project sessions" ON sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.created_by = auth.uid()));

CREATE POLICY "Users can create sessions" ON sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.created_by = auth.uid()));

CREATE POLICY "Users can update sessions" ON sessions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.created_by = auth.uid()));

-- Anon can still view sessions by token
CREATE POLICY "Anon can view sessions" ON sessions FOR SELECT TO anon USING (true);

-- Session messages
CREATE POLICY "Users can view own session messages" ON session_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.id = session_messages.session_id AND p.created_by = auth.uid()));

CREATE POLICY "Anon can view session messages" ON session_messages FOR SELECT TO anon USING (true);

-- Reports
CREATE POLICY "Users can view own reports" ON reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.id = reports.session_id AND p.created_by = auth.uid()));

CREATE POLICY "Users can update own reports" ON reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.id = reports.session_id AND p.created_by = auth.uid()));

-- Transcripts
CREATE POLICY "Users can view own transcripts" ON transcripts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id WHERE s.id = transcripts.session_id AND p.created_by = auth.uid()));

-- Organizations: anyone can view (simplified)
CREATE POLICY "Anyone can view orgs" ON organizations FOR SELECT TO authenticated USING (true);
