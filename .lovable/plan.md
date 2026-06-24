# Proxy של קבצי Storage דרך Edge Function

## רקע

ה־signed URL נוצר אבל הדפדפן חוסם את הדומיין של Supabase Storage (`ERR_BLOCKED_BY_CLIENT` — בדרך כלל adblock/uBlock על `*.supabase.co`). הפתרון: לא לפתוח URL של Supabase בדפדפן, אלא להזרים את הקובץ דרך ה־Edge Function (אותו origin של הפונקציות, שלא נחסם).

## שינויים

### 1. `supabase/functions/get-attachment-url/index.ts` — הרחבה

הפונקציה תתמוך בשני מצבים, ללא שבירה של תאימות:

**Input (POST JSON):**
```
{ lessonId: string, path: string, mode?: "view" | "download" | "url" }
```

- `mode` חסר או `"url"` → התנהגות נוכחית: מחזיר `{ url: signedUrl }` (נשמר ליתר ביטחון, לא בשימוש מהפרונט אחרי השינוי).
- `mode === "view"` או `"download"` → מוריד את הקובץ עם service role, ומחזיר את ה־body של הקובץ עם:
  - `Content-Type` מתוך `blob.type` (fallback: ניחוש לפי סיומת — pdf/png/jpg/docx/xlsx/pptx, אחרת `application/octet-stream`).
  - `Content-Disposition: inline; filename="<name>"` לצפייה.
  - `Content-Disposition: attachment; filename="<name>"` להורדה.
  - `Cache-Control: private, max-age=0`.
  - `Access-Control-Expose-Headers: Content-Disposition` (לטובת הפרונט).

**ללא שינוי:**
- אימות JWT (`getClaims(token)`).
- כל בדיקות ההרשאה: admin → תמיד; אחרת `lesson_assignments`; אחרת `assignments` לפי `course_id` כשהשיעור לא נעול.
- אימות ש־`path` שייך ל־`lesson.attachments` (אותה לוגיקה של `extractPath` + `knownPaths`).
- CORS headers בכל response.
- שם הקובץ מחושב מ־`path.split("/").pop()`.

### 2. `src/components/course/AttachmentsList.tsx` — שינוי קריאה

המרת `fetchSignedUrl` ל־`fetchAttachmentBlob(a, mode)`:

- שימוש ב־`fetch` ישיר (לא `supabase.functions.invoke`) כדי לקבל גישה ל־response headers וגוף בינארי:
  ```
  POST `${VITE_SUPABASE_URL}/functions/v1/get-attachment-url`
  Headers:
    Authorization: Bearer <session.access_token>
    apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>
    Content-Type: application/json
  Body: { lessonId, path, mode }
  ```
- שגיאות (status != 2xx): קריאת JSON `{ error }` והצגת toast — אותה הודעה כמו היום.
- הצלחה: `await res.blob()` → `URL.createObjectURL(blob)`.
- `handleView`: `window.open(objectUrl, "_blank", "noopener,noreferrer")`. setTimeout של ~60s ל־`URL.revokeObjectURL`.
- `handleDownload`: יצירת `<a>` עם `href=objectUrl` ו־`download=a.name`, click, revoke מיד אחרי.
- מצב טעינה (`busyId`) נשמר כפי שהוא.
- קישורים חיצוניים (`storagePath` ריק) — נשארים בדיוק כמו עכשיו (פתיחה ישירה של `a.url`).

### 3. ללא שינוי

- `LessonContent.tsx`, `courseDetail.ts`, `courseFromStore.ts`, `AdminLessons.tsx` — נשארים.
- Bucket `lesson-attachments` נשאר Public (שלב 4 לא מתבצע).
- Public read policy לא נמחקת.
- אין מיגרציות, אין שינוי DB.
- Progress / Quiz / Auth / Course logic / Admin logic — לא נוגעים.

## למה זה פותר את החסימה

- הקובץ מוגש מהדומיין של Edge Functions (`*.functions.supabase.co`) דרך `fetch` + `blob:` URL, ולא דרך פתיחה ישירה של דומיין Storage. גם אם adblock חוסם דומיין Storage, ה־fetch לפונקציה לא נחסם, וה־`blob:` URL נפתח מקומית בדפדפן.

## בדיקות אחרי השינוי

1. משתמש מורשה: צפייה → נפתחת לשונית עם הקובץ (PDF/תמונה inline).
2. משתמש מורשה: הורדה → הקובץ יורד עם השם המקורי.
3. משתמש ללא הרשאה לשיעור נעול → toast "Forbidden".
4. אדמין → גישה לכל קובץ.
5. קישור חיצוני (link) → נפתח רגיל בטאב חדש, לא עובר דרך הפונקציה.
6. שגיאת `ERR_BLOCKED_BY_CLIENT` נעלמת.

## עצירה

לאחר הבדיקות — **לא להמשיך לשלב 4** (הפיכת bucket לפרטי / הסרת public policy). עצירה לאישור.
