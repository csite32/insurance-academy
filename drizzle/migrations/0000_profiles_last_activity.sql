ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_activity()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET last_activity_at = now()
  WHERE id = auth.uid()
    AND (last_activity_at IS NULL OR last_activity_at < now() - interval '15 minutes');
$$;

REVOKE ALL ON FUNCTION public.touch_last_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_activity() TO authenticated;