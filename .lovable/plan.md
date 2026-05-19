## שלב F: הרשאות ברמת שיעור בודד — תוכנית מלאה

### עקרונות
- שינוי תשתיתי רגיש — מבוצע בשלבים נפרדים, עצירה לאישור בין שלב לשלב.
- ללא שינוי עיצוב כללי, ללא פגיעה ב-Auth/Progress/Avatar/Admin/Course/Profile.
- `assignments` הקיים נשמר (קורס מלא). מתווסף `lesson_assignments` (שיעור בודד).
- קבצי Mock נשארים אך לא בשימוש כמקור אמת.

### כללי תצוגה למשתמש רגיל (מחייבים בכל המסכים)
- **לא מוצגים** קורסים שאינם משויכים (לא כקורס מלא ולא דרך שיעור בודד).
- **אין כפתורי / כרטיסי "אין לך גישה" / "נעול"** בשום מקום.
- קורס שמשויך במלואו → מוצג רגיל.
- קורס שיש בו רק שיעורים בודדים → מוצג בעמוד הבית עם תגית **"שיעורים נבחרים"**.
- בתוך קורס כזה: רק השיעורים המשויכים מוצגים. פרקים ריקים מוסתרים. אין שיעורים נעולים.
- Progress מחושב **רק** לפי השיעורים הזמינים למשתמש.

---

### שלב F1 — טבלה ומודל נתונים

**מיגרציה ל-Supabase:**

טבלה `lesson_assignments`:
- `user_id` (uuid, NOT NULL)
- `course_id` (text, NOT NULL)
- `lesson_id` (text, NOT NULL)
- `created_at` (timestamptz default now())
- Primary Key: `(user_id, lesson_id)`
- Index: `(user_id, course_id)`, `(course_id)`

RLS:
- `lesson_assignments_read_own_or_admin` (SELECT): `auth.uid() = user_id OR has_role(auth.uid(),'admin')`
- `lesson_assignments_admin_write` (ALL): `has_role(auth.uid(),'admin')`

Realtime:
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_assignments`

**שכבת DB** — קובץ חדש `src/lib/db/lessonAssignmentsDb.ts`:
- `listAllLessonAssignments()` — לאדמין/הידרציה
- `listLessonAssignmentsForUser(userId)` → `Array<{ courseId, lessonId }>`
- `setLessonAssignmentsForUser(userId, lessonIds: string[])` — מחיקה+הכנסה אטומית
- `assignLesson` / `unassignLesson`
- `subscribeLessonAssignments(cb)`

**עצירה ובדיקה:** Build נקי, הטבלה נגישה ב-DB.

---

### שלב F2 — UI ניהול מלא ב-`AdminAssignments`

**עדכון `adminStore`:**
- שדה חדש: `lessonAssignments: { userId, courseId, lessonId }[]`
- הידרציה מקבילה ל-`assignments`
- מנוי Realtime נוסף
- פעולה: `saveUserAssignments(userId, { fullCourses, lessons })` — מעדכנת את שתי הטבלאות

**שדרוג `AdminAssignments.tsx`** (רכיבי shadcn קיימים בלבד, אותו עיצוב כללי):

מבנה:
```
┌─ Input חיפוש משתמש (שם / אימייל) ──┐
│                                     │
├─ רשימת משתמשים מסוננת ─────────────┤
│  בחירת משתמש                       │
├─ פאנל שיוכים למשתמש הנבחר ─────────┤
│  Accordion עבור כל קורס:           │
│   [✓] קורס מלא   [תגית סטטוס] [▼] │
│   תגיות: "קורס מלא" / "שיוך חלקי"  │
│           / "לא משויך"             │
│                                     │
│   כשפתוח:                           │
│   ├─ פרק 1                          │
│   │  ├─ [✓] שיעור 1.1               │
│   │  └─ [ ] שיעור 1.2               │
│   └─ פרק 2 ...                      │
│                                     │
│  [שמור שינויים]  [בטל]              │
└─────────────────────────────────────┘
```

רכיבים: `Accordion`, `Checkbox`, `Badge`, `Input`, `Button`, `ScrollArea` — כולם קיימים.

התנהגות:
- "קורס מלא" מסומן → כל השיעורים מסומנים אוטומטית, סטטוס = `קורס מלא`.
- ביטול "קורס מלא" → לא מבטל את הסימונים האישיים, סטטוס עובר ל-`שיוך חלקי` או `לא משויך`.
- סימון/ביטול שיעור כשהקורס לא מלא → `שיוך חלקי`.
- כל השיעורים סומנו ידנית → ההצעה האוטומטית: סימון "קורס מלא".
- State: `selectedUserId`, `draftFullCourses: Set`, `draftLessons: Set`, `dirty`.
- שמירה: `saveUserAssignments` → `setAssignmentsForUser` + `setLessonAssignmentsForUser`. Toast הצלחה/שגיאה.

**עצירה ובדיקה:** המנהל יוצר/משנה שיוכים, הנתון נשמר נכון בענן.

---

### שלב F3 — חיבור לפרונט (לוגיקת גישה)

**Helper משותף** — קובץ חדש `src/lib/access.ts`:
- `getCourseAccessMode(courseId, assignedCourses, assignedLessonsByCourse)` → `'full' | 'partial' | 'none'`
- `getVisibleCourseIds(...)` → רק קורסים עם `full` או `partial`
- `getVisibleLessonIds(courseId, allLessons, ...)` → לפי mode
- `getVisibleChapters(allChapters, visibleLessonIds, lessons)` → מסנן פרקים ריקים
- Admin → רואה הכל.

**עדכון `AuthContext`:**
- שדה חדש: `assignedLessons: Array<{ courseId, lessonId }>`
- טעינה ב-`hydrateUser` דרך `listLessonAssignmentsForUser`

**עדכון `CoursesSection` (עמוד הבית):**
- שימוש ב-`getVisibleCourseIds` — קורסים `none` לא מוצגים כלל.
- ספירת שיעורים = `getVisibleLessonIds(...).length`.
- **תגית "שיעורים נבחרים"** על כרטיסי קורסים במצב `partial` (Badge קיים, ללא שינוי עיצוב כללי).
- **הסרת כל מצב "נעול"** מ-`CourseCard` למשתמש רגיל — אם הקורס מוצג, הוא נגיש.

**עדכון `ContinueLearning` / Profile:**
- אותו helper — רק קורסים זמינים מוצגים. Progress לפי הגלוי בלבד.

**עצירה ובדיקה:** משתמש רגיל רואה רק תוכן שיש לו אליו גישה.

---

### שלב F4 — חיבור לעמוד קורס

**עדכון `src/pages/Course.tsx`:**
- חישוב `visibleLessonIds` ו-`visibleChapters` בעזרת ה-helper.
- העברה ל-`LessonSidebar` ול-`LessonContent`.
- שיעורים לא משויכים — לא מוצגים (לא נעולים).
- פרקים ללא שיעורים גלויים — לא מוצגים.
- ניווט בין שיעורים מוגבל לרשימה הגלויה.

**עדכון `useCourseProgress`:**
- פרמטר חדש אופציונלי `visibleLessonIds?: string[]`.
- חישוב אחוז = `completedVisible / visibleLessonIds.length`.
- **אין שינוי בכתיבה/קריאה מ-`lesson_progress` ו-`last_viewed`** — רק חישוב התצוגה משתנה.

**עצירה ובדיקה:** עמוד קורס מציג רק שיעורים מותרים, פרקים ריקים מוסתרים, Progress נכון.

---

### שלב F5 — בדיקות סופיות

1. משתמש עם קורס מלא רואה את כל הקורס + Progress רגיל.
2. משתמש עם שיעורים בודדים רואה את הקורס בעמוד הבית עם תגית **"שיעורים נבחרים"**, ובתוך הקורס רק את השיעורים האלו.
3. פרקים ריקים מוסתרים.
4. אין כרטיסי/כפתורי "אין לך גישה" / "נעול" בשום מקום.
5. קורסים שאינם משויכים כלל — אינם מוצגים.
6. Progress = completed גלוי / סך גלוי.
7. שיוך/ביטול במנהל מתעדכן בפרונט (Realtime).
8. רענון שומר מצב.
9. שמירת התקדמות שיעורים ממשיכה לעבוד (`lesson_progress`).
10. Avatar/Header/Profile לא נפגעים.
11. Build נקי, ללא שגיאות Console.

---

### לא נוגעים
- `useCourseProgress` ברמת הקריאה/כתיבה ל-`lesson_progress`/`last_viewed`
- מנגנון Avatar / Storage
- `assignments` הקיים (קורס מלא)
- RLS של שאר הטבלאות
- עיצוב כללי / Layout / פונט
- קבצי Mock

**בסיום כל תת-שלב (F1 → F5)** — עצירה, דיווח, המתנה לאישור.
