
CREATE TABLE public.lesson_assignments (
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  lesson_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_lesson_assignments_user_course
  ON public.lesson_assignments (user_id, course_id);

CREATE INDEX idx_lesson_assignments_course
  ON public.lesson_assignments (course_id);

ALTER TABLE public.lesson_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_assignments_read_own_or_admin"
  ON public.lesson_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lesson_assignments_admin_write"
  ON public.lesson_assignments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.lesson_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_assignments;
