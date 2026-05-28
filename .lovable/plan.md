# תיקון נקודתי: האזור האישי יקרא Progress מה־DB

## הבעיה
`src/pages/Profile.tsx` קורא progress רק מ־`localStorage` (פונקציה `readProgress`). אם localStorage ריק (דפדפן חדש, ניקוי, מכשיר אחר) — הפרופיל מציג 0 גם כש־`lesson_progress` ב־DB מלא.

## מה ישתנה

**קובץ יחיד: `src/pages/Profile.tsx`**

1. הוספת `useEffect` שטוען פעם אחת את כל ה־progress של המשתמש מ־DB:
   - `listProgressForUser(user.id)` מ־`@/lib/db/progressDb`
   - `cloudGetLastViewed(user.id)` (כבר קיים שם) — לשמירת `lastLessonId` הנכון
2. הנתונים נשמרים ב־state מקומי בצורה: `Map<courseId, { completedLessonIds, lastLessonId, startedAt }>`.
3. `getProgress(courseId)` שמועבר ל־`computeUserCourseRows` יחזיר:
   - אם יש נתונים מה־DB → להחזיר אותם (מקור אמת).
   - אחרת → fallback ל־`readProgress` הקיים מ־localStorage.
4. בזמן טעינת ה־DB — להציג את ה־fallback מ־localStorage כפי שעובד היום (אין שינוי UI, אין loading חדש).

## מה לא משתנה
- `src/hooks/useCourseProgress.ts` — לא נוגעים.
- `src/lib/courseRows.ts` — חתימה זהה (`getProgress` כבר מקבל courseId ומחזיר snapshot).
- `src/components/admin/AdminUserProgressDialog.tsx` — לא נוגעים.
- כל UI, עיצוב, RLS, migrations — ללא שינוי.
- localStorage נשאר כפי שהוא, כ־fallback בלבד.

## פרטים טכניים

```ts
// בתוך Profile.tsx
const [dbProgress, setDbProgress] =
  useState<Map<string, { completedLessonIds: string[]; lastLessonId: string | null }>>(new Map());

useEffect(() => {
  if (!user || user.id === "guest") return;
  let cancelled = false;
  (async () => {
    try {
      const [rows, lv] = await Promise.all([
        listProgressForUser(user.id),
        getLastViewed(user.id),
      ]);
      if (cancelled) return;
      const m = new Map<string, { completedLessonIds: string[]; lastLessonId: string | null }>();
      for (const r of rows) {
        const cur = m.get(r.courseId) ?? { completedLessonIds: [], lastLessonId: null };
        cur.completedLessonIds.push(r.lessonId);
        m.set(r.courseId, cur);
      }
      if (lv) {
        const cur = m.get(lv.courseId) ?? { completedLessonIds: [], lastLessonId: null };
        cur.lastLessonId = lv.lessonId;
        m.set(lv.courseId, cur);
      }
      setDbProgress(m);
    } catch { /* keep fallback */ }
  })();
  return () => { cancelled = true; };
}, [user?.id]);

// getProgress: DB אם קיים, אחרת localStorage
getProgress: (courseId) => {
  const db = dbProgress.get(courseId);
  if (db) {
    const local = readProgress(user.id, courseId);
    return {
      completedLessonIds: db.completedLessonIds,
      lastLessonId: db.lastLessonId ?? local?.lastLessonId ?? null,
      startedAt: local?.startedAt ?? null,
    };
  }
  return readProgress(user.id, courseId) ? { ... } : null;
}
```

## RLS
לא נדרש שינוי. הפוליסי הקיים `progress_owner_all` מאפשר למשתמש לקרוא את הרשומות שלו (`auth.uid() = user_id`).

## בדיקות
1. דפדפן חדש / incognito → התחברות כמשתמש עם נתונים ב־`lesson_progress` (למשל `dce7b816-50c1-4a92-b2ce-d224f9a5d701` — 3 ב־elementary, 3 ב־service, 1 ב־sales).
2. פתיחת `/profile` → לראות את אחוזי ההתקדמות והשיעורים שהושלמו זהים לנתוני ה־DB.
3. עמוד הקורס ממשיך לעבוד כרגיל (לא נגענו ב־`useCourseProgress`).
4. דוח המנהל ממשיך לעבוד כרגיל.
5. Build נקי.
