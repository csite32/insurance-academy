# אבחון — למה הנתונים מופיעים ונעלמים בלשוניות קורסים/פרקים/שיעורים

קראתי את `src/data/adminStore.ts`, `src/components/admin/AdminLayout.tsx`, `src/contexts/AuthContext.tsx`, וכל הלשוניות `Admin{Courses,Chapters,Lessons,Users,Assignments}.tsx`. כל נקודות הבדיקה שביקשת:

## 1. האם `adminStore` נטען פעמיים?
לא. `ensureHydrated()` משתמש ב־`hydrating` כ־singleton ומחזיר את אותה ההבטחה. בעיית הטעינה הכפולה הקיימת היא **אחרת**: כש־`onAuthStateChange` מאפס את `hydrating=null` תוך כדי ש־`ensureHydrated` הראשון עוד רץ, ההבטחה הראשונה ממשיכה ומסיימת ב־`startSubscriptions()`, ואחריה הסיבוב השני מוסיף עוד `startSubscriptions()`. התוצאה: ערוצי Realtime כפולים על `courses`/`chapters`/`lessons` (לא מאפסים נתונים — אבל זליגת ערוצים).

## 2. למה `hydration / realtime / auth` מאפס את הנתונים — שורש הבעיה
ב־`adminStore.ts` שורות 247–276 ה־listener:
```
supabase.auth.onAuthStateChange((_event, session) => {
  const nextId = session?.user?.id ?? null;
  if (nextId === currentAuthUserId) return;
  ...
  if (!nextId) {
    // SIGNED_OUT branch
    setState({ courses: [], chapters: [], lessons: [], users: [], assignments: [], lessonAssignments: [] });
    hydrated = false;
    return;
  }
  // SIGNED_IN branch — חוזר ל־ensureHydrated
  hydrated = false; ...
});
```
ה־listener נשען **רק** על `_event !== current uid`. ב־Supabase־JS, אחרי `subscribe` נשלח `INITIAL_SESSION` באופן אסינכרוני; אם הוא מקדים את `await supabase.auth.getSession()`, `currentAuthUserId` עוד `null` ומופעל מסלול ה־SIGNED_IN — שמאפס `hydrated=false` ומפעיל `ensureHydrated` שני.

הגרוע יותר: בלוג ה־Console שלך מופיע
```
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
```
זה גורם ל־Supabase לשגר אירוע `SIGNED_OUT` עם `session=null`. מסלול ה־SIGNED_OUT ב־listener **דורס את כל הנתונים ל־`[]`** ומחזיר את `hydrated=false`. AdminLayout (שורה 150) מציג מיד "טוען נתונים..." → אם הרענון מצליח חוזרים, אם לא נשארים ריקים. זה בדיוק תסמין "מופיע לרגע ואז נעלם".

ההבדל מ־AuthContext: ב־AuthContext (שורות 87–102) המסלול הוא רק `setUser(null)` ללא ניווט החוצה — המשתמש נשאר ב־`/admin/*` בלי להבחין שהסשן נפל; רק adminStore רואה את האירוע ומאפס.

## 3. האם הסרת `lessons` מ־Realtime יצרה listener שמחזיר רשימה ריקה?
לא. `subscribeLessons` ב־`lessonsDb.ts:166–178` מאזין ל־`postgres_changes`. אחרי שהטבלה אינה ב־publication, אף אירוע לא נשלח, אז `onChange()` לעולם לא נקרא ולא מתרחש `refreshLessons` כפוי. ההסרה לא מאפסת נתונים; היא רק שותקת עדכוני live של שיעורים בלוח הניהול (תופעת לוואי נפרדת).

## 4. האם `hydrated=true` נקבע מוקדם מדי?
לא. הוא נקבע רק אחרי `hydrateAll()` ב־שורה 240. הבעיה היא ההפך — הוא **מתאפס בחזרה ל־false** על־ידי ה־auth listener שלא מבחין בין אירועי "אותו משתמש, רק חידוש טוקן/INITIAL_SESSION" לבין מעבר אמיתי בין משתמשים.

## 5. למה `users/assignments` נראים שורדים?
- AuthContext מנהל בעצמו את `assignedCourses` / `assignedLessons` של המשתמש המחובר דרך `listAssignmentsForUser` ו־`subscribeLessonAssignments` (לא תלוי ב־adminStore). כל מסך שמשתמש ב־`useAuth().user.assignedCourses` ימשיך להראות נתון.
- בנוסף, `refreshUsers/refreshAssignments/refreshLessonAssignments` עוטפים ב־`try/catch` שמשתיק שגיאות ל־`[]`, אבל הם **גם** נדרסים יחד עם השאר במסלול ה־SIGNED_OUT — אם תיכנס מיד ללשונית "שיוך קורסים" אחרי האירוע תראה גם שם ריק. כלומר הסימפטום זהה — מקרה בדיקה בלבד הציג אותם כעובדים (כי הם רואים את ההידרציה השנייה שמצליחה לפני הניווט).

## 6. האם לשונית כלשהי מסננת לפי `courseId` ריק / מאפסת state?
לא. כל הלשוניות רק קוראות מהסטור (`useAdminStore`). אין `useEffect` שמאפס. הסינון לפי `courseId` קיים אך הוא רק `filter` על נתון; אם הנתונים ריקים, גם הסינון יחזיר ריק — אבל הסיבה למצב הריק היא דריסת הסטור, לא הסינון.

---

# תוכנית תיקון נקודתית — קובץ אחד בלבד

**רק** `src/data/adminStore.ts`. ללא שינויים ב־RLS, DB, UI, AuthContext, או ב־דוח המנהל.

### שינוי 1 — להפסיק את הדריסה ל־`[]` על אירועי טוקן/INITIAL/SIGNED_OUT שגוי
ב־`startAuthListener` (שורות 247–276):

1. לקבל גם את ה־`event` ולא רק את ה־`session`:
   ```ts
   supabase.auth.onAuthStateChange((event, session) => { ... })
   ```
2. **להתעלם מאירועי `TOKEN_REFRESHED` ו־`INITIAL_SESSION`** — לא לעדכן `currentAuthUserId` ולא לאפס שום state. רק לבצע lazy `ensureHydrated` במידה ועוד לא היה.
3. במסלול `SIGNED_OUT` בלבד (כש־`event === "SIGNED_OUT"` או כש־`event === "USER_DELETED"`) — לאפס את הסטור. **לא** לאפס על `session=null` שמגיע מתוך כשל refresh.
4. במסלול `SIGNED_IN` — לאפס `hydrated`/`unsubAll` ולקרוא ל־`ensureHydrated` **רק** אם ה־`uid` שונה מ־`currentAuthUserId` הקיים.

תוצאה: כשל refresh של טוקן (האירוע מהלוג) לא יגרור ניקוי הסטור; AdminLayout ימשיך להציג את הנתונים שכבר נטענו עד שהמשתמש יעשה logout בפועל או שהניווט יוציא אותו.

### שינוי 2 — סגירת ה־race שמייצר ערוצי Realtime כפולים
ב־`ensureHydrated()` להוסיף בדיקה לפני `startSubscriptions()`:
```ts
if (unsubAll.length > 0) {
  unsubAll.forEach((u) => u());
  unsubAll = [];
}
startSubscriptions();
```
זה מבטיח שאם שני זרימות `ensureHydrated` נכנסו במקביל, רק הסט האחרון של מנויים שורד. אין שינוי בהתנהגות במסלול הרגיל.

### שינוי 3 — `hydrating` חייב להתאפס תמיד בסוף, גם בשגיאה
לעטוף את גוף ה־IIFE ב־`ensureHydrated` ב־`try { ... } finally { hydrating = null; }`. כיום אם `hydrateAll` נכשל באמצע, `hydrating` נשאר תלוי וקריאות עתידיות מקבלות הבטחה שכבר נדחתה ולא תפעל מחדש.

### מה שלא משתנה
- אין שינוי בלוגיקה של `hydrateAll`, `refreshCourses/Chapters/Lessons/Users/Assignments/LessonAssignments`.
- אין שינוי ב־`AdminLayout` או באף לשונית ניהול.
- אין שינוי ב־`AuthContext`, אין שינוי בכניסה/יציאה.
- אין שינוי ב־`useCourseProgress`, באזור האישי או בדוח המנהל.
- אין מיגרציה, אין שינוי RLS, אין `seed`.

### אימות
1. כניסה כ־admin → מעבר בין `/admin/courses`, `/admin/chapters`, `/admin/lessons` → הנתונים נשארים יציבים גם כשמופיע בלוג `Invalid Refresh Token`.
2. רענון דף — הנתונים מופיעים פעם אחת ולא נעלמים.
3. Logout מפורש מנקה את הסטור כרגיל.
4. בדיקת Network: ערוצי `realtime` של `courses/chapters` נפתחים פעם אחת, לא כפול.
