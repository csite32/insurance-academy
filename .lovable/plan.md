## ביצוע — Signed URLs ל-`lesson-attachments` (מאושר)

מבוצע בסדר הזה. שום שינוי ב-bucket או מחיקת policy עד שלב 4.

### שלב 1 — Edge Function חדשה
קובץ חדש: `supabase/functions/get-attachment-url/index.ts`
- CORS + OPTIONS.
- מקבל `{ lessonId, path }` (Zod-style ולידציה: לא ריקים, ללא `..`, לא מתחיל ב-`/`).
- מאמת JWT דרך `auth.getUser()` עם anon client + ה-Authorization של הקריאה. אין משתמש → 200 עם `{error:"Unauthenticated"}`.
- service-role client בודק:
  1. האם המשתמש admin (`user_roles`). אם כן — דילוג על בדיקת שיוך.
  2. טוען `lessons(id, course_id, is_locked, attachments)`.
  3. מחלץ את כל ה-paths המוכרים של השיעור (מ-`storage:…` או מתבנית `…/object/public/lesson-attachments/…`), ומוודא שה-`path` המבוקש נמצא ביניהם. אחרת 403.
  4. למשתמש רגיל: אם `is_locked=true` נדרש `lesson_assignments`; אחרת מספיק `lesson_assignments` או `assignments` לקורס.
- בהצלחה: `storage.createSignedUrl(path, 300)` → `{url}`. שגיאות תמיד 200 עם `{error}` (להתאמה לדפוס הקיים בפרויקט).

### שלב 2 — טיפוסים ופירוק
- `src/data/courseDetail.ts`: ל-`Attachment` יתווספו `storagePath?: string` ו-`lessonId?: string`. שום שינוי אחר.
- `src/data/courseFromStore.ts`: `parseAttachment` יחשב `storagePath` גם מערך שמתחיל ב-`storage:` וגם מ-URL ציבורי ישן. `isLink` יישאר true רק לקישורים חיצוניים (`type:"link"` ללא `storagePath`).

### שלב 3 — UI הצפייה
- `src/components/course/LessonContent.tsx`: להעביר `lessonId={lesson.id}` ל-`AttachmentsList`.
- `src/components/course/AttachmentsList.tsx`:
  - prop חדש `lessonId`.
  - לכל פריט:
    - אם `storagePath`: כפתורי "צפייה"/"הורדה" קוראים ל-`supabase.functions.invoke('get-attachment-url', { body:{ lessonId, path: a.storagePath }})`, פותחים `window.open(url,'_blank')` או יוצרים `<a download>` דינמי. שגיאה → toast הולם.
    - אם `isLink` (חיצוני) או אין `storagePath`: התנהגות הנוכחית — `<a href={a.url}>` ישיר. **לא נוגעים בקישורים חיצוניים.**

### שלב 3.5 — העלאת קובץ חדש
- `src/pages/admin/AdminLessons.tsx` ב-`uploadFileForRow`: במקום `getPublicUrl(path).publicUrl`, לשמור `url: "storage:" + path`. שאר הקוד כפי שהוא.

> נקודת עצירה: בשלב הזה המערכת ממשיכה לעבוד כרגיל (ה-bucket עוד public). מאמתים שאין רגרסיה ב-UI ובאדמין.

### שלב 4 — Migration + Bucket לפרטי (אחרון)
- Migration: `DROP POLICY "lesson_attachments_public_read" ON storage.objects;` + יצירת `lesson_attachments_admin_read` (SELECT ל-`authenticated` עם `has_role(auth.uid(),'admin')`).
- אחרי הצלחת ה-migration: קריאה ל-`storage_update_bucket(name='lesson-attachments', public=false)`.

### שלב 5 — בדיקות מיידיות אחרי שלב 4
- קובץ קיים (URL ציבורי ישן ב-DB) — נפתח דרך Edge Function למשתמש מורשה. ✅
- קובץ חדש (`storage:…`) — נפתח למשתמש מורשה. ✅
- משתמש לא מורשה — toast/403. ✅
- משתמש לא מחובר — 401-like. ✅
- אדמין — צפייה עובדת. ✅
- קישור חיצוני (`type:"link"`) — נפתח ישירות, לא נוגע ב-Edge Function. ✅
- בדיקה ישירה ל-URL ציבורי ישן (curl) — מחזיר 400/404. ✅

### לא נוגעים
Progress · Quiz · Auth · Course logic · Admin logic מעבר ל-`uploadFileForRow`.

לאחר אישור Build, אריץ את שלב 1→3.5, אעצור לאישור קצר, ואז אריץ שלב 4 + בדיקות שלב 5.