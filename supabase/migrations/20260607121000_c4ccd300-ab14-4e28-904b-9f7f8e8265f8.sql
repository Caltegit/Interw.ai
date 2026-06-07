
CREATE TABLE public.superadmin_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  redirect_to text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_ip text
);

CREATE INDEX idx_superadmin_magic_links_token ON public.superadmin_magic_links(token);
CREATE INDEX idx_superadmin_magic_links_expires ON public.superadmin_magic_links(expires_at);

GRANT ALL ON public.superadmin_magic_links TO service_role;

ALTER TABLE public.superadmin_magic_links ENABLE ROW LEVEL SECURITY;

-- Aucun accès direct via PostgREST : tout passe par les edge functions (service role).
CREATE POLICY "service role only"
  ON public.superadmin_magic_links
  FOR ALL
  USING (false)
  WITH CHECK (false);
