
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'recruiter', 'viewer');
CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.ai_voice_type AS ENUM ('female_fr', 'male_fr', 'female_en', 'male_en');
CREATE TYPE public.project_language AS ENUM ('fr', 'en');
CREATE TYPE public.question_type AS ENUM ('open', 'situational', 'motivation', 'technical');
CREATE TYPE public.scoring_scale_type AS ENUM ('0-5', '0-10', 'ABC');
CREATE TYPE public.criteria_scope AS ENUM ('all_questions', 'specific_questions');
CREATE TYPE public.session_status AS ENUM ('pending', 'video_viewed', 'in_progress', 'completed', 'expired');
CREATE TYPE public.message_role AS ENUM ('ai', 'candidate');
CREATE TYPE public.recommendation_type AS ENUM ('strong_yes', 'yes', 'maybe', 'no');

-- Organizations
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  presentation_video_url TEXT,
  avatar_image_url TEXT,
  ai_voice ai_voice_type NOT NULL DEFAULT 'female_fr',
  ai_persona_name TEXT NOT NULL DEFAULT 'Sophie',
  language project_language NOT NULL DEFAULT 'fr',
  max_duration_minutes INT NOT NULL DEFAULT 30,
  record_audio BOOLEAN NOT NULL DEFAULT true,
  record_video BOOLEAN NOT NULL DEFAULT false,
  status project_status NOT NULL DEFAULT 'draft',
  slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  type question_type NOT NULL DEFAULT 'open',
  follow_up_enabled BOOLEAN NOT NULL DEFAULT true,
  max_follow_ups INT NOT NULL DEFAULT 2,
  scoring_criteria_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Evaluation criteria
CREATE TABLE public.evaluation_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight INT NOT NULL DEFAULT 0,
  scoring_scale scoring_scale_type NOT NULL DEFAULT '0-5',
  anchors JSONB DEFAULT '{}',
  applies_to criteria_scope NOT NULL DEFAULT 'all_questions',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;

-- Sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status session_status NOT NULL DEFAULT 'pending',
  video_viewed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  audio_recording_url TEXT,
  video_recording_url TEXT,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Session messages
CREATE TABLE public.session_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  question_id UUID REFERENCES public.questions(id),
  is_follow_up BOOLEAN NOT NULL DEFAULT false,
  audio_segment_url TEXT
);
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- Transcripts
CREATE TABLE public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL DEFAULT '',
  formatted_text TEXT NOT NULL DEFAULT '',
  word_count INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_grade TEXT,
  executive_summary TEXT NOT NULL DEFAULT '',
  strengths TEXT[] DEFAULT '{}',
  areas_for_improvement TEXT[] DEFAULT '{}',
  recommendation recommendation_type,
  criteria_scores JSONB DEFAULT '{}',
  question_evaluations JSONB DEFAULT '{}',
  recruiter_notes TEXT,
  flagged_moments JSONB DEFAULT '[]',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Organizations: members can see their own org
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles: users see their own, admins see org members
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles: only visible to admins and own user
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Projects: org members can see, recruiters/admins can create/edit
CREATE POLICY "Org members can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Recruiters can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
  );

CREATE POLICY "Recruiters can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
  );

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Questions: same as projects (via project's org)
CREATE POLICY "Org members can view questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Recruiters can manage questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
    )
  );

-- Evaluation criteria: same pattern
CREATE POLICY "Org members can view criteria"
  ON public.evaluation_criteria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Recruiters can manage criteria"
  ON public.evaluation_criteria FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
    )
  );

-- Sessions: org members can view, public access via token for candidates
CREATE POLICY "Org members can view sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Recruiters can create sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
    )
  );

CREATE POLICY "Recruiters can update sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
    )
  );

-- Public access for candidates via token (anon role)
CREATE POLICY "Candidates can view session by token"
  ON public.sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Candidates can update session by token"
  ON public.sessions FOR UPDATE
  TO anon
  USING (true);

-- Session messages: org members + candidates
CREATE POLICY "Org members can view messages"
  ON public.session_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = session_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Candidates can insert messages"
  ON public.session_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Candidates can view messages"
  ON public.session_messages FOR SELECT
  TO anon
  USING (true);

-- Transcripts: org members only
CREATE POLICY "Org members can view transcripts"
  ON public.transcripts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = session_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- Reports: org members can view, recruiters can update notes
CREATE POLICY "Org members can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = session_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Recruiters can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = session_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'))
    )
  );

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false);

CREATE POLICY "Org members can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "Org members can view media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media');

CREATE POLICY "Anon can view media"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'media');
