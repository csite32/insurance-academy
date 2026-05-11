-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.learning_mode AS ENUM ('sequential','free');
CREATE TYPE public.course_status AS ENUM ('active','draft');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ COURSES / CHAPTERS / LESSONS ============
CREATE TABLE public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'default',
  learning_mode public.learning_mode NOT NULL DEFAULT 'sequential',
  status public.course_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  content TEXT,
  attachments TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  "order" INTEGER NOT NULL DEFAULT 1,
  has_quiz BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ============ ASSIGNMENTS / PROGRESS / LAST VIEWED ============
CREATE TABLE public.assignments (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.last_viewed (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE public.last_viewed ENABLE ROW LEVEL SECURITY;

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "courses_read" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_admin_write" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "chapters_read" ON public.chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "chapters_admin_write" ON public.chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "lessons_read" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "lessons_admin_write" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "assignments_read_own_or_admin" ON public.assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "assignments_admin_write" ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "progress_owner_all" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lastviewed_owner_all" ON public.last_viewed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ STORAGE: AVATARS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ SEED CONTENT ============
INSERT INTO public.courses (id,title,description,image,icon_key,learning_mode,status) VALUES
('service','שירות לקוחות','הכשרות שירות, ניהול תלונות ומשובים שוטפים.','','service','sequential','active'),
('elementary','אלמנטרי','ביטוח רכב, דירה ורכוש — הכשרות וערכוני מוצר.','','elementary','sequential','active'),
('sales','מכירות','כלים, תסריטים וקורסים לשיפור ביצועי המכירה.','','sales','sequential','active'),
('private','מוצרי פרט','ביטוחי משכנתא, ביטוח ריסק וביטוחי בריאות.','','private','sequential','active'),
('finance','פיננסים','השקעות, ביטוח חיים ומוצרי חיסכון.','','finance','sequential','active'),
('pension','פנסיה וגמל','קורסים בקרנות פנסיה, גמל והשתלמות.','','pension','sequential','active');

INSERT INTO public.chapters (id,course_id,"order",title) VALUES
('service-ch-1','service',1,'מבוא לביטוחי בריאות'),
('service-ch-2','service',2,'מסלולי כיסוי'),
('service-ch-3','service',3,'תהליך מכירה'),
('elementary-ch-1','elementary',1,'מבוא לביטוחי בריאות'),
('elementary-ch-2','elementary',2,'מסלולי כיסוי'),
('elementary-ch-3','elementary',3,'תהליך מכירה'),
('sales-ch-1','sales',1,'מבוא לביטוחי בריאות'),
('sales-ch-2','sales',2,'מסלולי כיסוי'),
('sales-ch-3','sales',3,'תהליך מכירה'),
('private-ch-1','private',1,'מבוא לביטוחי בריאות'),
('private-ch-2','private',2,'מסלולי כיסוי'),
('private-ch-3','private',3,'תהליך מכירה'),
('finance-ch-1','finance',1,'מבוא לביטוחי בריאות'),
('finance-ch-2','finance',2,'מסלולי כיסוי'),
('finance-ch-3','finance',3,'תהליך מכירה'),
('pension-ch-1','pension',1,'מבוא לביטוחי בריאות'),
('pension-ch-2','pension',2,'מסלולי כיסוי'),
('pension-ch-3','pension',3,'תהליך מכירה');

INSERT INTO public.lessons (id,course_id,chapter_id,"order",title,description,video_url,content,attachments,has_quiz,is_locked)
SELECT
  c.id || '-' || ch.id || '-l-' || l.idx AS id,
  c.id AS course_id,
  ch.id AS chapter_id,
  l.idx AS "order",
  l.title,
  'סקירה תמציתית של נושא השיעור והתוצרים שתשיגו בסיום.',
  'https://player.vimeo.com/video/76979871',
  'בשיעור זה נסקור את עקרונות היסוד של הנושא, נכיר מושגים מרכזיים ונראה דוגמאות מעשיות מהשטח.',
  ARRAY[]::text[],
  (l.idx % 2 = 1),
  false
FROM public.courses c
JOIN public.chapters ch ON ch.course_id = c.id
JOIN LATERAL (
  SELECT idx, title FROM (VALUES
    (1, CASE ch."order" WHEN 1 THEN 'ברוכים הבאים לקורס' WHEN 2 THEN 'ניתוחים פרטיים' ELSE 'איתור צרכים' END),
    (2, CASE ch."order" WHEN 1 THEN 'מהו ביטוח בריאות פרטי' WHEN 2 THEN 'תרופות מחוץ לסל' ELSE 'התאמת מסלול' END),
    (3, CASE ch."order" WHEN 1 THEN 'מבנה השוק בישראל' WHEN 2 THEN 'השתלות וטיפולים בחו״ל' ELSE 'טיפול בהתנגדויות' END),
    (4, CASE ch."order" WHEN 1 THEN 'מושגי יסוד' WHEN 2 THEN 'כתבי שירות' ELSE 'סגירת עסקה' END),
    (5, CASE ch."order" WHEN 1 THEN NULL WHEN 2 THEN 'השוואת חברות' ELSE 'סיכום הקורס' END)
  ) AS t(idx,title)
  WHERE t.title IS NOT NULL
) l ON true;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============ SEED AUTH USERS (demo + admin) ============
DO $$
DECLARE
  demo_id UUID := gen_random_uuid();
  admin_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email='demo@academy.co.il') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated','authenticated',
      'demo@academy.co.il', crypt('123456', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"יוסי לוי"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), demo_id,
      jsonb_build_object('sub', demo_id::text, 'email', 'demo@academy.co.il', 'email_verified', true),
      'email', demo_id::text, now(), now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email='admin@academy.co.il') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated','authenticated',
      'admin@academy.co.il', crypt('123456', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"מנהל מערכת"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@academy.co.il', 'email_verified', true),
      'email', admin_id::text, now(), now(), now());
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.assignments (user_id, course_id)
  SELECT u.id, c.course_id
  FROM auth.users u
  CROSS JOIN (VALUES ('service'),('elementary'),('sales'),('finance')) AS c(course_id)
  WHERE u.email = 'demo@academy.co.il'
  ON CONFLICT DO NOTHING;
END $$;