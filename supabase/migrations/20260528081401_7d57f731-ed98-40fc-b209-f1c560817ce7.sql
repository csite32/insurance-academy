-- 1) Tighten EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) Restrict locked lesson content to assigned users and admins
DROP POLICY IF EXISTS lessons_read ON public.lessons;

CREATE POLICY lessons_read ON public.lessons
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR is_locked = false
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.user_id = auth.uid() AND a.course_id = lessons.course_id
  )
  OR EXISTS (
    SELECT 1 FROM public.lesson_assignments la
    WHERE la.user_id = auth.uid() AND la.lesson_id = lessons.id
  )
);
