## אבחון בלבד — אין שינוי קוד / migration / שחזור נתונים

### 1) האם סימון "הושלם" יוצר רשומה ב־`lesson_progress`
**כן, נשמר תקין.**

- ב־`useCourseProgress.ts` הפונקציות `toggleComplete` / `markComplete` קוראות ל־`cloudMarkCompleted(userId, courseId, lessonId)`.
- `markLessonCompleted` ב־`progressDb.ts` עושה `upsert` על `lesson_progress` עם `onConflict: "user_id,lesson_id"`.
- בדקתי את אילוצי ה־DB: קיים `PRIMARY KEY` על `(user_id, lesson_id)` ב־`lesson_progress`, ולכן ה־upsert עובד נכון — בלי כפילויות ובלי שגיאה. אין כפילויות בטבלה (`group by ... having count(*)>1` החזיר ריק).
- בדיקה אמפירית: עבור `demo@academy.co.il` קיימת רשומה אחרונה מ־`2026-05-27 06:22:51` — כלומר כתיבות אכן מגיעות ל־DB.

`user_id` שנשמר הוא תמיד `userId` שמועבר ל־hook מעמוד הקורס, שמגיע מ־`AuthContext` ומבוסס על `supabase.auth` (אותו `id` שב־`profiles` ו־`auth.users`). אין mismatch.

### 2) האם הפרופיל קורא רשומות חדשות מה־DB אחרי רענון
**חלקית. קיים באג שגורם לקריאה להישבר.**

ב־`Profile.tsx` הטעינה היא:
```
Promise.all([ listProgressForUser(user.id), getLastViewed(user.id) ])
```
אם **אחת** משתי הקריאות נכשלת — כל הבלוק נופל ל־`catch` ו־`dbProgress` נשאר ריק.

**הבעיה הספציפית**: `getLastViewed` ב־`progressDb.ts` משתמש ב־`.maybeSingle()` — שמצפה לכל היותר שורה אחת. אבל ב־`last_viewed` ל־`demo@academy.co.il` יש **4 שורות** (אחת לכל קורס: `elementary`, `finance`, `service`, `sales`). זה גורם ל־`maybeSingle()` לזרוק שגיאה → `Promise.all` נכשל → הפרופיל נופל ל־localStorage בלבד → מציג 0 בדפדפן נקי.

המשמעות לעתיד: כל עוד למשתמש יש יותר מקורס אחד עם `last_viewed`, הפרופיל לא יצליח להציג progress מה־DB — גם אם הכתיבות עצמן עובדות מצוין.

### 3) האם `completedLessons` בפרופיל מחושב לפי `lesson_progress` בלבד
**לא לגמרי.** ב־`Profile.tsx` הפונקציה `getProgress(courseId)` מעדיפה DB (`dbProgress`) אם קיים, אחרת נופלת ל־`localStorage`. כל עוד באג ה־`maybeSingle` פוגע בטעינה, `dbProgress` ריק ובפועל החישוב נעשה מ־localStorage.

### 4) האם `localStorage` עדיין משפיע על התצוגה
**כן, באופן מהותי כרגע.**
- `useCourseProgress` בעמוד הקורס שומר/קורא גם ל־localStorage תחת `progress:{userId}:{courseId}`.
- ב־`Profile.tsx`, `readProgress(...)` קורא ישירות מ־localStorage כ־fallback בכל פעם ש־`dbProgress` ריק עבור הקורס.
- בדפדפן חדש / אחרי ניקוי — אין fallback, ולכן 0.

### 5) האם הכתיבה ל־DB מצליחה או שיש שגיאות silent
- **כתיבה מצליחה** (PK תואם, ואין כפילויות). אבל **כל קריאת `cloudMarkCompleted`, `cloudUnmarkCompleted`, `cloudSetLastViewed` עטופה ב־`.catch(() => {})`** — ולכן אם תהיה תקלת רשת/RLS, השגיאה תיבלע בלי לוג. כרגע אין אינדיקציה לכשל בכתיבות בפועל.
- ה־upsert על `last_viewed` עם `onConflict: "user_id,course_id"` תואם ל־PK שקיים בטבלה, ולכן גם כתיבת "שיעור אחרון שנצפה" תקינה.

## מסקנה
- **מעכשיו, התקדמות חדשה אכן תישמר תקין ב־`lesson_progress`** (וגם ב־`last_viewed`). הכתיבות עובדות, המזהים תואמים, אין כפילויות, ויש PK שמייצב את ה־upsert.
- **הבעיה היא לא בכתיבה אלא בקריאה בפרופיל**: `getLastViewed(user.id).maybeSingle()` נכשל כשיש למשתמש יותר משורת `last_viewed` אחת, וזה מפיל את כל טעינת ה־progress של הפרופיל ל־catch ריק.
- **localStorage עדיין משפיע** על תצוגת הפרופיל בפועל, כל עוד הקריאה מה־DB נשברת.

## טכני — לתיקון נקודתי עתידי (לא מבוצע עכשיו)
- ב־`Profile.tsx`: לפצל את `Promise.all` לשתי קריאות עצמאיות (try/catch נפרד), כך שכשל ב־`last_viewed` לא יבטל את `lesson_progress`.
- או: להפסיק להשתמש ב־`getLastViewed(userId)` במצב "שורה אחת" בפרופיל, ובמקום זה לטעון את כל שורות `last_viewed` של המשתמש ולמפות לפי `courseId` (כפי שכבר עושה ה־Map בפרופיל). אפשר להוסיף ל־`progressDb.ts` פונקציה `listLastViewedForUser(userId)` בלי לגעת ב־`useCourseProgress`.
- להוסיף `console.error` מינימלי במקום `.catch(() => {})` כדי שתקלות כתיבה עתידיות לא יהיו silent.