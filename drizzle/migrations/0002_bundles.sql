CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bundle_courses (
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, course_id)
);
CREATE TABLE public.bundle_lessons (
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, lesson_id)
);
CREATE TABLE public.user_bundles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bundle_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundles, public.bundle_courses, public.bundle_lessons, public.user_bundles TO authenticated;
GRANT ALL ON public.bundles, public.bundle_courses, public.bundle_lessons, public.user_bundles TO service_role;

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bundles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_bundle_member(_user_id uuid, _bundle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_bundles WHERE user_id = _user_id AND bundle_id = _bundle_id)
$$;

CREATE OR REPLACE FUNCTION public.user_has_course(_user_id uuid, _course_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assignments WHERE user_id = _user_id AND course_id = _course_id)
      OR EXISTS (SELECT 1 FROM public.user_bundles ub JOIN public.bundle_courses bc ON bc.bundle_id = ub.bundle_id
                 WHERE ub.user_id = _user_id AND bc.course_id = _course_id)
$$;

CREATE OR REPLACE FUNCTION public.user_has_lesson(_user_id uuid, _lesson_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lesson_assignments WHERE user_id = _user_id AND lesson_id = _lesson_id)
      OR EXISTS (SELECT 1 FROM public.user_bundles ub JOIN public.bundle_lessons bl ON bl.bundle_id = ub.bundle_id
                 WHERE ub.user_id = _user_id AND bl.lesson_id = _lesson_id)
$$;

REVOKE ALL ON FUNCTION public.is_bundle_member(uuid, uuid), public.user_has_course(uuid, text), public.user_has_lesson(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_bundle_member(uuid, uuid), public.user_has_course(uuid, text), public.user_has_lesson(uuid, text) TO authenticated, service_role;

CREATE POLICY bundles_admin_all ON public.bundles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY bundles_member_read ON public.bundles FOR SELECT TO authenticated
  USING (public.is_bundle_member(auth.uid(), id));

CREATE POLICY bundle_courses_admin_all ON public.bundle_courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY bundle_courses_member_read ON public.bundle_courses FOR SELECT TO authenticated
  USING (public.is_bundle_member(auth.uid(), bundle_id));

CREATE POLICY bundle_lessons_admin_all ON public.bundle_lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY bundle_lessons_member_read ON public.bundle_lessons FOR SELECT TO authenticated
  USING (public.is_bundle_member(auth.uid(), bundle_id));

CREATE POLICY user_bundles_admin_all ON public.user_bundles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_bundles_own_read ON public.user_bundles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (is_locked = false AND (public.user_has_course(auth.uid(), course_id) OR public.user_has_lesson(auth.uid(), id)))
  OR (is_locked = true AND public.user_has_lesson(auth.uid(), id))
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bundles, public.bundle_courses, public.bundle_lessons, public.user_bundles;