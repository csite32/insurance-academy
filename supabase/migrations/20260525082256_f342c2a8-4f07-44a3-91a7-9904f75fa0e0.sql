CREATE POLICY progress_admin_read ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY lastviewed_admin_read ON public.last_viewed
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));