-- Indexes for performance on frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON public.sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_project_created ON public.sessions(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON public.session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_question_id ON public.session_messages(question_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_timestamp ON public.session_messages(session_id, "timestamp");

CREATE INDEX IF NOT EXISTS idx_reports_session_id ON public.reports(session_id);

CREATE INDEX IF NOT EXISTS idx_questions_project_order ON public.questions(project_id, order_index);

CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_project_id ON public.evaluation_criteria(project_id);

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON public.user_roles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON public.transcripts(session_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

CREATE INDEX IF NOT EXISTS idx_question_templates_org ON public.question_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_criteria_templates_org ON public.criteria_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_intro_templates_org ON public.intro_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_interview_templates_org ON public.interview_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_interview_template_questions_template ON public.interview_template_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_interview_template_criteria_template ON public.interview_template_criteria(template_id, order_index);

CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON public.report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON public.report_shares(share_token);

CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON public.email_send_log(status);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);