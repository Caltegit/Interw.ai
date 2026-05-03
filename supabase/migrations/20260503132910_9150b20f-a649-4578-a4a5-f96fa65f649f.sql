-- Stocke la service role key dans Vault si pas déjà présente, pour permettre
-- au trigger d'authentifier l'appel à finalize-session.
-- (On réutilise simplement le même secret que le système d'emails.)

CREATE OR REPLACE FUNCTION public.trigger_finalize_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  service_key text;
  project_url text := 'https://qxszgsxdktnwqabsdfvw.supabase.co';
BEGIN
  -- Lire la clé service role depuis Vault.
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE WARNING 'finalize-session trigger: service key not found in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/finalize-session',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key,
      'apikey', service_key
    ),
    body := jsonb_build_object('session_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'finalize-session trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_finalize_on_completed ON public.sessions;

CREATE TRIGGER sessions_finalize_on_completed
AFTER UPDATE OF status ON public.sessions
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION public.trigger_finalize_session();