import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

/**
 * הצהרת נגישות — נדרשת על פי תקנות שוויון זכויות לאנשים עם מוגבלות
 * (התאמות נגישות לשירות), תשע"ג-2013, ות"י 5568 רמה AA.
 */
const AccessibilityStatement = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container max-w-3xl py-12">
        <h1 className="text-3xl font-bold mb-6">הצהרת נגישות</h1>

        <section className="space-y-4 text-foreground leading-relaxed">
          <p>
            אנו במנדי גפנר סוכנות לביטוח רואים חשיבות עליונה בהנגשת האתר לאנשים עם
            מוגבלות, ופועלים להבטיח חוויית גלישה שווה לכלל המשתמשים.
          </p>

          <h2 className="text-xl font-bold mt-8">רמת תאימות</h2>
          <p>
            האתר הונגש בהתאם לדרישות תקנות שוויון זכויות לאנשים עם מוגבלות
            (התאמות נגישות לשירות), תשע"ג-2013, ועומד בדרישות התקן הישראלי
            ת"י 5568 ברמה AA, המבוסס על הנחיות WCAG 2.1.
          </p>

          <h2 className="text-xl font-bold mt-8">תאריך הנגשת האתר</h2>
          <p>האתר הונגש בתאריך: יוני 2026. ההצהרה עודכנה לאחרונה בתאריך זה.</p>

          <h2 className="text-xl font-bold mt-8">אמצעי הנגישות באתר</h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>תפריט נגישות קבוע, נגיש דרך כפתור צף בכל עמודי האתר.</li>
            <li>הגדלה והקטנה של גודל הטקסט, גובה השורה ומרווחי האותיות והמילים.</li>
            <li>מצבי ניגודיות: ניגודיות גבוהה, מצב כהה, מצב בהיר וגווני אפור.</li>
            <li>היפוך צבעים, הדגשת קישורים והדגשת כותרות.</li>
            <li>סמן עכבר מוגדל, קו עזר לקריאה ומסכת קריאה.</li>
            <li>עצירת אנימציות והפחתת תנועה.</li>
            <li>תמיכה מלאה בניווט מקלדת עם סימון פוקוס ברור.</li>
            <li>קישור "דלג לתוכן המרכזי" כראשון בסדר הניווט.</li>
            <li>תיוג סמנטי תקין: כותרות, ציוני דרך (landmarks), תוויות לטפסים ותיאורי תמונה.</li>
            <li>תמיכה ב-RTL מלאה ובקוראי מסך נפוצים (NVDA, JAWS, VoiceOver, TalkBack).</li>
          </ul>

          <h2 className="text-xl font-bold mt-8">חלקים שאינם נגישים</h2>
          <p>
            ייתכן ובאתר קיימים תכנים, רכיבי צד שלישי או סרטוני וידאו משובצים שאינם
            נגישים באופן מלא, חרף מאמצינו להנגישם. אנו פועלים לטיוב מתמיד של הנגישות
            ונשמח לקבל פניות לגבי תכנים אלו.
          </p>

          <h2 className="text-xl font-bold mt-8">פנייה לרכז/ת הנגישות</h2>
          <p>
            לכל בקשה, שאלה או דיווח על בעיית נגישות באתר, ניתן לפנות לרכז/ת הנגישות
            של הארגון:
          </p>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p>
              <strong>שם מלא:</strong>{" "}
              <span>אלי גפנר</span>
            </p>
            <p>
              <strong>דוא"ל:</strong>{" "}
              <a href="mailto:elig@gefner.co.il" className="text-primary hover:underline">
                elig@gefner.co.il
              </a>
            </p>
            <p>
              <strong>טלפון:</strong>{" "}
              <a href="tel:+972555641384" className="text-primary hover:underline">
                055-5641384
              </a>
            </p>
            <p>
              <strong>זמן תגובה משוער:</strong>{" "}
              <span>עד 14 ימי עסקים</span>
            </p>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            אם נתקלתם בבעיית נגישות, נודה לקבלת פירוט הבעיה, כתובת העמוד בו הופיעה,
            סוג הדפדפן וטכנולוגיית הסיוע בה השתמשתם, על מנת שנוכל לטפל בכך במהירות.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AccessibilityStatement;