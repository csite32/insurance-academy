
# העברה לענן Lovable Cloud

מטרה: לעבור ממקור נתונים מבוסס localStorage למקור נתונים יחיד בענן (Lovable Cloud) עבור משתמשים, קורסים, פרקים, שיעורים, שיוכים, התקדמות, שיעור אחרון ותמונת פרופיל. localStorage יישאר רק כ־cache/fallback מקומי.

## עקרונות
- אין שינוי עיצוב, אין שינוי Layout, אין פיצ׳רים חדשים.
- כל קריאה/כתיבה לנתונים מרכזיים תעבור דרך Lovable Cloud.
- הנתונים הקיימים מ־localStorage יהפכו ל־seed ראשוני בעת האכלוס הראשון של ה־DB.
- כל המסכים הקיימים ימשיכו לעבוד דרך אותו `adminStore` שיועבר לקוד אסינכרוני מבוסס Supabase, כדי שלא נצטרך לשכתב מסכים.

## אימות (Authentication)
שני משתמשי ה־seed (`demo@academy.co.il`, `admin@academy.co.il`, סיסמה `123456`) ייווצרו ב־Supabase Auth כדי לאפשר login אמיתי דרך Lovable Cloud. תפקיד `admin` יישמר בטבלה נפרדת `user_roles` (לא ב־profiles) כדי למנוע privilege escalation.
- email auto-confirm יופעל כדי שלא תידרש אימות מייל בשלב זה.
- ההרשמה תישאר סגורה (אין UI ל־signup חדש — כך נשמרת ההנחיה "לא להוסיף פיצ׳רים").
- עמוד ה־Login הקיים יחובר ל־`supabase.auth.signInWithPassword` במקום ל־mock authenticate.

## סכמת DB

```text
profiles            (id=auth.uid, full_name, email, avatar_url)
user_roles          (user_id, role enum: 'admin'|'user')   -- has_role() SECURITY DEFINER
courses             (id text PK, title, description, image, icon_key, learning_mode, status, created_at)
chapters            (id text PK, course_id FK, title, "order")
lessons             (id text PK, course_id FK, chapter_id FK, title, description,
                     video_url, content, attachments text[], "order", has_quiz, is_locked)
assignments         (user_id, course_id)   -- PK composite
lesson_progress     (user_id, lesson_id, completed_at)   -- PK composite
last_viewed         (user_id PK, lesson_id, course_id, viewed_at)
```

### RLS
- `profiles`: כל אחד רואה ועורך את שלו; admin רואה הכל.
- `user_roles`: SELECT למשתמש המחובר על השורות שלו; INSERT/UPDATE/DELETE רק לאדמין.
- `courses`/`chapters`/`lessons`: SELECT לכל מחובר; INSERT/UPDATE/DELETE רק admin.
- `assignments`: SELECT למשתמש על השורות שלו + admin רואה הכל; כתיבה רק admin.
- `lesson_progress`, `last_viewed`: כל משתמש קורא/כותב רק את שלו.

### Seed
מיגרציה אחת תכניס את הקורסים/פרקים/שיעורים הקיימים (מתוך `src/data/courses.ts` ו־`courseDetail.ts`) ואת השיוכים של `demo` כך שהמערכת תעלה עם אותו תוכן שיש היום.

## שינויים בקוד

1. **`src/data/adminStore.ts`** — הופך לקליינט אסינכרוני מעל Supabase:
   - הסרה של seed/localStorage כמקור אמת. נשאר רק cache בזיכרון + מנוי realtime על השינויים בטבלאות הרלוונטיות.
   - `useAdminStoreHydration` יבצע `loadAll()` מה־DB.
   - כל הפעולות (`createCourse`, `updateLesson`, `setAssignments` וכו׳) יבצעו `supabase.from(...).insert/update/delete` ויסתמכו על realtime לעדכון ה־cache.
   - `authenticate` יוסר; ההזדהות תעבור ל־AuthContext.

2. **`src/contexts/AuthContext.tsx`** — שכתוב מינימלי:
   - שימוש ב־`supabase.auth.onAuthStateChange` + `getSession`.
   - שליפת profile + role + assignedCourses + last_viewed + completed_lessons מטבלאות ה־DB.
   - `updateAvatar` יעלה ל־storage bucket `avatars` ויעדכן את `profiles.avatar_url`.
   - `markLessonComplete` / `setLastViewed` יכתבו ל־`lesson_progress` / `last_viewed`.

3. **`useCourseProgress`** — יקרא/יכתוב ל־`lesson_progress` ו־`last_viewed` במקום localStorage.

4. **Login / Profile / Course / Admin pages** — בלי שינוי עיצוב; רק התאמה ל־API החדש (async). מסכי loading קצרים בזמן fetch ראשוני.

5. **Storage**: bucket ציבורי `avatars` עם policy שכל משתמש מעלה רק לתיקייה `${auth.uid}/`.

## Fallback
אם ה־fetch מהענן נכשל (offline), נשתמש ב־cache מקומי האחרון מ־localStorage לקריאה בלבד; כתיבות תמיד ינסו לענן ויחזירו שגיאה למשתמש אם נכשלו.

## בדיקות
- Login כ־admin → שינוי שם קורס → התנתקות → Login כ־demo → רואים את השם המעודכן.
- העלאת תמונת פרופיל → רענון → התמונה נשארת.
- סימון שיעור כהושלם → רענון → נשאר מסומן.
- שיוך קורס חדש מ־Admin → demo רואה אותו מיידית.
- Build עובר, אין מסך לבן, RTL נשמר.

## סדר ביצוע
1. הרצת מיגרציית ה־DB + seed (המשתמש מאשר).
2. יצירת שני משתמשי ה־Auth (`demo`, `admin`) + הקצאת role.
3. עדכון `AuthContext` ל־Supabase Auth.
4. שכתוב `adminStore` ל־Supabase.
5. עדכון `useCourseProgress` ושאר נקודות הקריאה.
6. בדיקה ידנית של תרחישים.
