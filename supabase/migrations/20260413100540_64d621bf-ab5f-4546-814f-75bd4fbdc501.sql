
-- Create invitation status enum
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- Create organization_invitations table
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Members of the org can view invitations
CREATE POLICY "Org members can view invitations"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Members can create invitations for their org
CREATE POLICY "Org members can create invitations"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Members can update invitations (cancel etc.)
CREATE POLICY "Org members can update invitations"
  ON public.organization_invitations
  FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Members can delete invitations
CREATE POLICY "Org members can delete invitations"
  ON public.organization_invitations
  FOR DELETE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Anon can view pending invitations by token (for signup page)
CREATE POLICY "Anon can view invitation by token"
  ON public.organization_invitations
  FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- Allow org members to see each other's profiles
CREATE POLICY "Org members can view org profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Allow org members to update their organization
CREATE POLICY "Org members can update their organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Function to accept invitation and link user to org
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
BEGIN
  -- Find valid invitation
  SELECT id, organization_id INTO _invitation_id, _org_id
  FROM public.organization_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Update invitation status
  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;

  -- Link user to organization
  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;

  -- Add recruiter role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'recruiter')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
