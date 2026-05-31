## תיקון נקודתי — לוגינג + מיגרציה חד־פעמית של localStorage

### 1) `src/hooks/useCourseProgress.ts` — להחליף `.catch(() => {})` ב־`console.error`

שלושה מקומות בלבד:
- `setLastLesson` → קריאה ל־`cloudSetLastViewed(...)`
- `toggleComplete` → קריאה ל־`cloudMarkCompleted(...)` / `cloudUnmarkCompleted(...)`
- `markComplete` → קריאה ל־`cloudMarkCompleted(...)`

בכל אחד: להחליף את ה־`.catch(() => {})` ב־`.catch((err) => console.error("[useCourseProgress] <action> failed", { userId, courseId, lessonId, error: err }))`. שום שינוי בלוגיקה, רק לוג.

### 2) `src/pages/Profile.tsx` — מיגרציה חד־פעמית מ־localStorage ל־`lesson_progress`/`last_viewed`

להוסיף בלוק בתוך ה־`useEffect` הקיים, **אחרי** הטעינה הראשונית מ־DB ו**לפני** בניית ה־`Map` ל־state. שלבים:

1. לבנות `dbCompletedByCourse: Map<courseId, Set<lessonId>>` מהשורות שכבר נטענו, וכן `dbLastViewedCourses: Set<courseId>`.
2. לסרוק את כל מפתחות `localStorage` שמתחילים ב־`progress:${user.id}:` ולחלץ `courseId` ואת ה־JSON השמור (`CourseProgress`).
3. עבור כל `lessonId` ב־`local.completedLessonIds` שלא קיים כבר ב־DB → לקרוא ל־`markLessonCompleted(user.id, courseId, lessonId)`. ה־upsert עם PK `(user_id,lesson_id)` הופך את הפעולה ל־idempotent.
4. עבור `local.lastLessonId` שקיים, אם אין שורת `last_viewed` לקורס → לקרוא ל־`setLastViewed(user.id, courseId, local.lastLessonId)`.
5. כל שגיאה ב־migration נכנסת ל־`console.error("[Profile] migrate ... failed", {...})` ולא מפילה את ה־effect.
6. רק אם הייתה לפחות פעולת migration אחת — לרענן ב־`Promise.allSettled` עוד פעם את `listProgressForUser` ו־`listLastViewedForUser` ולהחליף את `rows`/`lvList` המקומיים, כך שה־`Map` שנבנה מיד אחר כך ישקף את הנתונים החדשים.
7. **לא למחוק כלום מ־localStorage** — נשאר כ־fallback.

### Imports שיש להוסיף ל־`Profile.tsx`

```ts
import {
  listProgressForUser,
  listLastViewedForUser,
  markLessonCompleted,   // חדש
  setLastViewed,          // חדש
} from "@/lib/db/progressDb";
```

### מה לא משתנה

- אין שינוי ב־`computeUserCourseRows`, חישוב % או סטטוס.
- אין שינוי ב־UI.
- אין שינוי בעמוד הקורס או ב־`useCourseProgress` מעבר ללוג.
- אין שינוי בדוח המנהל.
- אין migration ב־DB.
- localStorage לא נמחק.

### אימות

1. כניסה כ־`demo@academy.co.il` בדפדפן שיש בו `progress:dce7b816-...:sales` ב־localStorage עם `completedLessonIds` → המיגרציה מעלה אותם ל־`lesson_progress`, ובאזור האישי הקורס sales עובר ל־"בתהליך"/"הושלם" עם האחוז הנכון.
2. כניסה בדפדפן ריק — אין נתוני localStorage → אין קריאות migration, ההתנהגות זהה למה שיש היום.
3. בדיקת console: כשל שמירה כלשהו ב־`useCourseProgress` או ב־migration מציג `console.error` ברור עם userId/courseId/lessonId.