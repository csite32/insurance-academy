CREATE OR REPLACE FUNCTION public.is_bundle_member(_user_id uuid, _bundle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
     AND EXISTS (SELECT 1 FROM public.user_bundles WHERE user_id = _user_id AND bundle_id = _bundle_id)
$$;

CREATE OR REPLACE FUNCTION public.user_has_course(_user_id uuid, _course_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
     AND (EXISTS (SELECT 1 FROM public.assignments WHERE user_id = _user_id AND course_id = _course_id)
       OR EXISTS (SELECT 1 FROM public.user_bundles ub JOIN public.bundle_courses bc ON bc.bundle_id = ub.bundle_id
                  WHERE ub.user_id = _user_id AND bc.course_id = _course_id))
$$;

CREATE OR REPLACE FUNCTION public.user_has_lesson(_user_id uuid, _lesson_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
     AND (EXISTS (SELECT 1 FROM public.lesson_assignments WHERE user_id = _user_id AND lesson_id = _lesson_id)
       OR EXISTS (SELECT 1 FROM public.user_bundles ub JOIN public.bundle_lessons bl ON bl.bundle_id = ub.bundle_id
                  WHERE ub.user_id = _user_id AND bl.lesson_id = _lesson_id))
$$;