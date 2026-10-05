CREATE OR REPLACE FUNCTION public.protect_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.last_activity_at := OLD.last_activity_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_last_activity
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_activity();