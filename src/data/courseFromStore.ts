import { FileText, FileType2, Presentation, Link as LinkIcon } from "lucide-react";
import { adminStore, type AdminLesson } from "./adminStore";
import type { CourseDetail, Lesson, Chapter, Attachment } from "./courseDetail";

const iconForType = (type: string) => {
  if (type === "pdf") return FileText;
  if (type === "doc") return FileType2;
  if (type === "ppt") return Presentation;
  return LinkIcon;
};

const parseAttachment = (raw: string, lessonId: string, i: number): Attachment => {
  try {
    if (raw.trim().startsWith("{")) {
      const o = JSON.parse(raw) as { name?: string; url?: string; type?: string };
      const type = o.type ?? "link";
      const url = o.url ?? "#";
      const storagePath = extractStoragePath(url);
      return {
        id: `${lessonId}-att-${i}`,
        name: o.name ?? "קובץ",
        url,
        icon: iconForType(type),
        isLink: type === "link" && !storagePath,
        storagePath: storagePath ?? undefined,
        lessonId,
      };
    }
  } catch { /* fall through */ }
  return { id: `${lessonId}-att-${i}`, name: raw, url: "#", icon: FileText, lessonId };
};

const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/lesson-attachments\/(.+)$/;
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("storage:")) return url.slice("storage:".length);
  const m = url.match(PUBLIC_URL_RE);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  }
  return null;
}

const toLesson = (l: AdminLesson): Lesson => {
  const attachments: Attachment[] = (l.attachments ?? []).map((raw, i) =>
    parseAttachment(raw, l.id, i)
  );
  const quiz =
    l.quiz && Array.isArray(l.quiz.questions) && l.quiz.questions.length > 0
      ? {
          title: l.quiz.title || "חידון השיעור",
          isUnlockedAfterLessonCompletion: true,
          questions: l.quiz.questions,
        }
      : undefined;
  return {
    id: l.id,
    order: l.order,
    title: l.title,
    shortDescription: l.description,
    content:
      l.content ||
      "תוכן השיעור יתעדכן בקרוב על ידי מערכת הניהול.",
    videoUrl: l.videoUrl,
    attachments,
    quiz,
  };
};

export function buildCourseDetailFromStore(courseId: string): CourseDetail | null {
  const state = adminStore.getState();
  const course = state.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const chapters: Chapter[] = state.chapters
    .filter((c) => c.courseId === courseId)
    .sort((a, b) => a.order - b.order)
    .map((ch) => ({
      id: ch.id,
      order: ch.order,
      title: ch.title,
      lessons: state.lessons
        .filter((l) => l.chapterId === ch.id)
        .sort((a, b) => a.order - b.order)
        .map(toLesson),
    }));
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    learningMode: course.learningMode,
    hasSimulation: course.hasSimulation,
    chapters,
    assignedUserIds: state.assignments
      .filter((a) => a.courseId === courseId)
      .map((a) => a.userId),
    active: course.status === "active",
  };
}
