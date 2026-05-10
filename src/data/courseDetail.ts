import type { LucideIcon } from "lucide-react";
import { FileText, FileSpreadsheet, FileType2 } from "lucide-react";

export type Attachment = {
  id: string;
  name: string;
  size?: string;
  url: string;
  icon: LucideIcon;
};

export type QuizOption = { id: string; text: string };
export type Quiz = {
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  requiredToComplete?: boolean;
};

export type Lesson = {
  id: string;
  order: number;
  title: string;
  shortDescription: string;
  content: string;
  videoUrl?: string; // Vimeo embed URL
  attachments?: Attachment[];
  quiz?: Quiz;
};

export type Chapter = {
  id: string;
  order: number;
  title: string;
  lessons: Lesson[];
};

export type LearningMode = "sequential" | "free";

export type CourseDetail = {
  id: string;
  title: string;
  description: string;
  learningMode: LearningMode;
  chapters: Chapter[];
  assignedUserIds: string[];
  active: boolean;
};

const sampleAttachments: Attachment[] = [
  { id: "a1", name: "מצגת השיעור.pdf", size: "1.2MB", url: "#", icon: FileText },
  { id: "a2", name: "דף עבודה.docx", size: "84KB", url: "#", icon: FileType2 },
  { id: "a3", name: "טבלת השוואה.pdf", size: "640KB", url: "#", icon: FileSpreadsheet },
];

const make = (
  chapterIdx: number,
  lessonIdx: number,
  title: string,
  opts: Partial<Lesson> = {}
): Lesson => ({
  id: `c${chapterIdx}-l${lessonIdx}`,
  order: lessonIdx,
  title,
  shortDescription: "סקירה תמציתית של נושא השיעור והתוצרים שתשיגו בסיום.",
  content:
    "בשיעור זה נסקור את עקרונות היסוד של הנושא, נכיר מושגים מרכזיים ונראה דוגמאות מעשיות מהשטח. בסוף השיעור תדעו ליישם את התכנים בעבודה היומיומית מול הלקוח, להציע פתרונות מותאמים, ולהציג את היתרונות בצורה ברורה ומקצועית.",
  videoUrl: "https://player.vimeo.com/video/76979871",
  attachments: lessonIdx % 2 === 0 ? sampleAttachments : sampleAttachments.slice(0, 2),
  quiz:
    lessonIdx % 2 === 1
      ? {
          question: "מהו רכיב הליבה בביטוח בריאות פרטי?",
          options: [
            { id: "o1", text: "כיסוי תרופות מחוץ לסל" },
            { id: "o2", text: "ביטוח רכב חובה" },
            { id: "o3", text: "ביטוח דירה מבנה" },
            { id: "o4", text: "ביטוח אובדן כושר עבודה" },
          ],
          correctOptionId: "o1",
          requiredToComplete: false,
        }
      : undefined,
  ...opts,
});

export const healthCourse: CourseDetail = {
  id: "health",
  title: "קורס ביטוחי בריאות",
  description:
    "כל מה שצריך לדעת על ביטוחי בריאות פרטיים, השוואות מסלולים, וטיפול בלקוח מההצעה ועד סיום המכירה.",
  learningMode: "sequential",
  active: true,
  assignedUserIds: ["u1"],
  chapters: [
    {
      id: "ch1",
      order: 1,
      title: "מבוא לביטוחי בריאות",
      lessons: [
        make(1, 1, "ברוכים הבאים לקורס"),
        make(1, 2, "מהו ביטוח בריאות פרטי"),
        make(1, 3, "מבנה השוק בישראל"),
        make(1, 4, "מושגי יסוד"),
      ],
    },
    {
      id: "ch2",
      order: 2,
      title: "מסלולי כיסוי",
      lessons: [
        make(2, 1, "ניתוחים פרטיים"),
        make(2, 2, "תרופות מחוץ לסל"),
        make(2, 3, "השתלות וטיפולים בחו״ל"),
        make(2, 4, "כתבי שירות"),
        make(2, 5, "השוואת חברות"),
      ],
    },
    {
      id: "ch3",
      order: 3,
      title: "תהליך מכירה",
      lessons: [
        make(3, 1, "איתור צרכים"),
        make(3, 2, "התאמת מסלול"),
        make(3, 3, "טיפול בהתנגדויות"),
        make(3, 4, "סגירת עסקה"),
        make(3, 5, "סיכום הקורס"),
      ],
    },
  ],
};

export const courseDetails: Record<string, CourseDetail> = {
  health: healthCourse,
  // Demo course alias for development/preview
  "course-1": { ...healthCourse, id: "course-1", title: "קורס דמו — ביטוחי בריאות" },
  // For other course ids from /data/courses we reuse the same mock structure with a different title.
  service: { ...healthCourse, id: "service", title: "קורס שירות לקוחות" },
  elementary: { ...healthCourse, id: "elementary", title: "קורס אלמנטרי" },
  sales: { ...healthCourse, id: "sales", title: "קורס מכירות" },
  private: { ...healthCourse, id: "private", title: "קורס מוצרי פרט" },
  finance: { ...healthCourse, id: "finance", title: "קורס פיננסים" },
  pension: { ...healthCourse, id: "pension", title: "קורס פנסיה וגמל" },
};

// Flatten helper
export const getFlatLessons = (course: CourseDetail): Lesson[] =>
  course.chapters.flatMap((c) => c.lessons);

// Mock current user
export const currentUser = {
  id: "u1",
  name: "יוסי לוי",
  isAdmin: false,
};