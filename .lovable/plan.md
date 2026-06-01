## תוכנית: החזרת מערכת חידונים לשיעורים

### 1. איפה יישמרו החידונים

הוספת עמודה אחת לטבלת `lessons`:
- `quiz jsonb null` — אם `null` אין חידון. אם קיים — אובייקט יחיד.

מבנה ה־JSON שיישמר:
```json
{
  "title": "חידון קצר",
  "questions": [
    {
      "id": "q1",
      "question": "טקסט השאלה",
      "answers": ["א", "ב", "ג"],
      "correctAnswer": "א",
      "correctFeedback": "יפה!",
      "wrongFeedback": "התשובה הנכונה היא א כי..."
    }
  ]
}
```

נימוקים: טבלה ייעודית הייתה מצריכה RLS, גרנטים, סנכרון Realtime, וקריאות נוספות. שמירה כעמודה על `lessons` משתמשת ב־RLS הקיים של `lessons` (כולל ההגנה על שיעורים נעולים) ולא דורשת שינוי בהרשאות. השדה `has_quiz` הקיים יישאר כדגל UI; מקור האמת בפועל הוא `quiz != null`.

### 2. אילו קבצים ישתנו (נקודתי בלבד)

- **מיגרציה חדשה** — `ALTER TABLE public.lessons ADD COLUMN quiz jsonb`. ללא נגיעה ב־RLS/grants.
- `src/lib/db/lessonsDb.ts` — להוסיף `quiz` ל־`Row`, ל־`DbLesson`, ול־mappers `fromRow`/`toRow`.
- `src/data/adminStore.ts` — להחליף `quiz: null` ב־`AdminLesson` בשדה `quiz: QuizData | null`; להעביר את הערך ב־hydrate/create/update.
- `src/data/courseDetail.ts` — להוסיף לטיפוס `QuizQuestion` שדות אופציונליים `correctFeedback?` ו־`wrongFeedback?`.
- `src/data/courseFromStore.ts` — אם `l.quiz` קיים, להעביר אותו ל־`Lesson.quiz` (כולל `isUnlockedAfterLessonCompletion: true`); אחרת `undefined`.
- `src/pages/admin/AdminLessons.tsx` — להוסיף עורך חידון בתוך ה־Dialog הקיים (מותנה ב־`hasQuiz`), ולשמור את ה־JSON ב־`adminStore.updateLesson/createLesson`.
- `src/components/course/Quiz.tsx` — להציג `correctFeedback`/`wrongFeedback` בבלוק הפידבק הקיים (Fallback לטקסט הנוכחי אם ריק).
- `src/components/course/LessonContent.tsx` — כבר מרנדר `{lesson.quiz && <Quiz .../>}`. ללא שינוי. הוא כבר מעביר `isCompleted` שמשמש כ־`lessonCompleted`.

ללא נגיעה ב־: progress, RLS, AuthContext, Realtime listener, קבצים נלווים, UI גלובלי, עיצוב, דוח מנהל.

### 3. איך זה ייראה במנהל

ב־`AdminLessons` Dialog, מתחת ל־checkbox "כולל חידון" הקיים — כשמסומן, יוצג פאנל עורך:
- שדה "כותרת החידון"
- רשימת שאלות. לכל שאלה:
  - טקסט השאלה
  - 3 שדות תשובה (קבוע 3)
  - בורר "תשובה נכונה" (Radio של 3 האפשרויות)
  - "פידבק לתשובה נכונה" (Textarea קצר)
  - "פידבק לתשובה שגויה" (Textarea קצר)
  - כפתור מחיקת שאלה
- כפתור "הוסף שאלה" שיוצר 3 תשובות ריקות

**ולידציה בשמירה:**
- שאלה נחשבת תקינה רק אם: יש טקסט שאלה, 3 תשובות לא ריקות, ו־`correctAnswer` שווה לאחת מהן.
- אם `hasQuiz=true` אבל אין אף שאלה תקינה — **לא נשמר חידון ריק**. הטופס לא נשלח, ומוצגת הודעת שגיאה ברורה במנהל (toast destructive + הודעת שגיאה ליד פאנל החידון): "יש להוסיף לפחות שאלה אחת תקינה (טקסט שאלה, 3 תשובות, תשובה נכונה מסומנת), או לבטל את 'כולל חידון'."
- אם `hasQuiz=false` — `quiz` נשמר כ־`null` (אפילו אם יש טיוטה בעורך).

### 4. איך זה ייראה בפרונט

הקומפוננטה `Quiz` הקיימת כבר מספקת: שאלה אחת בכל פעם, פידבק מיידי, כפתור "לשאלה הבאה", סיכום בסוף. שני שינויים בלבד:
- בבלוק הפידבק להציג את `q.correctFeedback`/`q.wrongFeedback` במקום (או בנוסף ל) הטקסט הגנרי, אם הוגדרו.
- `isUnlockedAfterLessonCompletion: true` יישלח מ־`courseFromStore`, כך שהחידון יוצג רק לאחר שהשיעור סומן כהושלם (התנהגות שכבר ממומשת בקומפוננטה).

אם אין `quiz` על השיעור — לא מוצג כלום (זה כבר ההתנהגות של `LessonContent`).

### 5. איך נמנעים מפגיעה במערכת הקיימת

- **שדה אופציונלי**: עמודת `quiz` ב־DB היא `null` כברירת מחדל; שיעורים קיימים לא משתנים.
- **בלי RLS חדש**: שמירה על `lessons` משתמשת במדיניות הקיימת, כולל ההגנה על תוכן נעול.
- **בלי Realtime חדש**: ה־subscription של `lessons` כבר הוסר מסיבות אבטחה; שינויי חידון יופיעו בפרונט בריענון נתונים רגיל של ה־store, ללא בקשה לשנות זאת.
- **בלי שינוי progress**: החידון לא משפיע על `lesson_progress`. הוא רק קורא את `isCompleted` שמועבר כבר היום ל־Quiz.
- **תאימות לאחור ב־JSON**: `correctFeedback`/`wrongFeedback` אופציונליים; אם חסרים — נופלים לטקסט הגנרי הקיים.
- **בלי שמירת חידונים ריקים**: ולידציה חוסמת שמירה במצב לא תקין, עם הודעת שגיאה ברורה במנהל.
- **בלי שינוי בקבצים נלווים, UI כללי, דוח מנהל, או Refactor רחב.**

לאחר אישור — אבצע בסדר: מיגרציה → קוד.
