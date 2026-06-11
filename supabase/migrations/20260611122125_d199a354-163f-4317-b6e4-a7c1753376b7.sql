DROP POLICY IF EXISTS lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_locked = false
    AND (
      EXISTS (SELECT 1 FROM public.assignments a WHERE a.user_id = auth.uid() AND a.course_id = lessons.course_id)
      OR EXISTS (SELECT 1 FROM public.lesson_assignments la WHERE la.user_id = auth.uid() AND la.lesson_id = lessons.id)
    )
  )
  OR (
    is_locked = true
    AND EXISTS (SELECT 1 FROM public.lesson_assignments la WHERE la.user_id = auth.uid() AND la.lesson_id = lessons.id)
  )
);